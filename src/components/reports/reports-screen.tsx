"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, Ban, CalendarRange, RotateCcw, WalletCards } from "lucide-react";
import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { aggregateSessions } from "@/lib/domain/calculations";
import { fetchSessionReport, fetchSessionSummaries } from "@/lib/domain/queries";
import type {
  SaleRecord,
  SessionReport,
  VoidResolutionMode,
} from "@/lib/domain/types";
import {
  formatCurrency,
  formatDateTime,
  formatHour,
  formatShortDate,
} from "@/lib/utils/format";

function defaultDateRange() {
  const today = new Date();
  const from = format(subDays(today, 13), "yyyy-MM-dd");
  const to = format(today, "yyyy-MM-dd");
  return { from, to };
}

export function ReportsScreen() {
  const {
    supabase,
    isOnline,
    dataVersion,
    openSession,
    voidSaleAction,
  } = useAppData();
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [summaries, setSummaries] = useState<SessionReport["summary"][]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SessionReport | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState<SaleRecord | null>(null);
  const [voidMode, setVoidMode] = useState<VoidResolutionMode>("original_session");
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    async function loadSummaries() {
      if (!supabase || !isOnline) {
        setSummaries([]);
        setSelectedSessionId(null);
        return;
      }

      setLoadingSummaries(true);

      try {
        const nextSummaries = await fetchSessionSummaries(supabase, { from, to });
        setSummaries(nextSummaries);
        setSelectedSessionId((current) => {
          if (!nextSummaries.length) {
            return null;
          }

          if (current && nextSummaries.some((summary) => summary.id === current)) {
            return current;
          }

          return nextSummaries[0].id;
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las sesiones.",
        );
      } finally {
        setLoadingSummaries(false);
      }
    }

    void loadSummaries();
  }, [supabase, isOnline, from, to, dataVersion]);

  useEffect(() => {
    async function loadReport() {
      if (!supabase || !isOnline || !selectedSessionId) {
        setSelectedReport(null);
        return;
      }

      setLoadingReport(true);

      try {
        setSelectedReport(await fetchSessionReport(supabase, selectedSessionId));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle de la sesión.",
        );
      } finally {
        setLoadingReport(false);
      }
    }

    void loadReport();
  }, [supabase, isOnline, selectedSessionId, dataVersion]);

  useEffect(() => {
    if (!saleToVoid) {
      return;
    }

    const canImpactCurrent =
      Boolean(openSession) && selectedReport?.summary.id !== openSession?.id;

    setVoidMode(canImpactCurrent ? "current_session" : "original_session");
  }, [saleToVoid, openSession, selectedReport]);

  const aggregate = aggregateSessions(summaries);

  const confirmVoid = async () => {
    if (!saleToVoid) {
      return;
    }

    setVoiding(true);

    try {
      await voidSaleAction({
        saleId: saleToVoid.id,
        resolutionMode: voidMode,
        targetSessionId: voidMode === "current_session" ? openSession?.id : null,
      });
      setSaleToVoid(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo anular la venta.",
      );
    } finally {
      setVoiding(false);
    }
  };

  const canImpactCurrent =
    Boolean(openSession) && selectedReport?.summary.id !== openSession?.id;

  return (
    <section className="page-section">
      <div className="page-title-row">
        <div className="detail-stack">
          <span className="eyebrow">Reportes</span>
          <h1 className="section-title">
            Revisa sesiones, KPIs y anulaciones con trazabilidad simple.
          </h1>
          <p className="panel-subtitle">
            Filtra por rango, entra a una sesión y anula ventas corrigiendo la
            jornada original o impactando la actual.
          </p>
        </div>
      </div>

      {!isOnline ? (
        <div className="notice notice--warning">
          Los reportes necesitan internet para consultar el historial completo.
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Filtros</h2>
            <p className="panel-subtitle">
              Rango por fecha de apertura de sesión.
            </p>
          </div>
          <CalendarRange size={20} />
        </div>

        <div className="summary-grid">
          <div className="field">
            <label htmlFor="reportFrom">Desde</label>
            <input
              id="reportFrom"
              className="input"
              type="date"
              value={from}
              onChange={(event) =>
                setRange((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="reportTo">Hasta</label>
            <input
              id="reportTo"
              className="input"
              type="date"
              value={to}
              onChange={(event) =>
                setRange((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Ventas netas"
          value={formatCurrency(aggregate.sales)}
          hint={`${summaries.length} sesiones en el rango`}
          icon={<WalletCards size={16} />}
        />
        <StatCard
          label="Efectivo"
          value={formatCurrency(aggregate.cash)}
          hint={`Esperado total ${formatCurrency(aggregate.expectedCash)}`}
          icon={<WalletCards size={16} />}
        />
        <StatCard
          label="Yape"
          value={formatCurrency(aggregate.yape)}
          hint="Canal digital neto"
          icon={<WalletCards size={16} />}
        />
        <StatCard
          label="Ajustes por anulación"
          value={formatCurrency(aggregate.voidAdjustments)}
          hint={`Egresos ${formatCurrency(aggregate.expenses)}`}
          icon={<RotateCcw size={16} />}
        />
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Sesiones</h2>
              <p className="panel-subtitle">
                Selecciona una para ver el detalle contable.
              </p>
            </div>
          </div>

          {loadingSummaries ? (
            <p className="muted-text">Cargando sesiones...</p>
          ) : summaries.length === 0 ? (
            <EmptyState
              title="No hay sesiones en este rango"
              description="Prueba un rango más amplio o abre una caja nueva para empezar a registrar actividad."
            />
          ) : (
            <div className="session-list">
              {summaries.map((summary) => (
                <button
                  key={summary.id}
                  className="session-item"
                  type="button"
                  onClick={() => setSelectedSessionId(summary.id)}
                >
                  <div className="panel-header">
                    <div className="detail-stack">
                      <h3>Sesión {formatShortDate(summary.openedAt)}</h3>
                      <span className="muted-text">
                        {formatDateTime(summary.openedAt)}
                      </span>
                    </div>
                    <span
                      className={`chip ${summary.status === "open" ? "" : "chip--danger"}`}
                    >
                      {summary.status === "open" ? "Abierta" : "Cerrada"}
                    </span>
                  </div>

                  <div className="summary-grid">
                    <div>
                      <div className="metric-label">Ventas</div>
                      <strong>{formatCurrency(summary.effectiveSalesTotal)}</strong>
                    </div>
                    <div>
                      <div className="metric-label">Esperado</div>
                      <strong>{formatCurrency(summary.expectedCash)}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Detalle de sesión</h2>
              <p className="panel-subtitle">
                Ventas, egresos y anulaciones registradas.
              </p>
            </div>
          </div>

          {loadingReport ? (
            <p className="muted-text">Cargando detalle...</p>
          ) : !selectedReport ? (
            <EmptyState
              title="Selecciona una sesión"
              description="El detalle de ventas y egresos aparecerá aquí."
            />
          ) : (
            <div className="detail-stack">
              <div className="summary-grid">
                <StatCard
                  label="Ventas netas"
                  value={formatCurrency(selectedReport.summary.effectiveSalesTotal)}
                />
                <StatCard
                  label="Efectivo esperado"
                  value={formatCurrency(selectedReport.summary.expectedCash)}
                />
                <StatCard
                  label="Yape"
                  value={formatCurrency(selectedReport.summary.effectiveYapeSales)}
                />
                <StatCard
                  label="Egresos"
                  value={formatCurrency(selectedReport.summary.expensesTotal)}
                />
              </div>

              <div className="divider" />

              <div className="detail-stack">
                <h3>Ventas</h3>
                {selectedReport.sales.length === 0 ? (
                  <EmptyState
                    title="Sin ventas en esta sesión"
                    description="Aquí aparecerá el detalle de cada pedido registrado."
                  />
                ) : (
                  <div className="activity-list">
                    {selectedReport.sales.map((sale) => (
                      <article className="sales-item" key={sale.id}>
                        <div className="panel-header">
                          <div className="detail-stack">
                            <strong>{formatCurrency(sale.totalAmount)}</strong>
                            <span className="muted-text">
                              {sale.paymentMethod === "cash" ? "Efectivo" : "Yape"} ·{" "}
                              {formatHour(sale.createdAt)}
                            </span>
                          </div>
                          <div className="chip-row">
                            {sale.voidInfo ? (
                              <span className="chip chip--danger">
                                Anulada ·{" "}
                                {sale.voidInfo.resolutionMode === "current_session"
                                  ? "impacta hoy"
                                  : "corrige origen"}
                              </span>
                            ) : (
                              <span className="chip">Activa</span>
                            )}
                          </div>
                        </div>

                        <p className="muted-text">
                          {sale.items.map((item) => `${item.quantity}x ${item.productName}`).join(" · ")}
                        </p>

                        {sale.items.some((item) => item.note) ? (
                          <div className="chip-row">
                            {sale.items
                              .filter((item) => item.note)
                              .map((item) => (
                                <span className="chip" key={item.id}>
                                  {item.productName}: {item.note}
                                </span>
                              ))}
                          </div>
                        ) : null}

                        {!sale.voidInfo ? (
                          <Button
                            variant="danger"
                            onClick={() => setSaleToVoid(sale)}
                          >
                            <Ban size={16} />
                            Anular venta
                          </Button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="divider" />

              <div className="detail-stack">
                <h3>Egresos</h3>
                {selectedReport.expenses.length === 0 ? (
                  <EmptyState
                    title="Sin egresos en esta sesión"
                    description="Los egresos registrados aparecerán aquí con hora y motivo."
                  />
                ) : (
                  <div className="activity-list">
                    {selectedReport.expenses.map((expense) => (
                      <article className="activity-item" key={expense.id}>
                        <div className="panel-header">
                          <strong>{formatCurrency(expense.amount)}</strong>
                          <span className="chip chip--danger">
                            {formatHour(expense.createdAt)}
                          </span>
                        </div>
                        <p className="muted-text">{expense.reason}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(saleToVoid)}
        title="Anular venta"
        description="Decide si la anulación corrige la jornada original o si se refleja como ajuste en la sesión abierta."
        onClose={() => setSaleToVoid(null)}
      >
        {saleToVoid ? (
          <div className="form-stack">
            <div className="notice notice--warning">
              <strong>Venta seleccionada: {formatCurrency(saleToVoid.totalAmount)}</strong>
              <p>
                Registrada a las {formatHour(saleToVoid.createdAt)} por{" "}
                {saleToVoid.paymentMethod === "cash" ? "efectivo" : "Yape"}.
              </p>
            </div>

            {!canImpactCurrent ? (
              <div className="notice notice--warning">
                <AlertTriangle size={18} />
                <p>
                  No hay una sesión abierta distinta para impactar hoy, así que
                  esta anulación corregirá la jornada original.
                </p>
              </div>
            ) : null}

            <div className="toggle-row">
              <button
                type="button"
                className="toggle-button"
                data-active={voidMode === "original_session"}
                onClick={() => setVoidMode("original_session")}
              >
                Corregir jornada original
              </button>
              {canImpactCurrent ? (
                <button
                  type="button"
                  className="toggle-button"
                  data-active={voidMode === "current_session"}
                  onClick={() => setVoidMode("current_session")}
                >
                  Impactar sesión actual
                </button>
              ) : null}
            </div>

            <div className="inline-actions">
              <Button
                stretch
                variant="danger"
                disabled={voiding}
                onClick={() => void confirmVoid()}
              >
                {voiding ? "Anulando..." : "Confirmar anulación"}
              </Button>
              <Button variant="ghost" onClick={() => setSaleToVoid(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

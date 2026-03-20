"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
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
} from "@/lib/utils/format";

type RangePreset = "today" | "week" | "month" | "custom";

type ReportActivityItem =
  | {
      id: string;
      kind: "sale";
      createdAt: string;
      amount: number;
      sale: SaleRecord;
    }
  | {
      id: string;
      kind: "expense";
      createdAt: string;
      amount: number;
      reason: string;
    };

function defaultDateRange() {
  const today = new Date();
  const from = format(subDays(today, 6), "yyyy-MM-dd");
  const to = format(today, "yyyy-MM-dd");
  return { from, to };
}

function getRangeForPreset(preset: Exclude<RangePreset, "custom">) {
  const today = new Date();

  switch (preset) {
    case "today": {
      const date = format(today, "yyyy-MM-dd");
      return { from: date, to: date };
    }
    case "week":
      return {
        from: format(subDays(today, 6), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
      };
    case "month":
      return {
        from: format(subDays(today, 29), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
      };
  }
}

function getActivePreset(from: string, to: string): RangePreset {
  const today = getRangeForPreset("today");
  const week = getRangeForPreset("week");
  const month = getRangeForPreset("month");

  if (from === today.from && to === today.to) {
    return "today";
  }

  if (from === week.from && to === week.to) {
    return "week";
  }

  if (from === month.from && to === month.to) {
    return "month";
  }

  return "custom";
}

function formatSessionLabel(value: string) {
  const date = new Date(value);
  const dayKey = format(date, "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const yesterdayKey = format(subDays(new Date(), 1), "yyyy-MM-dd");

  if (dayKey === todayKey) {
    return "Hoy";
  }

  if (dayKey === yesterdayKey) {
    return "Ayer";
  }

  const label = format(date, "EEE d MMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSessionWindow(openedAt: string, closedAt: string | null) {
  if (!closedAt) {
    return `Abierta desde ${formatHour(openedAt)}`;
  }

  return `${formatHour(openedAt)} - ${formatHour(closedAt)}`;
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
  const selectedSummary = selectedReport?.summary ?? null;
  const activePreset = getActivePreset(from, to);

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

  const selectedVoidCount = selectedReport
    ? selectedReport.sales.filter((sale) => sale.voidInfo).length
    : 0;
  const selectedCashDifference =
    selectedSummary?.countedCash === null || !selectedSummary
      ? null
      : selectedSummary.countedCash - selectedSummary.expectedCash;

  const selectedActivity = useMemo<ReportActivityItem[]>(() => {
    if (!selectedReport) {
      return [];
    }

    const saleItems: ReportActivityItem[] = selectedReport.sales.map((sale) => ({
      id: `sale-${sale.id}`,
      kind: "sale",
      createdAt: sale.createdAt,
      amount: sale.totalAmount,
      sale,
    }));

    const expenseItems: ReportActivityItem[] = selectedReport.expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      kind: "expense",
      createdAt: expense.createdAt,
      amount: expense.amount,
      reason: expense.reason,
    }));

    return [...saleItems, ...expenseItems].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [selectedReport]);

  return (
    <section className="page-section reports-page">
      <section className="panel reports-toolbar">
        <div className="reports-toolbar__head">
          <div className="detail-stack">
            <h1 className="cash-title">Reportes</h1>
            <span className="muted-text">
              {summaries.length} sesi{summaries.length === 1 ? "ón" : "ones"}
            </span>
          </div>

          <div className="chip-row">
            <span className="badge">Historial</span>
            {!isOnline ? (
              <span className="status-pill status-pill--offline">Sin conexión</span>
            ) : null}
          </div>
        </div>

        <div className="reports-presets" role="tablist" aria-label="Rango rápido">
          <button
            type="button"
            className="reports-preset"
            data-active={activePreset === "today"}
            onClick={() => setRange(getRangeForPreset("today"))}
          >
            Hoy
          </button>
          <button
            type="button"
            className="reports-preset"
            data-active={activePreset === "week"}
            onClick={() => setRange(getRangeForPreset("week"))}
          >
            7 días
          </button>
          <button
            type="button"
            className="reports-preset"
            data-active={activePreset === "month"}
            onClick={() => setRange(getRangeForPreset("month"))}
          >
            30 días
          </button>
        </div>

        <div className="summary-grid reports-range">
          <div className="field reports-date-field">
            <label htmlFor="reportFrom">Desde</label>
            <input
              id="reportFrom"
              className="input reports-date-input"
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
          <div className="reports-range-icon" aria-hidden="true">
            <CalendarRange size={18} />
          </div>
          <div className="field reports-date-field">
            <label htmlFor="reportTo">Hasta</label>
            <input
              id="reportTo"
              className="input reports-date-input"
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
          label="Ventas"
          value={formatCurrency(aggregate.sales)}
          hint={`${summaries.length} jornadas`}
          icon={<WalletCards size={16} />}
        />
        <StatCard
          label="Efectivo"
          value={formatCurrency(aggregate.cash)}
          hint={`Esperado ${formatCurrency(aggregate.expectedCash)}`}
          icon={<WalletCards size={16} />}
        />
        <StatCard
          label="Yape"
          value={formatCurrency(aggregate.yape)}
          hint="Canal digital neto"
          icon={<WalletCards size={16} />}
        />
        <StatCard
          label="Egresos"
          value={formatCurrency(aggregate.expenses)}
          hint={`Ajustes ${formatCurrency(aggregate.voidAdjustments)}`}
          icon={<RotateCcw size={16} />}
        />
      </section>

      <div className="two-column reports-layout">
        <section className="panel reports-panel reports-panel--sessions">
          <div className="reports-panel-head">
            <h2>Sesiones</h2>
            <span className="badge">{summaries.length}</span>
          </div>

          {loadingSummaries ? (
            <p className="muted-text">Cargando sesiones...</p>
          ) : summaries.length === 0 ? (
            <EmptyState
              title="Sin sesiones"
              description="Cambia el rango."
            />
          ) : (
            <div className="session-list reports-session-list">
              {summaries.map((summary) => (
                <button
                  key={summary.id}
                  className="session-item report-session-item"
                  type="button"
                  onClick={() => setSelectedSessionId(summary.id)}
                  data-active={summary.id === selectedSessionId}
                >
                  <div className="report-session-item__head">
                    <div className="detail-stack">
                      <h3>{formatSessionLabel(summary.openedAt)}</h3>
                      <span className="muted-text">
                        {formatSessionWindow(summary.openedAt, summary.closedAt)}
                      </span>
                    </div>
                    <span
                      className={`chip ${summary.status === "open" ? "" : "chip--danger"}`}
                    >
                      {summary.status === "open" ? "Abierta" : "Cerrada"}
                    </span>
                  </div>

                  <div className="summary-grid report-session-item__stats">
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

        <section className="panel reports-panel reports-panel--detail">
          <div className="reports-panel-head">
            <div className="detail-stack">
              <h2>
                {selectedReport
                  ? formatSessionLabel(selectedReport.summary.openedAt)
                  : "Detalle"}
              </h2>
              {selectedReport ? (
                <span className="muted-text">
                  {formatDateTime(selectedReport.summary.openedAt)} ·{" "}
                  {formatSessionWindow(
                    selectedReport.summary.openedAt,
                    selectedReport.summary.closedAt,
                  )}
                </span>
              ) : null}
            </div>
            {selectedReport ? (
              <span
                className={`chip ${selectedReport.summary.status === "open" ? "" : "chip--danger"}`}
              >
                {selectedReport.summary.status === "open" ? "Abierta" : "Cerrada"}
              </span>
            ) : null}
          </div>

          {loadingReport ? (
            <p className="muted-text">Cargando detalle...</p>
          ) : !selectedReport ? (
            <EmptyState
              title="Sin detalle"
              description="Elige una sesión."
            />
          ) : (
            <div className="detail-stack reports-detail-stack">
              <div className="chip-row">
                <span className="badge">{selectedReport.sales.length} ventas</span>
                <span className="badge">{selectedReport.expenses.length} egresos</span>
                <span className="badge">{selectedVoidCount} anuladas</span>
              </div>

              <div className="reports-mini-grid">
                <article className="reports-mini-stat">
                  <span className="metric-label">Ventas</span>
                  <strong className="metric-value">
                    {formatCurrency(selectedReport.summary.effectiveSalesTotal)}
                  </strong>
                </article>
                <article className="reports-mini-stat">
                  <span className="metric-label">Efectivo</span>
                  <strong className="metric-value">
                    {formatCurrency(selectedReport.summary.effectiveCashSales)}
                  </strong>
                </article>
                <article className="reports-mini-stat">
                  <span className="metric-label">Yape</span>
                  <strong className="metric-value">
                    {formatCurrency(selectedReport.summary.effectiveYapeSales)}
                  </strong>
                </article>
                <article className="reports-mini-stat">
                  <span className="metric-label">Egresos</span>
                  <strong className="metric-value">
                    {formatCurrency(selectedReport.summary.expensesTotal)}
                  </strong>
                </article>
                <article className="reports-mini-stat">
                  <span className="metric-label">Esperado</span>
                  <strong className="metric-value">
                    {formatCurrency(selectedReport.summary.expectedCash)}
                  </strong>
                </article>
                <article className="reports-mini-stat">
                  <span className="metric-label">
                    {selectedSummary?.countedCash === null ? "Estado" : "Diferencia"}
                  </span>
                  <strong className="metric-value">
                    {selectedCashDifference === null
                      ? selectedSummary?.status === "open"
                        ? "Abierta"
                        : "Pendiente"
                      : formatCurrency(selectedCashDifference)}
                  </strong>
                </article>
              </div>

              <div className="divider" />

              <div className="reports-block">
                <div className="reports-block-head">
                  <h3>Movimientos</h3>
                  <span className="badge">{selectedActivity.length}</span>
                </div>
                <div className="chip-row">
                  <span className="chip">
                    Apertura {formatCurrency(selectedReport.summary.openingAmount)}
                  </span>
                  <span
                    className={`chip ${selectedReport.summary.currentSessionVoidTotal > 0 ? "chip--danger" : ""}`}
                  >
                    Ajustes {formatCurrency(selectedReport.summary.currentSessionVoidTotal)}
                  </span>
                </div>

                {selectedActivity.length === 0 ? (
                  <EmptyState
                    title="Sin movimientos"
                    description="No hay movimientos."
                  />
                ) : (
                  <div className="activity-list reports-activity-list">
                    {selectedActivity.map((item) =>
                      item.kind === "sale" ? (
                        <article className="sales-item report-sale-item" key={item.id}>
                          <div className="report-sale-item__head">
                            <div className="detail-stack">
                              <strong>{formatCurrency(item.sale.totalAmount)}</strong>
                              <span className="muted-text">
                                {item.sale.paymentMethod === "cash" ? "Efectivo" : "Yape"} ·{" "}
                                {formatHour(item.sale.createdAt)}
                              </span>
                            </div>
                            <div className="chip-row">
                              <span className="chip">Venta</span>
                              {item.sale.voidInfo ? (
                                <span className="chip chip--danger">
                                  Anulada ·{" "}
                                  {item.sale.voidInfo.resolutionMode === "current_session"
                                    ? "impacta hoy"
                                    : "corrige origen"}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <p className="muted-text report-sale-item__items">
                            {item.sale.items
                              .map((saleItem) => `${saleItem.quantity}x ${saleItem.productName}`)
                              .join(" · ")}
                          </p>

                          {item.sale.items.some((saleItem) => saleItem.note) ? (
                            <div className="chip-row">
                              {item.sale.items
                                .filter((saleItem) => saleItem.note)
                                .map((saleItem) => (
                                  <span className="chip" key={saleItem.id}>
                                    {saleItem.productName}: {saleItem.note}
                                  </span>
                                ))}
                            </div>
                          ) : null}

                          {!item.sale.voidInfo ? (
                            <Button
                              variant="danger"
                              className="button--compact reports-void-button"
                              onClick={() => setSaleToVoid(item.sale)}
                            >
                              <Ban size={16} />
                              Anular
                            </Button>
                          ) : null}
                        </article>
                      ) : (
                        <article className="activity-item report-expense-item" key={item.id}>
                          <div className="report-sale-item__head">
                            <div className="detail-stack">
                              <strong>{formatCurrency(item.amount)}</strong>
                              <span className="muted-text">
                                Egreso · {formatHour(item.createdAt)}
                              </span>
                            </div>
                            <div className="chip-row">
                              <span className="chip chip--danger">Egreso</span>
                            </div>
                          </div>
                          <p className="muted-text">{item.reason}</p>
                        </article>
                      ),
                    )}
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
        description="Define dónde impacta el ajuste."
        onClose={() => setSaleToVoid(null)}
      >
        {saleToVoid ? (
          <div className="form-stack">
            <div className="notice notice--warning">
              <strong>Venta seleccionada: {formatCurrency(saleToVoid.totalAmount)}</strong>
              <p>{formatHour(saleToVoid.createdAt)} · {saleToVoid.paymentMethod === "cash" ? "Efectivo" : "Yape"}</p>
            </div>

            {!canImpactCurrent ? (
              <div className="notice notice--warning">
                <AlertTriangle size={18} />
                <p>
                  No hay otra caja abierta. Se corregirá el origen.
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

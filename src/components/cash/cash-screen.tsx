"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BanknoteArrowDown, CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { useAppData } from "@/components/providers/app-data-provider";
import { fetchRecentExpenses, fetchRecentSales } from "@/lib/domain/queries";
import type { CashExpenseRecord, SaleRecord } from "@/lib/domain/types";
import { formatCurrency, formatDateTime, formatHour } from "@/lib/utils/format";

export function CashScreen() {
  const {
    openSession,
    openSessionAction,
    closeSessionAction,
    createExpenseAction,
    dataVersion,
    supabase,
    isOnline,
    pendingCount,
  } = useAppData();
  const [openingAmount, setOpeningAmount] = useState("0");
  const [countedCash, setCountedCash] = useState("0");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReason, setExpenseReason] = useState("");
  const [busyAction, setBusyAction] = useState<"open" | "close" | "expense" | null>(
    null,
  );
  const [recentExpenses, setRecentExpenses] = useState<CashExpenseRecord[]>([]);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);

  useEffect(() => {
    if (openSession) {
      setCountedCash(String(openSession.expectedCash));
    }
  }, [openSession]);

  useEffect(() => {
    async function loadActivity() {
      if (!supabase || !openSession || !isOnline) {
        setRecentExpenses([]);
        setRecentSales([]);
        return;
      }

      try {
        const [expenses, sales] = await Promise.all([
          fetchRecentExpenses(supabase, openSession.id, 6),
          fetchRecentSales(supabase, openSession.id, 6),
        ]);
        setRecentExpenses(expenses);
        setRecentSales(sales);
      } catch {
        setRecentExpenses([]);
        setRecentSales([]);
      }
    }

    void loadActivity();
  }, [supabase, openSession, isOnline, dataVersion]);

  const handleOpenSession = async () => {
    setBusyAction("open");

    try {
      await openSessionAction(Number(openingAmount));
      setOpeningAmount("0");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo abrir la caja.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleExpense = async () => {
    setBusyAction("expense");

    try {
      await createExpenseAction({
        amount: Number(expenseAmount),
        reason: expenseReason,
      });
      setExpenseAmount("");
      setExpenseReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo registrar el egreso.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleCloseSession = async () => {
    setBusyAction("close");

    try {
      await closeSessionAction(Number(countedCash));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cerrar la caja.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const cashDifference = openSession
    ? Number(countedCash || 0) - openSession.expectedCash
    : 0;

  return (
    <section className="page-section">
      <div className="page-title-row">
        <div className="detail-stack">
          <span className="eyebrow">Caja diaria</span>
          <h1 className="section-title">
            Controla apertura, egresos y cierre desde una sola sesión.
          </h1>
          <p className="panel-subtitle">
            Una sola caja abierta a la vez. Efectivo y Yape separados en el
            resumen operativo.
          </p>
        </div>
      </div>

      {!isOnline ? (
        <div className="notice notice--warning">
          <strong>Estás sin conexión.</strong>
          <p>
            La apertura y el cierre requieren internet. Los egresos nuevos se
            pueden guardar offline si la sesión ya estaba abierta y cacheada.
          </p>
        </div>
      ) : null}

      {!openSession ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Abrir caja</h2>
              <p className="panel-subtitle">
                Define el monto inicial para empezar la jornada actual.
              </p>
            </div>
            <CircleDollarSign size={20} />
          </div>

          <div className="field">
            <label htmlFor="openingAmount">Monto de apertura</label>
            <input
              id="openingAmount"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </div>

          <Button
            stretch
            disabled={!isOnline || busyAction === "open"}
            onClick={() => void handleOpenSession()}
          >
            {busyAction === "open" ? "Abriendo caja..." : "Abrir caja"}
          </Button>
        </section>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              label="Apertura"
              value={formatCurrency(openSession.openingAmount)}
              hint={formatDateTime(openSession.openedAt)}
              icon={<Wallet size={16} />}
            />
            <StatCard
              label="Efectivo"
              value={formatCurrency(openSession.effectiveCashSales)}
              hint={`Esperado ${formatCurrency(openSession.expectedCash)}`}
              icon={<CircleDollarSign size={16} />}
            />
            <StatCard
              label="Yape"
              value={formatCurrency(openSession.effectiveYapeSales)}
              hint="Venta digital neta"
              icon={<ReceiptText size={16} />}
            />
            <StatCard
              label="Egresos"
              value={formatCurrency(openSession.expensesTotal)}
              hint={`${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} offline`}
              icon={<BanknoteArrowDown size={16} />}
            />
          </section>

          <div className="two-column">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Registrar egreso</h2>
                  <p className="panel-subtitle">
                    Sale únicamente del efectivo de la sesión abierta.
                  </p>
                </div>
                <BanknoteArrowDown size={20} />
              </div>

              <div className="field">
                <label htmlFor="expenseAmount">Monto</label>
                <input
                  id="expenseAmount"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="field">
                <label htmlFor="expenseReason">Motivo</label>
                <input
                  id="expenseReason"
                  className="input"
                  value={expenseReason}
                  onChange={(event) => setExpenseReason(event.target.value)}
                  placeholder="Compras menores, movilidad, insumos..."
                />
              </div>

              <Button
                stretch
                disabled={busyAction === "expense"}
                onClick={() => void handleExpense()}
              >
                {busyAction === "expense"
                  ? "Registrando egreso..."
                  : "Guardar egreso"}
              </Button>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Cerrar caja</h2>
                  <p className="panel-subtitle">
                    Compara el conteo real con el efectivo esperado.
                  </p>
                </div>
                <CircleDollarSign size={20} />
              </div>

              <div className="field">
                <label htmlFor="countedCash">Efectivo contado</label>
                <input
                  id="countedCash"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={countedCash}
                  onChange={(event) => setCountedCash(event.target.value)}
                />
              </div>

              <div className="summary-grid">
                <StatCard
                  label="Esperado"
                  value={formatCurrency(openSession.expectedCash)}
                />
                <StatCard
                  label="Diferencia"
                  value={formatCurrency(cashDifference)}
                  hint={
                    cashDifference === 0
                      ? "Sin diferencia"
                      : cashDifference > 0
                        ? "Sobra efectivo"
                        : "Falta efectivo"
                  }
                />
              </div>

              <Button
                stretch
                disabled={!isOnline || busyAction === "close"}
                onClick={() => void handleCloseSession()}
              >
                {busyAction === "close" ? "Cerrando caja..." : "Cerrar caja"}
              </Button>
            </section>
          </div>

          <div className="two-column">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Egresos recientes</h2>
                  <p className="panel-subtitle">Últimas salidas de efectivo.</p>
                </div>
              </div>

              {recentExpenses.length === 0 ? (
                <EmptyState
                  title="Sin egresos registrados"
                  description="Los egresos de esta sesión aparecerán aquí."
                />
              ) : (
                <div className="activity-list">
                  {recentExpenses.map((expense) => (
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
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Ventas recientes</h2>
                  <p className="panel-subtitle">Actividad de la sesión abierta.</p>
                </div>
              </div>

              {recentSales.length === 0 ? (
                <EmptyState
                  title="Sin ventas todavía"
                  description="Cuando registres ventas aparecerán en este resumen."
                />
              ) : (
                <div className="activity-list">
                  {recentSales.map((sale) => (
                    <article className="activity-item" key={sale.id}>
                      <div className="panel-header">
                        <strong>{formatCurrency(sale.totalAmount)}</strong>
                        <span className="chip">
                          {sale.paymentMethod === "cash" ? "Efectivo" : "Yape"}
                        </span>
                      </div>
                      <p className="muted-text">
                        {sale.items.map((item) => `${item.quantity}x ${item.productName}`).join(" · ")}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

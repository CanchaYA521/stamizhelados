"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BanknoteArrowDown, CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { useAppData } from "@/components/providers/app-data-provider";
import { fetchRecentExpenses, fetchRecentSales } from "@/lib/domain/queries";
import type { CashExpenseRecord, SaleRecord } from "@/lib/domain/types";
import { formatCurrency, formatDateTime, formatHour } from "@/lib/utils/format";

type CashActivityItem = {
  id: string;
  kind: "sale" | "expense";
  amount: number;
  label: string;
  meta: string;
  createdAt: string;
};

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

  const activityItems = useMemo<CashActivityItem[]>(() => {
    const expenseItems: CashActivityItem[] = recentExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      kind: "expense",
      amount: expense.amount,
      label: expense.reason,
      meta: "Egreso",
      createdAt: expense.createdAt,
    }));

    const saleItems: CashActivityItem[] = recentSales.map((sale) => ({
      id: `sale-${sale.id}`,
      kind: "sale",
      amount: sale.totalAmount,
      label: sale.items.map((item) => `${item.quantity}x ${item.productName}`).join(" · "),
      meta: sale.paymentMethod === "cash" ? "Venta efectivo" : "Venta yape",
      createdAt: sale.createdAt,
    }));

    return [...saleItems, ...expenseItems]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 8);
  }, [recentExpenses, recentSales]);

  return (
    <section className="page-section cash-page">
      {!openSession ? (
        <section className="panel cash-panel cash-panel--closed">
          <div className="cash-head">
            <div className="detail-stack">
              <h1 className="cash-title">Caja</h1>
              <span className="muted-text">Cerrada</span>
            </div>
            <span className="badge">Sin abrir</span>
          </div>

          {!isOnline ? (
            <div className="notice notice--warning cash-notice">
              Sin conexión
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="openingAmount">Monto inicial</label>
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
            {busyAction === "open" ? "Abriendo..." : "Abrir caja"}
          </Button>
        </section>
      ) : (
        <>
          <section className="panel cash-panel cash-panel--session">
            <div className="cash-head">
              <div className="detail-stack">
                <h1 className="cash-title">Caja</h1>
                <span className="muted-text">
                  Abierta {formatDateTime(openSession.openedAt)}
                </span>
              </div>
              <span className="status-pill status-pill--online">Activa</span>
            </div>

            {!isOnline ? (
              <div className="notice notice--warning cash-notice">
                Sin conexión
              </div>
            ) : null}

            <div className="stats-grid cash-stats-grid">
              <StatCard
                label="Apertura"
                value={formatCurrency(openSession.openingAmount)}
                hint={formatHour(openSession.openedAt)}
                icon={<Wallet size={16} />}
              />
              <StatCard
                label="Efectivo"
                value={formatCurrency(openSession.expectedCash)}
                hint={formatCurrency(openSession.effectiveCashSales)}
                icon={<CircleDollarSign size={16} />}
              />
              <StatCard
                label="Yape"
                value={formatCurrency(openSession.effectiveYapeSales)}
                hint="Digital"
                icon={<ReceiptText size={16} />}
              />
              <StatCard
                label="Egresos"
                value={formatCurrency(openSession.expensesTotal)}
                hint={`${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`}
                icon={<BanknoteArrowDown size={16} />}
              />
            </div>
          </section>

          <div className="two-column cash-workspace">
            <section className="panel cash-panel cash-action-panel">
              <div className="cash-panel-header">
                <h2>Egreso</h2>
                <BanknoteArrowDown size={18} />
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
                  placeholder="Motivo"
                />
              </div>

              <Button
                stretch
                disabled={busyAction === "expense"}
                onClick={() => void handleExpense()}
              >
                {busyAction === "expense" ? "Guardando..." : "Guardar egreso"}
              </Button>
            </section>

            <section className="panel cash-panel cash-action-panel">
              <div className="cash-panel-header">
                <h2>Cierre</h2>
                <CircleDollarSign size={18} />
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

              <div className="summary-grid cash-close-grid">
                <article className="stat-card cash-mini-stat">
                  <span className="metric-label">Esperado</span>
                  <strong className="metric-value">
                    {formatCurrency(openSession.expectedCash)}
                  </strong>
                </article>
                <article className="stat-card cash-mini-stat">
                  <span className="metric-label">Diferencia</span>
                  <strong className="metric-value">
                    {formatCurrency(cashDifference)}
                  </strong>
                  <span className="metric-footnote">
                    {cashDifference === 0
                      ? "Exacto"
                      : cashDifference > 0
                        ? "Sobra"
                        : "Falta"}
                  </span>
                </article>
              </div>

              <Button
                stretch
                disabled={!isOnline || busyAction === "close"}
                onClick={() => void handleCloseSession()}
              >
                {busyAction === "close" ? "Cerrando..." : "Cerrar caja"}
              </Button>
            </section>
          </div>

          <section className="panel cash-panel cash-activity-panel">
            <div className="cash-panel-header">
              <h2>Actividad</h2>
              <span className="badge">{activityItems.length}</span>
            </div>

            {activityItems.length === 0 ? (
              <div className="sales-empty-box cash-empty-state">
                <strong>Sin movimientos</strong>
              </div>
            ) : (
              <div className="cash-activity-list">
                {activityItems.map((item) => (
                  <article className="cash-activity-item" key={item.id}>
                    <div className="cash-activity-item__top">
                      <strong>{formatCurrency(item.amount)}</strong>
                      <span
                        className={
                          item.kind === "expense" ? "chip chip--danger" : "chip"
                        }
                      >
                        {item.meta}
                      </span>
                    </div>
                    <div className="cash-activity-item__bottom">
                      <span className="muted-text">{item.label}</span>
                      <span className="muted-text">{formatHour(item.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

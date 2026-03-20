import type { CartItem, CashSessionSummary } from "@/lib/domain/types";
import { money } from "@/lib/utils/format";

export function getCartTotal(items: CartItem[]) {
  return items.reduce(
    (total, item) => total + money(item.unitPrice) * item.quantity,
    0,
  );
}

export function getCartUnits(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function aggregateSessions(summaries: CashSessionSummary[]) {
  return summaries.reduce(
    (accumulator, summary) => {
      accumulator.sales += money(summary.effectiveSalesTotal);
      accumulator.cash += money(summary.effectiveCashSales);
      accumulator.yape += money(summary.effectiveYapeSales);
      accumulator.expenses += money(summary.expensesTotal);
      accumulator.expectedCash += money(summary.expectedCash);
      accumulator.voidAdjustments += money(summary.currentSessionVoidTotal);
      return accumulator;
    },
    {
      sales: 0,
      cash: 0,
      yape: 0,
      expenses: 0,
      expectedCash: 0,
      voidAdjustments: 0,
    },
  );
}

export function getCashDifference(summary: CashSessionSummary) {
  if (summary.countedCash === null) {
    return 0;
  }

  return money(summary.countedCash) - money(summary.expectedCash);
}

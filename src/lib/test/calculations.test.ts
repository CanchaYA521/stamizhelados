import { describe, expect, it } from "vitest";
import {
  aggregateSessions,
  getCartTotal,
  getCashDifference,
} from "@/lib/domain/calculations";

describe("getCartTotal", () => {
  it("suma cantidad por precio editable", () => {
    const total = getCartTotal([
      {
        productId: crypto.randomUUID(),
        productName: "Copa vainilla",
        basePrice: 7,
        unitPrice: 8,
        quantity: 2,
        note: "",
      },
      {
        productId: crypto.randomUUID(),
        productName: "Barquillo",
        basePrice: 5.5,
        unitPrice: 5.5,
        quantity: 1,
        note: "",
      },
    ]);

    expect(total).toBe(21.5);
  });
});

describe("aggregateSessions", () => {
  it("resume ventas, egresos y ajustes por anulación", () => {
    const aggregate = aggregateSessions([
      {
        id: "s-1",
        status: "closed",
        openedAt: "2026-03-20T10:00:00-05:00",
        closedAt: "2026-03-20T18:00:00-05:00",
        openingAmount: 50,
        countedCash: 86,
        effectiveSalesTotal: 140,
        effectiveCashSales: 90,
        effectiveYapeSales: 50,
        currentSessionVoidTotal: 10,
        currentSessionVoidCash: 10,
        currentSessionVoidYape: 0,
        expensesTotal: 44,
        expectedCash: 86,
      },
      {
        id: "s-2",
        status: "open",
        openedAt: "2026-03-21T10:00:00-05:00",
        closedAt: null,
        openingAmount: 30,
        countedCash: null,
        effectiveSalesTotal: 70,
        effectiveCashSales: 40,
        effectiveYapeSales: 30,
        currentSessionVoidTotal: 0,
        currentSessionVoidCash: 0,
        currentSessionVoidYape: 0,
        expensesTotal: 8,
        expectedCash: 62,
      },
    ]);

    expect(aggregate).toEqual({
      sales: 210,
      cash: 130,
      yape: 80,
      expenses: 52,
      expectedCash: 148,
      voidAdjustments: 10,
    });
  });
});

describe("getCashDifference", () => {
  it("calcula la diferencia entre contado y esperado", () => {
    expect(
      getCashDifference({
        id: "s-1",
        status: "closed",
        openedAt: "2026-03-20T10:00:00-05:00",
        closedAt: "2026-03-20T18:00:00-05:00",
        openingAmount: 50,
        countedCash: 92,
        effectiveSalesTotal: 120,
        effectiveCashSales: 80,
        effectiveYapeSales: 40,
        currentSessionVoidTotal: 0,
        currentSessionVoidCash: 0,
        currentSessionVoidYape: 0,
        expensesTotal: 20,
        expectedCash: 110,
      }),
    ).toBe(-18);
  });
});

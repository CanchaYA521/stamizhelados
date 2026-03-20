import type { Database } from "@/lib/supabase/database.types";

export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type CashSessionStatus = Database["public"]["Enums"]["cash_session_status"];
export type SaleStatus = Database["public"]["Enums"]["sale_status"];
export type VoidResolutionMode =
  Database["public"]["Enums"]["void_resolution_mode"];
export type SyncStatus = "pending" | "synced" | "failed";

export type AppUser = {
  id: string;
  email: string | null;
};

export type Product = {
  id: string;
  name: string;
  category: string | null;
  basePrice: number;
  active: boolean;
  displayOrder: number;
  updatedAt: string;
};

export type ProductInput = {
  id?: string;
  name: string;
  category?: string | null;
  basePrice: number;
  displayOrder: number;
  active: boolean;
};

export type CashSessionSummary = {
  id: string;
  status: CashSessionStatus;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  countedCash: number | null;
  effectiveSalesTotal: number;
  effectiveCashSales: number;
  effectiveYapeSales: number;
  currentSessionVoidTotal: number;
  currentSessionVoidCash: number;
  currentSessionVoidYape: number;
  expensesTotal: number;
  expectedCash: number;
};

export type CartItem = {
  productId: string;
  productName: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  note: string;
};

export type CreateSaleInput = {
  items: CartItem[];
  paymentMethod: PaymentMethod;
};

export type CreateExpenseInput = {
  amount: number;
  reason: string;
};

export type SaleItemRecord = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  note: string | null;
};

export type SaleVoidRecord = {
  id: string;
  resolutionMode: VoidResolutionMode;
  targetSessionId: string | null;
  voidedAt: string;
};

export type SaleRecord = {
  id: string;
  sessionId: string;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  totalAmount: number;
  createdAt: string;
  items: SaleItemRecord[];
  voidInfo: SaleVoidRecord | null;
};

export type CashExpenseRecord = {
  id: string;
  sessionId: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type SessionReport = {
  summary: CashSessionSummary;
  sales: SaleRecord[];
  expenses: CashExpenseRecord[];
};

export type VoidSaleInput = {
  saleId: string;
  resolutionMode: VoidResolutionMode;
  targetSessionId?: string | null;
};

export type QueuedSalePayload = {
  saleId: string;
  sessionId: string;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  createdAt: string;
};

export type QueuedExpensePayload = {
  expenseId: string;
  sessionId: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type OfflineMutation =
  | {
      id: string;
      type: "create_sale";
      payload: QueuedSalePayload;
      createdAt: string;
      syncStatus: SyncStatus;
      lastError: string | null;
    }
  | {
      id: string;
      type: "create_expense";
      payload: QueuedExpensePayload;
      createdAt: string;
      syncStatus: SyncStatus;
      lastError: string | null;
    };

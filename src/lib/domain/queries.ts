import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CashExpenseRecord,
  CashSessionSummary,
  Product,
  SaleRecord,
  SessionReport,
} from "@/lib/domain/types";
import { money } from "@/lib/utils/format";

type Client = SupabaseClient<Database>;

type SaleSelectRow = {
  id: string;
  session_id: string;
  payment_method: Database["public"]["Enums"]["payment_method"];
  status: Database["public"]["Enums"]["sale_status"];
  total_amount: number;
  created_at: string;
  sale_items?:
    | Array<{
        id: string;
        product_id: string | null;
        product_name_snapshot: string;
        quantity: number;
        base_price: number;
        unit_price: number;
        note: string | null;
      }>
    | null;
  sale_voids?:
    | Array<{
        id: string;
        resolution_mode: Database["public"]["Enums"]["void_resolution_mode"];
        target_session_id: string | null;
        voided_at: string;
      }>
    | null;
};

function toProduct(
  row: Database["public"]["Tables"]["products"]["Row"],
): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    basePrice: money(row.base_price),
    active: row.active,
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  };
}

function toSessionSummary(
  row: Database["public"]["Views"]["cash_session_summaries"]["Row"],
): CashSessionSummary {
  return {
    id: row.id,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openingAmount: money(row.opening_amount),
    countedCash: row.counted_cash === null ? null : money(row.counted_cash),
    effectiveSalesTotal: money(row.effective_sales_total),
    effectiveCashSales: money(row.effective_cash_sales),
    effectiveYapeSales: money(row.effective_yape_sales),
    currentSessionVoidTotal: money(row.current_session_void_total),
    currentSessionVoidCash: money(row.current_session_void_cash),
    currentSessionVoidYape: money(row.current_session_void_yape),
    expensesTotal: money(row.expenses_total),
    expectedCash: money(row.expected_cash),
  };
}

function toSale(row: SaleSelectRow): SaleRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    paymentMethod: row.payment_method,
    status: row.status,
    totalAmount: money(row.total_amount),
    createdAt: row.created_at,
    items: (row.sale_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      quantity: item.quantity,
      basePrice: money(item.base_price),
      unitPrice: money(item.unit_price),
      note: item.note,
    })),
    voidInfo: row.sale_voids?.[0]
      ? {
          id: row.sale_voids[0].id,
          resolutionMode: row.sale_voids[0].resolution_mode,
          targetSessionId: row.sale_voids[0].target_session_id,
          voidedAt: row.sale_voids[0].voided_at,
        }
      : null,
  };
}

function peruStart(date: string) {
  return `${date}T00:00:00-05:00`;
}

function peruEnd(date: string) {
  return `${date}T23:59:59.999-05:00`;
}

export async function fetchProducts(client: Client) {
  const { data, error } = await client
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(toProduct);
}

export async function fetchOpenSessionSummary(client: Client) {
  const { data, error } = await client
    .from("cash_session_summaries")
    .select("*")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toSessionSummary(data) : null;
}

export async function fetchRecentSales(
  client: Client,
  sessionId: string,
  limit = 10,
) {
  const { data, error } = await client
    .from("sales")
    .select(
      "id, session_id, payment_method, status, total_amount, created_at, sale_items(id, product_id, product_name_snapshot, quantity, base_price, unit_price, note), sale_voids(id, resolution_mode, target_session_id, voided_at)",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as SaleSelectRow[]).map(toSale);
}

export async function fetchRecentExpenses(
  client: Client,
  sessionId: string,
  limit = 10,
) {
  const { data, error } = await client
    .from("cash_expenses")
    .select("id, session_id, amount, reason, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map<CashExpenseRecord>((item) => ({
    id: item.id,
    sessionId: item.session_id,
    amount: money(item.amount),
    reason: item.reason,
    createdAt: item.created_at,
  }));
}

export async function fetchSessionSummaries(
  client: Client,
  filters: {
    from?: string;
    to?: string;
  },
) {
  let query = client
    .from("cash_session_summaries")
    .select("*")
    .order("opened_at", { ascending: false });

  if (filters.from) {
    query = query.gte("opened_at", peruStart(filters.from));
  }

  if (filters.to) {
    query = query.lte("opened_at", peruEnd(filters.to));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(toSessionSummary);
}

export async function fetchSessionReport(client: Client, sessionId: string) {
  const [summaryResult, salesResult, expensesResult] = await Promise.all([
    client
      .from("cash_session_summaries")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle(),
    client
      .from("sales")
      .select(
        "id, session_id, payment_method, status, total_amount, created_at, sale_items(id, product_id, product_name_snapshot, quantity, base_price, unit_price, note), sale_voids(id, resolution_mode, target_session_id, voided_at)",
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false }),
    client
      .from("cash_expenses")
      .select("id, session_id, amount, reason, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false }),
  ]);

  if (summaryResult.error) {
    throw summaryResult.error;
  }

  if (!summaryResult.data) {
    throw new Error("No se encontró la sesión solicitada.");
  }

  if (salesResult.error) {
    throw salesResult.error;
  }

  if (expensesResult.error) {
    throw expensesResult.error;
  }

  return {
    summary: toSessionSummary(summaryResult.data),
    sales: ((salesResult.data ?? []) as unknown as SaleSelectRow[]).map(toSale),
    expenses: (expensesResult.data ?? []).map<CashExpenseRecord>((item) => ({
      id: item.id,
      sessionId: item.session_id,
      amount: money(item.amount),
      reason: item.reason,
      createdAt: item.created_at,
    })),
  } satisfies SessionReport;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  ProductInput,
  QueuedExpensePayload,
  QueuedSalePayload,
  VoidSaleInput,
} from "@/lib/domain/types";
import {
  closeSessionSchema,
  expenseSchema,
  openSessionSchema,
  productSchema,
  saleSchema,
  voidSaleSchema,
} from "@/lib/domain/validations";

type Client = SupabaseClient<Database>;

export async function openCashSession(client: Client, openingAmount: number) {
  const parsed = openSessionSchema.parse({ openingAmount });

  const { error } = await client.rpc("open_cash_session", {
    p_opening_amount: parsed.openingAmount,
  });

  if (error) {
    throw error;
  }
}

export async function closeCashSession(client: Client, input: {
  sessionId: string;
  countedCash: number;
}) {
  const parsed = closeSessionSchema.parse({
    countedCash: input.countedCash,
  });

  const { error } = await client.rpc("close_cash_session", {
    p_session_id: input.sessionId,
    p_counted_cash: parsed.countedCash,
  });

  if (error) {
    throw error;
  }
}

export async function upsertProduct(client: Client, input: ProductInput) {
  const parsed = productSchema.parse({
    ...input,
    category: input.category?.trim() || null,
  });

  if (parsed.id) {
    const { error } = await client
      .from("products")
      .update({
        name: parsed.name,
        category: parsed.category ?? null,
        base_price: parsed.basePrice,
        display_order: parsed.displayOrder,
        active: parsed.active,
      })
      .eq("id", parsed.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await client.from("products").insert({
    name: parsed.name,
    category: parsed.category ?? null,
    base_price: parsed.basePrice,
    display_order: parsed.displayOrder,
    active: parsed.active,
  });

  if (error) {
    throw error;
  }
}

export async function executeSaleMutation(
  client: Client,
  payload: QueuedSalePayload,
) {
  const parsed = saleSchema.parse({
    paymentMethod: payload.paymentMethod,
    items: payload.items,
  });

  const { error } = await client.rpc("create_sale", {
    p_sale_id: payload.saleId,
    p_session_id: payload.sessionId,
    p_payment_method: parsed.paymentMethod,
    p_created_at: payload.createdAt,
    p_items: parsed.items.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      base_price: item.basePrice,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      note: item.note || null,
    })),
  });

  if (error) {
    throw error;
  }
}

export async function executeExpenseMutation(
  client: Client,
  payload: QueuedExpensePayload,
) {
  const parsed = expenseSchema.parse({
    amount: payload.amount,
    reason: payload.reason,
  });

  const { error } = await client.rpc("create_cash_expense", {
    p_expense_id: payload.expenseId,
    p_session_id: payload.sessionId,
    p_amount: parsed.amount,
    p_reason: parsed.reason,
    p_created_at: payload.createdAt,
  });

  if (error) {
    throw error;
  }
}

export async function voidSale(client: Client, input: VoidSaleInput) {
  const parsed = voidSaleSchema.parse(input);

  const { error } = await client.rpc("void_sale", {
    p_sale_id: parsed.saleId,
    p_resolution_mode: parsed.resolutionMode,
    p_target_session_id: parsed.targetSessionId ?? null,
  });

  if (error) {
    throw error;
  }
}

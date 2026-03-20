import { z } from "zod";

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Ingresa un nombre válido."),
  category: z.string().trim().max(60).optional().nullable(),
  basePrice: z.coerce.number().positive("El precio debe ser mayor a cero."),
  displayOrder: z.coerce.number().int().min(0),
  active: z.boolean(),
});

export const openSessionSchema = z.object({
  openingAmount: z.coerce.number().min(0, "La apertura no puede ser negativa."),
});

export const closeSessionSchema = z.object({
  countedCash: z.coerce.number().min(0, "El conteo no puede ser negativo."),
});

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("El egreso debe ser mayor a cero."),
  reason: z.string().trim().min(2, "Describe el motivo del egreso."),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().trim().min(1),
  basePrice: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
  note: z.string().trim().max(160).default(""),
});

export const saleSchema = z.object({
  paymentMethod: z.enum(["cash", "yape"]),
  items: z.array(cartItemSchema).min(1, "Agrega al menos un producto."),
});

export const voidSaleSchema = z
  .object({
    saleId: z.string().uuid(),
    resolutionMode: z.enum(["current_session", "original_session"]),
    targetSessionId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (value) =>
      value.resolutionMode === "original_session" || Boolean(value.targetSessionId),
    {
      message: "Debes elegir la sesión actual para impactar hoy.",
      path: ["targetSessionId"],
    },
  );

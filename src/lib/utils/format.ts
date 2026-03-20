import { format } from "date-fns";
import { es } from "date-fns/locale";

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatCurrency(value: number | string | null | undefined) {
  return currencyFormatter.format(money(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return format(new Date(value), "d MMM yyyy, HH:mm", {
    locale: es,
  });
}

export function formatHour(value: string | null | undefined) {
  if (!value) {
    return "Sin hora";
  }

  return format(new Date(value), "HH:mm", {
    locale: es,
  });
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return format(new Date(value), "d MMM", {
    locale: es,
  });
}

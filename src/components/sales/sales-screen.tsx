"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, Plus, ReceiptText, ShoppingBasket, Trash2 } from "lucide-react";
import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { fetchRecentSales } from "@/lib/domain/queries";
import type {
  CartItem,
  PaymentMethod,
  Product,
  SaleRecord,
} from "@/lib/domain/types";
import { getCartTotal, getCartUnits } from "@/lib/domain/calculations";
import { formatCurrency, formatHour } from "@/lib/utils/format";

type ProductGroup = {
  key: string;
  label: string;
  theme: "default" | "donofrio";
  products: Product[];
  firstOrder: number;
};

const UNCATEGORIZED_LABEL = "Otros";

function getProductGroupLabel(category: string | null) {
  const normalized = category?.trim();

  if (!normalized) {
    return UNCATEGORIZED_LABEL;
  }

  if (normalized.toLowerCase().includes("donofrio")) {
    return "Donofrio";
  }

  return normalized;
}

function getProductGroupTheme(label: string): ProductGroup["theme"] {
  return label.toLowerCase().includes("donofrio") ? "donofrio" : "default";
}

export function SalesScreen() {
  const {
    products,
    openSession,
    createSaleAction,
    supabase,
    dataVersion,
    isOnline,
    pendingCount,
  } = useAppData();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const activeProducts = products.filter((product) => product.active);
  const sortedProducts = [...activeProducts].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder ||
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
  );
  const productGroupsMap = new Map<string, ProductGroup>();

  for (const product of sortedProducts) {
    const label = getProductGroupLabel(product.category);
    const existingGroup = productGroupsMap.get(label);

    if (existingGroup) {
      existingGroup.products.push(product);
      existingGroup.firstOrder = Math.min(existingGroup.firstOrder, product.displayOrder);
      continue;
    }

    productGroupsMap.set(label, {
      key: label,
      label,
      theme: getProductGroupTheme(label),
      products: [product],
      firstOrder: product.displayOrder,
    });
  }

  const productGroups = [...productGroupsMap.values()].sort(
    (left, right) =>
      left.firstOrder - right.firstOrder ||
      left.label.localeCompare(right.label, "es", { sensitivity: "base" }),
  );
  const selectedGroup =
    productGroups.find((group) => group.key === selectedGroupKey) ?? null;
  const cartTotal = getCartTotal(cart);
  const cartUnits = getCartUnits(cart);

  useEffect(() => {
    async function loadRecentSales() {
      if (!supabase || !openSession || !isOnline) {
        setRecentSales([]);
        return;
      }

      setLoadingRecent(true);

      try {
        setRecentSales(await fetchRecentSales(supabase, openSession.id, 6));
      } catch {
        setRecentSales([]);
      } finally {
        setLoadingRecent(false);
      }
    }

    void loadRecentSales();
  }, [supabase, openSession, isOnline, dataVersion]);

  const addProduct = (product: (typeof activeProducts)[number]) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          basePrice: product.basePrice,
          unitPrice: product.basePrice,
          quantity: 1,
          note: "",
        },
      ];
    });
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const updateItem = (
    productId: string,
    patch: Partial<Pick<CartItem, "unitPrice" | "note">>,
  ) => {
    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  };

  const submitSale = async () => {
    if (cart.length === 0) {
      toast.error("Agrega productos antes de registrar la venta.");
      return;
    }

    setSubmitting(true);

    try {
      await createSaleAction({
        paymentMethod,
        items: cart,
      });
      setCart([]);
      setPaymentMethod("cash");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo registrar la venta.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <div className="page-title-row">
        <div className="detail-stack">
          <span className="eyebrow">Venta rápida</span>
          <h1 className="section-title">Registra pedidos en uno o dos toques.</h1>
          <p className="panel-subtitle">
            Carrito con varios productos, precio editable por línea y cobro por
            efectivo o Yape.
          </p>
        </div>
      </div>

      {!openSession ? (
        <EmptyState
          title="Todavía no hay una caja abierta."
          description="Ve a la pantalla de Caja para registrar la apertura antes de vender."
          action={
            <Link className="button button--primary" href="/app/caja">
              Abrir caja
            </Link>
          }
        />
      ) : null}

      {!isOnline ? (
        <div className="notice notice--warning">
          <strong>Modo offline activo.</strong>
          <p>
            Las ventas nuevas quedarán pendientes de sincronización. Pendientes
            actuales: {pendingCount}.
          </p>
        </div>
      ) : null}

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Venta por categoría</h2>
              <p className="panel-subtitle">
                Toca una categoría y abre una lista resumida con nombre y precio.
              </p>
            </div>
            <span className="badge">
              {productGroups.length} grupo{productGroups.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeProducts.length === 0 ? (
            <EmptyState
              title="Aún no tienes productos activos."
              description="Crea el catálogo desde la pantalla de Productos para empezar a vender."
            />
          ) : (
            <div className="category-grid">
              {productGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className={`category-card category-card--${group.theme}`}
                  onClick={() => setSelectedGroupKey(group.key)}
                >
                  <span className="category-card__eyebrow">Venta rápida</span>
                  <strong className="category-card__title">{group.label}</strong>
                  <span className="category-card__meta">
                    {group.products.length} producto
                    {group.products.length === 1 ? "" : "s"}
                  </span>
                  <span className="category-card__hint">
                    Toca para abrir la lista rápida
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Carrito</h2>
              <p className="panel-subtitle">
                {cartUnits} unidad{cartUnits === 1 ? "" : "es"} en la venta.
              </p>
            </div>
            <span className="badge">{formatCurrency(cartTotal)}</span>
          </div>

          <div className="toggle-row" role="tablist" aria-label="Método de pago">
            <button
              type="button"
              className="toggle-button"
              data-active={paymentMethod === "cash"}
              onClick={() => setPaymentMethod("cash")}
            >
              Efectivo
            </button>
            <button
              type="button"
              className="toggle-button"
              data-active={paymentMethod === "yape"}
              onClick={() => setPaymentMethod("yape")}
            >
              Yape
            </button>
          </div>

          {cart.length === 0 ? (
            <EmptyState
              title="El carrito está vacío."
              description="Toca cualquier producto para agregarlo a la venta."
            />
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <article className="line-item" key={item.productId}>
                  <div className="panel-header">
                    <div className="detail-stack">
                      <strong>{item.productName}</strong>
                      <span className="muted-text">
                        Base {formatCurrency(item.basePrice)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Quitar ${item.productName}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="qty-row">
                    <Button
                      variant="ghost"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Minus size={16} />
                    </Button>
                    <span className="qty-pill">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>

                  <div className="field">
                    <label htmlFor={`price-${item.productId}`}>Precio final</label>
                    <input
                      id={`price-${item.productId}`}
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(item.productId, {
                          unitPrice: Number(event.target.value || 0),
                        })
                      }
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`note-${item.productId}`}>
                      Nota opcional del precio
                    </label>
                    <input
                      id={`note-${item.productId}`}
                      className="input"
                      value={item.note}
                      onChange={(event) =>
                        updateItem(item.productId, {
                          note: event.target.value,
                        })
                      }
                      placeholder="Promo, ajuste especial, cortesía parcial..."
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="divider" />

          <div className="summary-grid">
            <article className="stat-card">
              <span className="metric-label">Método</span>
              <strong className="metric-value">
                {paymentMethod === "cash" ? "Efectivo" : "Yape"}
              </strong>
            </article>
            <article className="stat-card">
              <span className="metric-label">Total</span>
              <strong className="metric-value">{formatCurrency(cartTotal)}</strong>
            </article>
          </div>

          <Button
            stretch
            onClick={() => void submitSale()}
            disabled={!openSession || cart.length === 0 || submitting}
          >
            <ShoppingBasket size={18} />
            {submitting ? "Guardando venta..." : "Registrar venta"}
          </Button>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Ventas recientes</h2>
            <p className="panel-subtitle">
              Últimos movimientos de la sesión abierta.
            </p>
          </div>
          <ReceiptText size={18} />
        </div>

        {!openSession ? (
          <EmptyState
            title="Sin actividad visible"
            description="Abre una sesión y registra ventas para ver el historial aquí."
          />
        ) : loadingRecent ? (
          <p className="muted-text">Cargando ventas recientes...</p>
        ) : recentSales.length === 0 ? (
          <EmptyState
            title="Todavía no hay ventas en esta sesión."
            description="La primera venta aparecerá aquí apenas la registres."
          />
        ) : (
          <div className="activity-list">
            {recentSales.map((sale) => (
              <article className="activity-item" key={sale.id}>
                <div className="panel-header">
                  <div className="detail-stack">
                    <strong>{formatCurrency(sale.totalAmount)}</strong>
                    <span className="muted-text">
                      {sale.paymentMethod === "cash" ? "Efectivo" : "Yape"} ·{" "}
                      {formatHour(sale.createdAt)}
                    </span>
                  </div>
                  {sale.voidInfo ? (
                    <span className="chip chip--danger">Anulada</span>
                  ) : (
                    <span className="chip">Activa</span>
                  )}
                </div>
                <p className="muted-text">
                  {sale.items.map((item) => `${item.quantity}x ${item.productName}`).join(" · ")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selectedGroup)}
        title={selectedGroup?.label ?? "Categoría"}
        description={
          openSession
            ? "Toca un producto para agregarlo al carrito."
            : "Abre una caja para agregar productos a la venta."
        }
        onClose={() => setSelectedGroupKey(null)}
      >
        <div className="quick-product-list">
          {selectedGroup?.products.map((product) => (
            <button
              key={product.id}
              type="button"
              className="quick-product-button"
              onClick={() => addProduct(product)}
              disabled={!openSession}
            >
              <strong>{product.name}</strong>
              <span className="price">{formatCurrency(product.basePrice)}</span>
            </button>
          ))}
        </div>
      </Modal>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { CartItem, PaymentMethod, Product } from "@/lib/domain/types";
import { getCartTotal, getCartUnits } from "@/lib/domain/calculations";
import { formatCurrency } from "@/lib/utils/format";

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
  const { products, openSession, createSaleAction, isOnline } = useAppData();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

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
  const cartCounts = new Map(cart.map((item) => [item.productId, item.quantity]));

  const addProduct = (product: Product) => {
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
      setCartOpen(false);
      toast.success("Venta registrada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo registrar la venta.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCartEditor = (prefix: string) => {
    if (cart.length === 0) {
      return (
        <div className="sales-empty-box">
          <strong>Carrito vacío</strong>
        </div>
      );
    }

    return (
      <div className="cart-list sales-cart-list">
        {cart.map((item) => (
          <article className="line-item sales-cart-item" key={`${prefix}-${item.productId}`}>
            <div className="sales-cart-item__top">
              <div className="detail-stack sales-cart-item__copy">
                <strong>{item.productName}</strong>
                <span className="muted-text">{formatCurrency(item.basePrice)}</span>
              </div>
              <Button
                variant="ghost"
                className="button--compact sales-cart-item__remove"
                onClick={() => removeItem(item.productId)}
                aria-label={`Quitar ${item.productName}`}
              >
                <Trash2 size={16} />
              </Button>
            </div>

            <div className="sales-cart-item__controls">
              <div className="qty-row sales-cart-item__qty">
                <Button
                  variant="ghost"
                  className="button--compact"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                >
                  <Minus size={16} />
                </Button>
                <span className="qty-pill">{item.quantity}</span>
                <Button
                  variant="ghost"
                  className="button--compact"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                >
                  <Plus size={16} />
                </Button>
              </div>

              <div className="field sales-cart-item__price">
                <label htmlFor={`${prefix}-price-${item.productId}`}>Precio</label>
                <input
                  id={`${prefix}-price-${item.productId}`}
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
            </div>

            <strong className="sales-cart-item__line-total">
              {formatCurrency(item.unitPrice * item.quantity)}
            </strong>
          </article>
        ))}
      </div>
    );
  };

  return (
    <section className="page-section sales-page">
      {!openSession ? (
        <section className="panel sales-blocker">
          <strong>No hay caja abierta.</strong>
          <Link className="button button--primary" href="/app/caja">
            Abrir caja
          </Link>
        </section>
      ) : null}

      {!isOnline ? (
        <div className="notice notice--warning sales-inline-notice">
          Trabajando offline.
        </div>
      ) : null}

      <div className="sales-layout">
        <section className="panel sales-panel sales-panel--catalog">
          <div className="sales-panel__top">
            <h1 className="sales-panel__title">Categorías</h1>
            <span className="badge">
              {productGroups.length} grupo{productGroups.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeProducts.length === 0 ? (
            <div className="sales-empty-box">
              <strong>Sin productos activos</strong>
            </div>
          ) : (
            <div className="category-grid category-grid--compact">
              {productGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className={`category-card category-card--compact category-card--${group.theme}`}
                  onClick={() => setSelectedGroupKey(group.key)}
                  disabled={!openSession}
                >
                  <strong className="category-card__title">{group.label}</strong>
                  <span className="category-card__count">
                    {group.products.length} producto
                    {group.products.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel sales-panel sales-panel--cart">
          <div className="sales-panel__top">
            <div className="detail-stack">
              <h2>Venta actual</h2>
              <span className="muted-text">
                {cartUnits} producto{cartUnits === 1 ? "" : "s"}
              </span>
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

          {renderCartEditor("desktop")}

          <div className="sales-checkout-row">
            <div className="sales-checkout-total">
              <span>Total</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>
            <Button
              stretch
              onClick={() => void submitSale()}
              disabled={!openSession || cart.length === 0 || submitting}
            >
              <ShoppingBasket size={18} />
              {submitting ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </section>
      </div>

      {openSession ? (
        <div className="sales-cart-dock">
          <button
            type="button"
            className="sales-cart-dock__summary"
            onClick={() => setCartOpen(true)}
          >
            <span className="sales-cart-dock__label">Carrito</span>
            <strong>
              {cart.length === 0
                ? "Sin productos"
                : `${cartUnits} · ${formatCurrency(cartTotal)}`}
            </strong>
          </button>

          <div
            className="toggle-row sales-cart-dock__payments"
            role="tablist"
            aria-label="Método de pago rápido"
          >
            <button
              type="button"
              className="toggle-button"
              data-active={paymentMethod === "cash"}
              onClick={() => setPaymentMethod("cash")}
            >
              Efe
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

          <Button
            className="sales-cart-dock__submit"
            onClick={() => void submitSale()}
            disabled={cart.length === 0 || submitting}
          >
            <ShoppingBasket size={18} />
            {submitting ? "Guardando..." : "Cobrar"}
          </Button>
        </div>
      ) : null}

      <Modal
        open={Boolean(selectedGroup)}
        title={selectedGroup?.label ?? "Categoría"}
        onClose={() => setSelectedGroupKey(null)}
      >
        <div className="quick-product-list">
          {selectedGroup?.products.map((product) => {
            const currentCount = cartCounts.get(product.id) ?? 0;

            return (
              <button
                key={product.id}
                type="button"
                className="quick-product-button"
                onClick={() => addProduct(product)}
                disabled={!openSession}
              >
                <div className="detail-stack">
                  <strong>{product.name}</strong>
                  <span className="price">{formatCurrency(product.basePrice)}</span>
                </div>
                {currentCount > 0 ? (
                  <span className="chip">x{currentCount}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={cartOpen}
        title="Venta actual"
        onClose={() => setCartOpen(false)}
      >
        <div className="sales-cart-modal">
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

          {renderCartEditor("mobile")}

          <div className="sales-checkout-row sales-checkout-row--modal">
            <div className="sales-checkout-total">
              <span>Total</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>
            <Button
              stretch
              onClick={() => void submitSale()}
              disabled={!openSession || cart.length === 0 || submitting}
            >
              <ShoppingBasket size={18} />
              {submitting ? "Guardando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

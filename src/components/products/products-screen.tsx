"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Power, Tags } from "lucide-react";
import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils/format";

const initialDraft = {
  id: undefined as string | undefined,
  name: "",
  category: "",
  basePrice: "0",
  displayOrder: "0",
  active: true,
};

export function ProductsScreen() {
  const { products, upsertProductAction, isOnline, hasSupabaseConfig } = useAppData();
  const [draft, setDraft] = useState(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const activeProducts = products.filter((product) => product.active).length;
  const inactiveProducts = products.length - activeProducts;

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      await upsertProductAction({
        id: draft.id,
        name: draft.name,
        category: draft.category || null,
        basePrice: Number(draft.basePrice),
        displayOrder: Number(draft.displayOrder),
        active: draft.active,
      });
      setDraft(initialDraft);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el producto.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (product: (typeof products)[number]) => {
    setDraft({
      id: product.id,
      name: product.name,
      category: product.category || "",
      basePrice: String(product.basePrice),
      displayOrder: String(product.displayOrder),
      active: product.active,
    });
  };

  const toggleProduct = async (product: (typeof products)[number]) => {
    try {
      await upsertProductAction({
        id: product.id,
        name: product.name,
        category: product.category,
        basePrice: product.basePrice,
        displayOrder: product.displayOrder,
        active: !product.active,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del producto.",
      );
    }
  };

  return (
    <section className="page-section products-page">
      <section className="panel products-summary-panel">
        <div className="module-head">
          <div className="detail-stack">
            <h1 className="cash-title">Productos</h1>
            <span className="muted-text">
              {activeProducts} activos · {products.length} total
            </span>
          </div>

          <div className="chip-row">
            <span className="badge">{activeProducts} visibles</span>
            {inactiveProducts ? (
              <span className="chip chip--danger">{inactiveProducts} ocultos</span>
            ) : null}
            {!isOnline ? (
              <span className="status-pill status-pill--offline">Sin conexión</span>
            ) : null}
          </div>
        </div>

        {!hasSupabaseConfig ? (
          <div className="notice notice--warning products-inline-notice">
            Configura Supabase
          </div>
        ) : null}
      </section>

      <div className="two-column products-layout products-workspace">
        <section className="panel product-form-panel">
          <div className="products-panel-head">
            <div className="detail-stack">
              <h2>{draft.id ? "Editar" : "Nuevo"}</h2>
              <span className="muted-text">
                {draft.id ? "Actualiza ficha" : "Alta rápida"}
              </span>
            </div>
            <span className="panel-symbol" aria-hidden="true">
              <Tags size={18} />
            </span>
          </div>

          <div className="field">
            <label htmlFor="productName">Nombre</label>
            <input
              id="productName"
              className="input"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Copa fresa, barquillo clásico..."
            />
          </div>

          <div className="field">
            <label htmlFor="productCategory">Categoría</label>
            <input
              id="productCategory"
              className="input"
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Copa, barquillo, vaso..."
            />
          </div>

          <div className="summary-grid">
            <div className="field">
              <label htmlFor="productPrice">Precio base</label>
              <input
                id="productPrice"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={draft.basePrice}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    basePrice: event.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="productOrder">Orden visual</label>
              <input
                id="productOrder"
                className="input"
                type="number"
                min="0"
                step="1"
                value={draft.displayOrder}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    displayOrder: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="toggle-row" role="group" aria-label="Estado del producto">
            <button
              type="button"
              className="toggle-button"
              data-active={draft.active}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  active: true,
                }))
              }
            >
              Activo
            </button>
            <button
              type="button"
              className="toggle-button"
              data-active={!draft.active}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  active: false,
                }))
              }
            >
              Inactivo
            </button>
          </div>

          <div className="inline-actions product-form-actions">
            <Button
              stretch
              disabled={!isOnline || !hasSupabaseConfig || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Guardando..." : draft.id ? "Guardar cambios" : "Guardar"}
            </Button>
            {draft.id ? (
              <Button
                variant="ghost"
                className="button--compact"
                onClick={() => setDraft(initialDraft)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </section>

        <section className="panel product-list-panel">
          <div className="products-panel-head">
            <div className="detail-stack">
              <h2>Catálogo</h2>
              <span className="muted-text">
                {products.length} registro{products.length === 1 ? "" : "s"}
              </span>
            </div>
            <span className="badge">{activeProducts} activos</span>
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Sin productos"
              description="Crea el primero."
            />
          ) : (
            <div className="list-stack product-list">
              {products.map((product) => (
                <article className="product-list-item" key={product.id}>
                  <div className="product-list-item__header">
                    <div className="detail-stack product-list-item__copy">
                      <h3 className="product-list-item__name">{product.name}</h3>
                      <span className="product-list-item__meta">
                        {product.category || "Sin categoría"} · Orden{" "}
                        {product.displayOrder}
                      </span>
                    </div>
                    <span
                      className={`chip product-status-chip ${product.active ? "" : "chip--danger"}`}
                    >
                      {product.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <strong className="product-list-item__price">
                    {formatCurrency(product.basePrice)}
                  </strong>
                  <div className="inline-actions product-list-item__actions">
                    <Button
                      variant="ghost"
                      className="button--compact"
                      onClick={() => startEditing(product)}
                    >
                      <Pencil size={16} />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="button--compact"
                      disabled={!isOnline || !hasSupabaseConfig}
                      onClick={() => void toggleProduct(product)}
                    >
                      <Power size={16} />
                      {product.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

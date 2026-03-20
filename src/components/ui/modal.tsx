"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header">
          <div className="detail-stack">
            <h2 id="modal-title">{title}</h2>
            {description ? <p className="muted-text">{description}</p> : null}
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar modal">
            <X size={16} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

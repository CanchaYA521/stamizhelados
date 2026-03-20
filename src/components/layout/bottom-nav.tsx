"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Package2,
  ShoppingBasket,
} from "lucide-react";

const items = [
  {
    href: "/app/venta",
    label: "Venta",
    icon: ShoppingBasket,
  },
  {
    href: "/app/caja",
    label: "Caja",
    icon: CircleDollarSign,
  },
  {
    href: "/app/productos",
    label: "Productos",
    icon: Package2,
  },
  {
    href: "/app/reportes",
    label: "Reportes",
    icon: ChartNoAxesCombined,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            className="nav-link"
            href={item.href}
            data-active={active}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

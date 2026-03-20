"use client";

import { useRouter } from "next/navigation";
import { LogOut, RefreshCcw } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/ui/config-notice";
import { useAppData } from "@/components/providers/app-data-provider";

export function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const {
    user,
    signOut,
    isOnline,
    pendingCount,
    openSession,
    refreshCoreData,
    isRefreshing,
    hasSupabaseConfig,
  } = useAppData();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="app-shell">
      <aside className="app-header app-sidebar">
        <div className="brand-row">
          <div className="cluster">
            <BrandLogo priority />
            <div className="brand-copy">
              <strong>Nutria Systems</strong>
              <span className="muted-text">
                {openSession ? "Caja abierta" : "Caja cerrada"}
              </span>
            </div>
          </div>
          <span
            className={`status-pill ${isOnline ? "status-pill--online" : "status-pill--offline"}`}
          >
            {isOnline ? "En línea" : "Offline"}
          </span>
        </div>

        {!hasSupabaseConfig ? (
          <ConfigNotice />
        ) : (
          <div className="page-stack">
            <div className="stats-grid app-sidebar-stats">
              <article className="stat-card">
                <span className="metric-label">Sesión actual</span>
                <strong className="metric-value">
                  {openSession ? "Activa" : "Sin abrir"}
                </strong>
                <span className="metric-footnote">
                  {openSession ? "Lista para vender" : "Ve a Caja para empezar"}
                </span>
              </article>
              <article className="stat-card">
                <span className="metric-label">Pendientes</span>
                <strong className="metric-value">{pendingCount}</strong>
                <span className="metric-footnote">
                  {pendingCount === 0
                    ? "Todo sincronizado"
                    : "Movimientos por enviar"}
                </span>
              </article>
            </div>

            <div className="subnav-row">
              <div className="app-account-copy">
                <div className="metric-label">Cuenta</div>
                <div className="muted-text">{user?.email ?? "Sin sesión"}</div>
              </div>
              <div className="inline-actions app-actions">
                <Button
                  variant="ghost"
                  onClick={() => void refreshCoreData()}
                  disabled={isRefreshing}
                >
                  <RefreshCcw size={16} />
                  {isRefreshing ? "Actualizando" : "Actualizar"}
                </Button>
                <Button variant="ghost" onClick={() => void handleSignOut()}>
                  <LogOut size={16} />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </aside>

      <main className="page-stack app-main">{children}</main>
    </div>
  );
}

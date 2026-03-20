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
    signOut,
    isOnline,
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
                {openSession ? "Caja abierta" : "Sin caja"}
              </span>
            </div>
          </div>
        </div>

        {!hasSupabaseConfig ? (
          <ConfigNotice />
        ) : (
          <div className="app-header-tools">
            <span
              className={`status-pill ${isOnline ? "status-pill--online" : "status-pill--offline"}`}
            >
              {isOnline ? "En línea" : "Offline"}
            </span>

            <div className="inline-actions app-header-actions">
              <Button
                variant="ghost"
                className="button--compact app-header-action"
                onClick={() => void refreshCoreData()}
                disabled={isRefreshing}
                aria-label={isRefreshing ? "Sincronizando" : "Sincronizar"}
              >
                <RefreshCcw size={16} />
                <span>{isRefreshing ? "Sync..." : "Sync"}</span>
              </Button>
              <Button
                variant="ghost"
                className="button--compact app-header-action"
                onClick={() => void handleSignOut()}
                aria-label="Cerrar sesión"
              >
                <LogOut size={16} />
                <span>Salir</span>
              </Button>
            </div>
          </div>
        )}

        <BottomNav />
      </aside>

      <main className="page-stack app-main">{children}</main>
    </div>
  );
}

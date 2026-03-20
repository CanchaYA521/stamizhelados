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
        <div className="app-header-bar">
          <div className="brand-row app-brand-row">
            <BrandLogo priority />
            <div className="brand-copy">
              <strong>Nutria Systems</strong>
              <div className="app-header-meta">
                <span className="muted-text">
                  {openSession ? "Caja abierta" : "Sin caja"}
                </span>
                {hasSupabaseConfig ? (
                  <span
                    className={`status-pill status-pill--compact ${isOnline ? "status-pill--online" : "status-pill--offline"}`}
                  >
                    {isOnline ? "En línea" : "Offline"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {!hasSupabaseConfig ? null : (
            <div className="app-header-toolbar">
              <Button
                variant="ghost"
                className="button--compact app-header-action"
                onClick={() => void refreshCoreData()}
                disabled={isRefreshing}
                aria-label={isRefreshing ? "Sincronizando" : "Sincronizar"}
                title={isRefreshing ? "Sincronizando" : "Sincronizar"}
              >
                <RefreshCcw size={16} />
              </Button>
              <Button
                variant="ghost"
                className="button--compact app-header-action"
                onClick={() => void handleSignOut()}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </Button>
            </div>
          )}
        </div>

        {!hasSupabaseConfig ? <ConfigNotice /> : null}
      </aside>

      <main className="page-stack app-main">{children}</main>
      <BottomNav />
    </div>
  );
}

import { Suspense } from "react";
import { AuthCard } from "@/components/ui/auth-card";

export default function LoginPage() {
  return (
    <main className="auth-shell auth-shell--system">
      <Suspense
        fallback={
          <section className="auth-card auth-card--system">Cargando acceso...</section>
        }
      >
          <AuthCard />
      </Suspense>
    </main>
  );
}

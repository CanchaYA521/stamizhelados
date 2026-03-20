import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/ui/auth-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/app/venta");
    }
  }

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

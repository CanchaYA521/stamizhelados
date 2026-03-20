"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/ui/config-notice";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const hasConfig = Boolean(supabase);
  const nextPath = searchParams.get("next") || "/app/venta";

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      toast.error("Falta la configuración de Supabase.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            business_name: "Nutria Systems",
          },
        },
      });

      if (error) {
        throw error;
      }

      toast.success(
        data.session
          ? "Cuenta creada y lista para usar."
          : "Cuenta creada. Revisa tu correo si tienes confirmación activa.",
      );

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
      } else {
        setMode("signin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-card auth-card--system">
      <div className="auth-brand">
        <BrandLogo priority />
        <div className="detail-stack auth-brand-copy">
          <strong>Nutria Systems</strong>
          <span className="muted-text">
            {mode === "signin" ? "Acceso al sistema" : "Registro del negocio"}
          </span>
        </div>
      </div>

      <div className="detail-stack">
        <h1>{mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}</h1>
      </div>

      {hydrated && !hasConfig ? <ConfigNotice /> : null}

      <div className="toggle-row" role="tablist" aria-label="Modo de acceso">
        <button
          className="toggle-button"
          type="button"
          data-active={mode === "signin"}
          onClick={() => setMode("signin")}
        >
          Ingresar
        </button>
        <button
          className="toggle-button"
          type="button"
          data-active={mode === "signup"}
          onClick={() => setMode("signup")}
        >
          Crear cuenta
        </button>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <div className="field">
            <label htmlFor="fullName">Nombre</label>
            <input
              id="fullName"
              className="input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Tu nombre o referencia"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="dueno@heladeria.pe"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>

        <Button
          type="submit"
          stretch
          disabled={submitting || !hydrated || !hasConfig}
          variant="primary"
        >
          {submitting
            ? "Procesando..."
            : mode === "signin"
              ? "Entrar"
              : "Crear cuenta"}
        </Button>
      </form>
    </section>
  );
}

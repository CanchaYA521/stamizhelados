import { MISSING_SUPABASE_MESSAGE } from "@/lib/supabase/env";

export function ConfigNotice() {
  return (
    <div className="config-note">
      <strong>Falta la configuración de Supabase.</strong>
      <p>{MISSING_SUPABASE_MESSAGE}</p>
    </div>
  );
}

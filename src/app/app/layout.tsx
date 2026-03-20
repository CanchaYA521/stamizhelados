import { redirect } from "next/navigation";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  let initialUser:
    | {
        id: string;
        email: string | null;
      }
    | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    initialUser = {
      id: user.id,
      email: user.email ?? null,
    };
  }

  return (
    <AppDataProvider initialUser={initialUser}>
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  );
}

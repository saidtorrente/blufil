import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hostinger sirve la app detrás de un proxy: el Host que recibe el proceso
// Node es 0.0.0.0:3000, no el dominio público. Usar `origin` derivado de
// request.url manda al usuario a un enlace roto — se fija el origen real.
const ORIGIN = "https://portal.blufil.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: tecnico } = await supabase
        .from("tecnicos")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      return NextResponse.redirect(`${ORIGIN}${tecnico ? "/tecnico/dashboard" : "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${ORIGIN}/login?error=confirmacion`);
}

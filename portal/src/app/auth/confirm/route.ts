import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
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

      return NextResponse.redirect(`${origin}${tecnico ? "/tecnico/dashboard" : "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmacion`);
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function iniciarSesionTecnico(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const cedula = String(formData.get("cedula") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!cedula || !password) {
    return "Ingresa tu número de cédula y tu contraseña.";
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/iniciar-sesion-tecnico`;
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula, password }),
    cache: "no-store",
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    if (datos.error === "correo_sin_confirmar") {
      return "Todavía no confirmas tu cuenta. Revisa el correo que te enviamos al crearla.";
    }
    return "Cédula o contraseña incorrecta.";
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: datos.access_token,
    refresh_token: datos.refresh_token,
  });

  if (error) {
    return "No pudimos iniciar tu sesión. Intenta de nuevo.";
  }

  redirect("/tecnico/dashboard");
}

import { createClient } from "@/lib/supabase/server";

export type NivelAdmin = "superadmin" | "operador" | "lector";
export type Admin = { nombre: string; nivel: NivelAdmin };

export const ETIQUETA_NIVEL: Record<NivelAdmin, string> = {
  superadmin: "Superadmin",
  operador: "Operador",
  lector: "Solo lectura",
};

// El admin actual, leído con su propia sesión: la política RLS de `admins`
// deja a cada admin ver su fila. Devuelve null si no hay sesión o no es admin.
export async function obtenerAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Admin | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("admins")
    .select("nombre, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data as Admin | null) ?? null;
}

export function puedeEscribir(admin: Admin | null): boolean {
  return admin?.nivel === "operador" || admin?.nivel === "superadmin";
}

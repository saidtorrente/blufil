"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function actualizarPerfilTecnico(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "Tu sesión expiró. Vuelve a entrar.";
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();
  const ciudad = String(formData.get("ciudad") ?? "").trim();
  const zona = String(formData.get("zona") ?? "").trim();
  const disponible = formData.get("disponible") === "on";

  if (!nombre) {
    return "El nombre no puede quedar vacío.";
  }

  // Lista blanca explícita: nunca se toca `certificado` ni `cedula` desde
  // este formulario, aunque la política RLS `tecnicos_update_own` permita
  // actualizar cualquier columna de la fila propia.
  const { error } = await supabase
    .from("tecnicos")
    .update({
      nombre,
      correo: correo || null,
      ciudad: ciudad || null,
      zona: zona || null,
      disponible,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    return "No pudimos guardar tu perfil. Intenta de nuevo.";
  }

  revalidatePath("/tecnico/perfil");
  revalidatePath("/tecnico/dashboard");
  return null;
}

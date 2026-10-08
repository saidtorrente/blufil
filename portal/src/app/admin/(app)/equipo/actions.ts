"use server";

import { revalidatePath } from "next/cache";
import { correoValido, invocarFuncion, sesionSuperadmin, texto, valoresDe } from "../../admin";
import type { EstadoForm } from "../../tipos";

const NIVELES = ["superadmin", "operador", "lector"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function agregarAdmin(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionSuperadmin();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const nombre = texto(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio.", valores };

  const correo = texto(formData, "correo")?.toLowerCase();
  if (!correo || !correoValido(correo)) return { error: "Escribe un correo válido.", valores };

  const nivel = texto(formData, "nivel");
  if (!nivel || !NIVELES.includes(nivel)) return { error: "Elige un nivel de acceso.", valores };

  const resultado = await invocarFuncion(supabase, "provisionar-admin", { correo, nombre, nivel });
  if (!resultado.ok) {
    const amigable = /already|registered|exists|duplicate/i.test(resultado.mensaje)
      ? "Ya existe una cuenta con ese correo."
      : resultado.mensaje;
    return { error: `No se pudo crear al administrador: ${amigable}`, valores };
  }

  revalidatePath("/admin/equipo");
  return {
    exito: `Listo. ${nombre} ya puede entrar: dile que abra /admin/login y use «Olvidé mi contraseña» con ${correo} para crear la suya.`,
  };
}

export async function cambiarNivel(authUserId: string, nivel: string): Promise<string | null> {
  const { supabase, admin, error } = await sesionSuperadmin();
  if (error) return error;
  if (!UUID.test(authUserId) || !NIVELES.includes(nivel)) return "Datos no válidos.";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === authUserId) return "No puedes cambiar tu propio nivel.";
  if (!admin) return "Tu sesión expiró. Vuelve a entrar.";

  const { data, error: errorUpdate } = await supabase
    .from("admins")
    .update({ nivel })
    .eq("auth_user_id", authUserId)
    .select("auth_user_id");
  if (errorUpdate) return errorUpdate.code === "P0001" ? errorUpdate.message : "No pudimos cambiar el nivel. Intenta de nuevo.";
  if (!data || data.length === 0) return "No encontramos a ese administrador.";

  revalidatePath("/admin/equipo");
  return null;
}

export async function quitarAdmin(authUserId: string): Promise<string | null> {
  const { supabase, error } = await sesionSuperadmin();
  if (error) return error;
  if (!UUID.test(authUserId)) return "Datos no válidos.";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === authUserId) return "No puedes quitarte a ti mismo.";

  const { data, error: errorDelete } = await supabase
    .from("admins")
    .delete()
    .eq("auth_user_id", authUserId)
    .select("auth_user_id");
  if (errorDelete) return errorDelete.code === "P0001" ? errorDelete.message : "No pudimos quitar el acceso. Intenta de nuevo.";
  if (!data || data.length === 0) return "No encontramos a ese administrador.";

  revalidatePath("/admin/equipo");
  return null;
}

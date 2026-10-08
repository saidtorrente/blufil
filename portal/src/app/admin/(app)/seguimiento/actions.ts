"use server";

import { revalidatePath } from "next/cache";
import { sesionOperador, sesionSuperadmin } from "../../admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Etapas que una persona puede poner a mano. «Agendado», «En servicio» y «Hecho»
// las mueve el sistema cuando se crea o avanza la solicitud del servicio.
const ETAPAS_MANUALES = {
  mantenimiento: ["por_vencer", "contactado", "sin_respuesta"],
  nuevo_cliente: ["instalado", "llamada", "activo"],
} as const;

const CANALES = ["whatsapp", "llamada", "correo", "nota"];

function refrescar() {
  revalidatePath("/admin/seguimiento");
}

async function tarjetaAbierta(supabase: Awaited<ReturnType<typeof sesionOperador>>["supabase"], id: string) {
  const { data } = await supabase
    .from("seguimientos")
    .select("id, tipo, etapa, cerrado_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function moverSeguimiento(id: string, etapa: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(id)) return "Datos no válidos.";

  const tarjeta = await tarjetaAbierta(supabase, id);
  if (!tarjeta) return "No encontramos esa tarjeta.";
  if (tarjeta.cerrado_at) return "Esta tarjeta ya está cerrada.";

  const permitidas: readonly string[] = ETAPAS_MANUALES[tarjeta.tipo as keyof typeof ETAPAS_MANUALES] ?? [];
  if (!permitidas.includes(etapa)) return "Esa columna se mueve sola cuando avanza el servicio.";
  if (!permitidas.includes(tarjeta.etapa)) return "Esta tarjeta la maneja el sistema: avanza con el servicio.";

  const { error: errorUpdate } = await supabase
    .from("seguimientos")
    .update({ etapa, cerrado_at: etapa === "activo" ? new Date().toISOString() : null })
    .eq("id", id);
  if (errorUpdate) return "No pudimos mover la tarjeta. Intenta de nuevo.";

  refrescar();
  return null;
}

export async function registrarContacto(
  id: string,
  canal: string,
  nota: string,
  resultado: "contactado" | "sin_respuesta",
): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(id) || !CANALES.includes(canal)) return "Datos no válidos.";
  const texto = nota.trim().slice(0, 500);

  const tarjeta = await tarjetaAbierta(supabase, id);
  if (!tarjeta || tarjeta.cerrado_at) return "No encontramos esa tarjeta abierta.";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error: errorContacto } = await supabase
    .from("contactos_seguimiento")
    .insert({ seguimiento_id: id, admin_id: user?.id ?? null, canal, nota: texto || null });
  if (errorContacto) return "No pudimos guardar el contacto. Intenta de nuevo.";

  // El contacto mueve la tarjeta solo si todavía está en una etapa manual de mantenimiento.
  const cambios: Record<string, string> = { ultimo_contacto_at: new Date().toISOString() };
  if (tarjeta.tipo === "mantenimiento" && ["por_vencer", "contactado", "sin_respuesta"].includes(tarjeta.etapa)) {
    cambios.etapa = resultado;
  }
  await supabase.from("seguimientos").update(cambios).eq("id", id);

  refrescar();
  return null;
}

export async function posponerSeguimiento(id: string, fecha: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "Elige una fecha válida.";

  const tarjeta = await tarjetaAbierta(supabase, id);
  if (!tarjeta || tarjeta.cerrado_at) return "No encontramos esa tarjeta abierta.";

  const { error: errorUpdate } = await supabase.from("seguimientos").update({ fecha_objetivo: fecha }).eq("id", id);
  if (errorUpdate) return "No pudimos cambiar la fecha. Intenta de nuevo.";

  refrescar();
  return null;
}

export async function guardarNotasSeguimiento(id: string, notas: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(id)) return "Datos no válidos.";

  const { error: errorUpdate } = await supabase
    .from("seguimientos")
    .update({ notas: notas.trim().slice(0, 1000) || null })
    .eq("id", id);
  if (errorUpdate) return "No pudimos guardar la nota. Intenta de nuevo.";

  refrescar();
  return null;
}

export async function cambiarRecordatorios(activo: boolean): Promise<string | null> {
  const { supabase, error } = await sesionSuperadmin();
  if (error) return error;

  const { data, error: errorUpdate } = await supabase
    .from("ajustes_seguimiento")
    .update({ enviar_recordatorios: activo, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (errorUpdate || !data || data.length === 0) return "No pudimos guardar el ajuste. Intenta de nuevo.";

  refrescar();
  return null;
}

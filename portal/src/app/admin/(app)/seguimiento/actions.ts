"use server";

import { revalidatePath } from "next/cache";
import { invocarFuncion, sesionOperador, sesionSuperadmin } from "../../admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Etapas que una persona puede poner a mano. «Programado», «Realizado», «Facturado» y
// «Pagado» las mueve el sistema cuando avanza el servicio y su factura.
const ETAPAS_MANUALES = {
  mantenimiento: ["por_vencer", "contactado", "vencido_sin_respuesta"],
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

  const ahora = new Date().toISOString();
  const cambios: Record<string, string | null> = { etapa, cerrado_at: etapa === "activo" ? ahora : null };
  // Una persona que marca «Contactado» deja constancia: el sistema ya no la devuelve sola a «Vencido».
  if (tarjeta.tipo === "mantenimiento" && etapa === "contactado") cambios.ultimo_contacto_at = ahora;
  const { error: errorUpdate } = await supabase.from("seguimientos").update(cambios).eq("id", id);
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

  // «Contactado» es solo si el cliente respondió: «No contestó» queda en el historial y no mueve la tarjeta.
  const cambios: Record<string, string> = { ultimo_contacto_at: new Date().toISOString() };
  if (
    resultado === "contactado" &&
    tarjeta.tipo === "mantenimiento" &&
    ["por_vencer", "vencido_sin_respuesta"].includes(tarjeta.etapa)
  ) {
    cambios.etapa = "contactado";
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

  // Si estaba vencida y se pospone a una fecha futura, vuelve a «Por vencer».
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const cambios: Record<string, string> = { fecha_objetivo: fecha };
  if (tarjeta.etapa === "vencido_sin_respuesta" && fecha >= hoy) cambios.etapa = "por_vencer";
  const { error: errorUpdate } = await supabase.from("seguimientos").update(cambios).eq("id", id);
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

// Reenvía el informe del servicio al correo del cliente.
export async function enviarInformeServicio(servicioId: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(servicioId)) return "Datos no válidos.";

  const resultado = await invocarFuncion(supabase, "informe-servicio", { servicio_id: servicioId });
  if (!resultado.ok) return resultado.mensaje || "No pudimos enviar el informe. Intenta de nuevo.";
  if (resultado.mensaje) return resultado.mensaje;

  refrescar();
  return null;
}

// Registra que el cliente pagó la factura del servicio: la tarjeta pasa a «Pagado».
export async function marcarFacturaPagada(servicioId: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(servicioId)) return "Datos no válidos.";

  const { data: servicio } = await supabase.from("servicios").select("visita_id").eq("id", servicioId).maybeSingle();
  if (!servicio?.visita_id) return "No encontramos el servicio.";

  const { error: errorRpc } = await supabase.rpc("marcar_factura_pagada", { p_visita_id: servicio.visita_id });
  if (errorRpc) {
    return errorRpc.code === "P0001"
      ? errorRpc.message
      : errorRpc.code === "42501"
        ? "No tienes permiso para marcar pagos."
        : "No pudimos marcar la factura como pagada. Intenta de nuevo.";
  }

  refrescar();
  revalidatePath("/admin/solicitudes");
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

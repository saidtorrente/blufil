"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerAdmin, puedeEscribir } from "../../../admin";

// Las políticas RLS rechazan en silencio una escritura de un lector (0 filas
// afectadas), así que el nivel se comprueba aquí para dar un mensaje claro.
async function sesionConPermiso() {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);
  if (!puedeEscribir(admin)) {
    return { supabase, error: "Tu nivel de acceso es de solo lectura." as string | null };
  }
  return { supabase, error: null as string | null };
}

function refrescar(servicioId: string) {
  revalidatePath(`/admin/solicitudes/${servicioId}`);
  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin");
}

const ESTADOS_EDITABLES = ["pendiente", "asignada", "en_progreso"];

export async function asignarTecnico(servicioId: string, tecnicoId: string): Promise<string | null> {
  const { supabase, error } = await sesionConPermiso();
  if (error) return error;
  if (!tecnicoId) return "Elige un técnico.";

  const { data: tecnico } = await supabase
    .from("tecnicos")
    .select("certificado")
    .eq("id", tecnicoId)
    .maybeSingle();
  if (!tecnico) return "No encontramos a ese técnico.";
  if (!tecnico.certificado) return "Ese técnico todavía no está certificado.";

  const { data, error: errorUpdate } = await supabase
    .from("servicios")
    .update({ tecnico_id: tecnicoId, estado: "asignada" })
    .eq("id", servicioId)
    .in("estado", ESTADOS_EDITABLES)
    .select("id");

  if (errorUpdate) return "No pudimos asignar el técnico. Intenta de nuevo.";
  if (!data || data.length === 0) return "Esta solicitud ya no se puede reasignar (cambió de estado).";

  refrescar(servicioId);
  return null;
}

export async function devolverAPendiente(servicioId: string): Promise<string | null> {
  const { supabase, error } = await sesionConPermiso();
  if (error) return error;

  const { data, error: errorUpdate } = await supabase
    .from("servicios")
    .update({ tecnico_id: null, estado: "pendiente" })
    .eq("id", servicioId)
    .in("estado", ["asignada", "en_progreso"])
    .select("id, visita_id");

  if (errorUpdate) return "No pudimos devolver la solicitud. Intenta de nuevo.";
  if (!data || data.length === 0) return "Esta solicitud no tiene técnico asignado.";

  // Vuelve a quedar disponible: se avisa a los técnicos igual que una solicitud nueva.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notificar-solicitud`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ visita_id: data[0].visita_id }),
    }).catch(() => {});
  }

  refrescar(servicioId);
  return null;
}

export async function cancelarSolicitud(servicioId: string): Promise<string | null> {
  const { supabase, error } = await sesionConPermiso();
  if (error) return error;

  const { data, error: errorUpdate } = await supabase
    .from("servicios")
    .update({ estado: "cancelada" })
    .eq("id", servicioId)
    .in("estado", ESTADOS_EDITABLES)
    .select("id");

  if (errorUpdate) return "No pudimos cancelar la solicitud. Intenta de nuevo.";
  if (!data || data.length === 0) return "Esta solicitud ya no se puede cancelar.";

  refrescar(servicioId);
  return null;
}

export async function reintentarFactura(servicioId: string): Promise<string | null> {
  const { supabase, error } = await sesionConPermiso();
  if (error) return error;

  const { data: servicio } = await supabase
    .from("servicios")
    .select("visita_id, estado")
    .eq("id", servicioId)
    .maybeSingle();
  if (!servicio) return "No encontramos la solicitud.";
  if (servicio.estado !== "completada") return "Solo se factura cuando el servicio está completado.";

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return "Tu sesión expiró. Vuelve a entrar.";

  const respuesta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/facturar-visita`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ visita_id: servicio.visita_id }),
    cache: "no-store",
  }).catch(() => null);

  if (!respuesta) return "No pudimos comunicarnos con el servicio de facturación. Intenta de nuevo.";

  const cuerpo = await respuesta.json().catch(() => ({}) as { error?: string; warning?: string });
  if (!respuesta.ok) {
    // Los mensajes de la función ya están pensados para leerse (p. ej. "hay servicios sin valor cobrado").
    return `No se pudo facturar: ${cuerpo.error ?? "error desconocido"}.`;
  }
  if (cuerpo.warning) return `Se emitió en Siigo, pero ${cuerpo.warning}.`;

  refrescar(servicioId);
  return null;
}

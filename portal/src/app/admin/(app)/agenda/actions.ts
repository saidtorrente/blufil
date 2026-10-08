"use server";

import { revalidatePath } from "next/cache";
import { aInstante } from "@/lib/agenda";
import { invocarFuncion, sesionOperador } from "../../admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResultadoAgenda = { error?: string; cruce?: boolean; aviso?: string };

function refrescar(servicioId: string) {
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/solicitudes");
  revalidatePath(`/admin/solicitudes/${servicioId}`);
}

async function avisar(
  supabase: Awaited<ReturnType<typeof sesionOperador>>["supabase"],
  servicioId: string,
): Promise<string> {
  const resultado = await invocarFuncion(supabase, "notificar-agenda", { servicio_id: servicioId, evento: "confirmada" });
  return resultado.ok && !resultado.mensaje
    ? "Visita programada. Avisamos al cliente y al técnico por correo."
    : "Visita programada, pero no pudimos enviar todos los correos de aviso.";
}

// Asigna técnico, día y hora: queda confirmada y se avisa al cliente y al técnico.
export async function programarVisita(
  servicioId: string,
  tecnicoId: string,
  fecha: string,
  hora: string,
  duracion: number,
  forzar: boolean,
): Promise<ResultadoAgenda> {
  const { supabase, error } = await sesionOperador();
  if (error) return { error };
  if (!UUID.test(servicioId) || !UUID.test(tecnicoId)) return { error: "Elige el técnico que hará la visita." };
  const inicio = aInstante(fecha, hora);
  if (!inicio) return { error: "Elige el día y la hora de la visita." };

  const { error: errorRpc } = await supabase.rpc("programar_servicio", {
    p_servicio_id: servicioId,
    p_inicio: inicio,
    p_duracion: duracion,
    p_tecnico_id: tecnicoId,
    p_forzar: forzar,
  });
  if (errorRpc) {
    // Los mensajes de las reglas de negocio (P0001) ya están pensados para leerse.
    if (errorRpc.code === "P0001") return { error: errorRpc.message, cruce: errorRpc.message.startsWith("Ese técnico ya tiene") };
    return { error: "No pudimos programar la visita. Intenta de nuevo." };
  }

  const aviso = await avisar(supabase, servicioId);
  refrescar(servicioId);
  return { aviso };
}

// El técnico propuso una hora: el admin la confirma tal cual.
export async function confirmarPropuesta(servicioId: string): Promise<ResultadoAgenda> {
  const { supabase, error } = await sesionOperador();
  if (error) return { error };
  if (!UUID.test(servicioId)) return { error: "Datos no válidos." };

  const { error: errorRpc } = await supabase.rpc("confirmar_horario", { p_servicio_id: servicioId });
  if (errorRpc) {
    return { error: errorRpc.code === "P0001" ? errorRpc.message : "No pudimos confirmar la visita. Intenta de nuevo." };
  }

  const aviso = await avisar(supabase, servicioId);
  refrescar(servicioId);
  return { aviso };
}

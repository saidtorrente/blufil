"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { aInstante } from "@/lib/agenda";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El técnico que aceptó una visita propone el día y la hora; el admin la confirma.
export async function proponerHorario(
  servicioId: string,
  fecha: string,
  hora: string,
): Promise<{ error?: string; aviso?: string }> {
  if (!UUID.test(servicioId)) return { error: "Datos no válidos." };
  const inicio = aInstante(fecha, hora);
  if (!inicio) return { error: "Elige el día y la hora." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("proponer_horario", { p_servicio_id: servicioId, p_inicio: inicio });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No pudimos guardar la hora. Intenta de nuevo." };
  }

  // Se avisa al administrador con el token del propio técnico (la función verifica que sea su servicio).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let avisado = false;
  if (session?.access_token) {
    const respuesta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notificar-agenda`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ servicio_id: servicioId, evento: "propuesta" }),
      cache: "no-store",
    }).catch(() => null);
    avisado = Boolean(respuesta?.ok);
  }

  revalidatePath("/tecnico/agenda");
  revalidatePath("/tecnico/dashboard");
  return {
    aviso: avisado
      ? "Hora propuesta. La administración la confirmará y avisará al cliente."
      : "Hora propuesta, pero no pudimos avisar a la administración por correo.",
  };
}

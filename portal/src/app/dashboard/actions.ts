"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function solicitarMantenimiento(sistemaInstaladoId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: visitaId, error } = await supabase.rpc("solicitar_mantenimiento", {
    p_sistema_instalado_id: sistemaInstaladoId,
  });

  if (error) {
    return error.message.includes("en curso")
      ? "Ya tienes una solicitud de mantenimiento en curso para este equipo."
      : "No pudimos registrar la solicitud. Intenta de nuevo o escríbenos por WhatsApp.";
  }

  if (visitaId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    notificarSolicitud(visitaId, session?.access_token);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/equipos");
  return null;
}

export async function guardarBarrio(sistemaInstaladoId: string, barrio: string): Promise<string | null> {
  const limpio = barrio.trim();
  if (!limpio) return "Escribe el nombre del barrio.";
  if (limpio.length > 80) return "El nombre del barrio es demasiado largo.";

  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_barrio_sistema", {
    p_sistema_instalado_id: sistemaInstaladoId,
    p_barrio: limpio,
  });

  if (error) return "No pudimos guardar el barrio. Intenta de nuevo.";

  revalidatePath("/dashboard/equipos");
  return null;
}

// Avisa por correo de la nueva solicitud. Falla en silencio hacia el
// cliente — no debe bloquear el registro de la solicitud en el portal.
async function notificarSolicitud(visitaId: string, accessToken: string | undefined) {
  if (!accessToken) return;
  // Se envía el token del propio cliente: la función verifica que la visita sea suya.
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notificar-solicitud`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ visita_id: visitaId }),
  }).catch(() => {});
}

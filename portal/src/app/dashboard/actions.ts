"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bGN0ZW15Y2l3c2hmc3F2aGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzI1NDksImV4cCI6MjEwMzk0ODU0OX0.R3CriE9urVxRDzETFbh2_Ecqj_tY7rDu71oUmaAtIEY";

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
    notificarSolicitud(visitaId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/equipos");
  return null;
}

// Avisa por correo de la nueva solicitud. Falla en silencio hacia el
// cliente — no debe bloquear el registro de la solicitud en el portal.
async function notificarSolicitud(visitaId: string) {
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notificar-solicitud`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ visita_id: visitaId }),
  }).catch(() => {});
}

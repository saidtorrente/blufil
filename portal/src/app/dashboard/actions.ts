"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function solicitarMantenimiento(sistemaInstaladoId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("solicitar_mantenimiento", {
    p_sistema_instalado_id: sistemaInstaladoId,
  });

  if (error) {
    return error.message.includes("en curso")
      ? "Ya tienes una solicitud de mantenimiento en curso para este equipo."
      : "No pudimos registrar la solicitud. Intenta de nuevo o escríbenos por WhatsApp.";
  }

  revalidatePath("/dashboard");
  return null;
}

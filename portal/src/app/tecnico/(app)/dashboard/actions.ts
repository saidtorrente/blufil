"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function aceptarServicio(servicioId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aceptar_servicio", { p_servicio_id: servicioId });

  if (error) {
    return "Ese servicio ya no está disponible — probablemente otro técnico lo tomó primero.";
  }

  revalidatePath("/tecnico/dashboard");
  return null;
}

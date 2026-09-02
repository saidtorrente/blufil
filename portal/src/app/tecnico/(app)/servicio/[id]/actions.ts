"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completarServicio(
  servicioId: string,
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const supabase = await createClient();

  const notas = String(formData.get("notas") ?? "").trim();
  const valorCobrado = String(formData.get("valor_cobrado") ?? "").trim();
  const descuento = String(formData.get("descuento_aplicado") ?? "").trim();
  const proximaFecha = String(formData.get("proxima_fecha_mantenimiento") ?? "").trim();
  const fotos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!notas) {
    return "Escribe una nota sobre el servicio realizado.";
  }

  const rutasFotos: string[] = [];
  for (const foto of fotos) {
    const extension = foto.name.split(".").pop() || "jpg";
    const ruta = `${servicioId}/${crypto.randomUUID()}.${extension}`;
    const { error: errorSubida } = await supabase.storage
      .from("servicios-fotos")
      .upload(ruta, foto, { contentType: foto.type });

    if (errorSubida) {
      return "No pudimos subir una de las fotos. Intenta de nuevo.";
    }
    rutasFotos.push(ruta);
  }

  const { data: servicioActualizado, error } = await supabase
    .from("servicios")
    .update({
      estado: "completada",
      reporte_ia: notas,
      valor_cobrado: valorCobrado ? Number(valorCobrado) : null,
      descuento_aplicado: descuento ? Number(descuento) : 0,
      proxima_fecha_mantenimiento: proximaFecha || null,
      fotos: rutasFotos,
    })
    .eq("id", servicioId)
    .select("visita_id")
    .single();

  if (error) {
    return "No pudimos guardar el servicio. Intenta de nuevo.";
  }

  await facturarSiTodoCompletado(servicioActualizado.visita_id);

  redirect("/tecnico/dashboard");
}

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bGN0ZW15Y2l3c2hmc3F2aGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzI1NDksImV4cCI6MjEwMzk0ODU0OX0.R3CriE9urVxRDzETFbh2_Ecqj_tY7rDu71oUmaAtIEY";

// Si esta visita ya no tiene servicios pendientes/asignados/en progreso,
// se consolida en una sola factura Siigo. Falla en silencio hacia el
// técnico — la factura se puede reintentar manualmente si algo sale mal,
// no debe bloquear el cierre del servicio en el portal.
async function facturarSiTodoCompletado(visitaId: string) {
  const supabase = await createClient();
  const { data: pendientes } = await supabase
    .from("servicios")
    .select("id")
    .eq("visita_id", visitaId)
    .neq("estado", "completada");

  if (pendientes && pendientes.length > 0) return;

  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/facturar-visita`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ visita_id: visitaId }),
  }).catch(() => {});
}

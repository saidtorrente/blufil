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

  const { error } = await supabase
    .from("servicios")
    .update({
      estado: "completada",
      reporte_ia: notas,
      valor_cobrado: valorCobrado ? Number(valorCobrado) : null,
      descuento_aplicado: descuento ? Number(descuento) : 0,
      proxima_fecha_mantenimiento: proximaFecha || null,
      fotos: rutasFotos,
    })
    .eq("id", servicioId);

  if (error) {
    return "No pudimos guardar el servicio. Intenta de nuevo.";
  }

  redirect("/tecnico/dashboard");
}

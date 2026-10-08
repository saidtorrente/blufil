"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Pide a la Edge Function un enlace temporal para subir una evidencia directo a
// Cloudflare R2 (la función verifica que el servicio sea de este técnico).
export async function pedirSubidaEvidencia(
  servicioId: string,
  tipo: string,
  extension: string,
  tamano: number,
): Promise<{ ruta: string; url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { error: "Tu sesión expiró. Vuelve a entrar." };

  const respuesta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/evidencias-r2`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ accion: "subir", servicio_id: servicioId, tipo, extension, tamano }),
    cache: "no-store",
  }).catch(() => null);
  if (!respuesta) return { error: "No pudimos comunicarnos con el servidor. Intenta de nuevo." };

  const cuerpo = (await respuesta.json().catch(() => ({}))) as { ruta?: string; url?: string; error?: string };
  if (!respuesta.ok || !cuerpo.ruta || !cuerpo.url) return { error: cuerpo.error ?? "No pudimos preparar la subida." };
  return { ruta: cuerpo.ruta, url: cuerpo.url };
}

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
  // Rutas de las evidencias, ya subidas por el navegador al almacenamiento.
  const evidencias = formData.getAll("evidencia").map(String);

  if (!notas) {
    return "Escribe una nota sobre el servicio realizado.";
  }

  const ids = formData.getAll("producto_id").map(String);
  const cantidades = formData.getAll("producto_cantidad").map((c) => Number(c));
  const equipoId = String(formData.get("equipo_id") ?? "").trim();

  // Productos del servicio (equipo + repuestos), juntando los repetidos.
  const pedidos = new Map<string, number>();
  ids.forEach((id, i) => {
    const cantidad = cantidades[i];
    if (!id) return;
    if (!Number.isFinite(cantidad) || cantidad <= 0 || Math.round(cantidad * 100) !== cantidad * 100) {
      pedidos.set("__invalida__", 1);
      return;
    }
    pedidos.set(id, (pedidos.get(id) ?? 0) + cantidad);
  });
  if (pedidos.has("__invalida__")) return "Revisa las cantidades de los repuestos.";
  if (equipoId) pedidos.set(equipoId, (pedidos.get(equipoId) ?? 0) + 1);

  const { data: servicioActual } = await supabase
    .from("servicios")
    .select("tipo, sistemas_instalados(tipo)")
    .eq("id", servicioId)
    .maybeSingle();
  if (!servicioActual) return "No encontramos el servicio.";

  const productosElegidos =
    pedidos.size > 0
      ? ((
          await supabase
            .from("productos")
            .select("id, categoria, tipo_sistema, precio, activo")
            .in("id", [...pedidos.keys()])
        ).data ?? [])
      : [];
  if (productosElegidos.length !== pedidos.size) return "Uno de los productos elegidos ya no está disponible. Recarga la página.";

  if (servicioActual.tipo === "instalacion") {
    const sistema = Array.isArray(servicioActual.sistemas_instalados)
      ? servicioActual.sistemas_instalados[0]
      : servicioActual.sistemas_instalados;
    const equipo = productosElegidos.find((p) => p.id === equipoId);
    if (!equipo || equipo.categoria !== "equipo" || equipo.tipo_sistema !== sistema?.tipo) {
      return "Elige el equipo que instalaste.";
    }
  }
  for (const p of productosElegidos) {
    if (!p.activo || p.precio == null) return "Uno de los productos no tiene precio en Siigo. Avisa a la administración.";
    if (p.id !== equipoId && p.categoria !== "repuesto") return "Uno de los repuestos elegidos no es válido.";
  }

  // Se guardan antes de cerrar el servicio: la factura los lee al emitirse.
  // Si el cierre se reintenta, se reemplazan los de la vez anterior.
  const { error: errorBorrar } = await supabase.from("servicio_productos").delete().eq("servicio_id", servicioId);
  if (errorBorrar) return "No pudimos guardar los repuestos. Intenta de nuevo.";
  if (productosElegidos.length > 0) {
    const { error: errorProductos } = await supabase.from("servicio_productos").insert(
      productosElegidos.map((p) => ({
        servicio_id: servicioId,
        producto_id: p.id,
        cantidad: pedidos.get(p.id)!,
        precio_unitario: Number(p.precio),
      })),
    );
    if (errorProductos) return "No pudimos guardar los repuestos. Intenta de nuevo.";
  }

  const rutasEvidencia = [...new Set(evidencias)];
  const carpeta = `r2:${servicioId}/`;
  if (rutasEvidencia.some((r) => !r.startsWith(carpeta) || r.slice(carpeta.length).includes("/"))) {
    return "Alguna evidencia no es válida. Vuelve a subirlas.";
  }
  const nombreEs = (prefijo: string) => rutasEvidencia.some((r) => r.slice(carpeta.length).startsWith(prefijo));
  if (!nombreEs("antes-") || !nombreEs("despues-")) {
    return "Sube la foto del antes y la del después.";
  }

  const { data: servicioActualizado, error } = await supabase
    .from("servicios")
    .update({
      estado: "completada",
      reporte_ia: notas,
      valor_cobrado: valorCobrado ? Number(valorCobrado) : null,
      descuento_aplicado: descuento ? Number(descuento) : 0,
      proxima_fecha_mantenimiento: proximaFecha || null,
      fotos: rutasEvidencia,
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
    .not("estado", "in", "(completada,cancelada)");

  if (pendientes && pendientes.length > 0) return;

  // Se envía el token del propio técnico: la función verifica que tenga un
  // servicio en esa visita.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/facturar-visita`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ visita_id: visitaId }),
  }).catch(() => {});
}

"use server";

import { revalidatePath } from "next/cache";
import { invocarFuncion, sesionOperador, sesionSuperadmin } from "../../admin";

const CATEGORIAS = ["sin_clasificar", "equipo", "servicio", "repuesto", "otro"];
const TIPOS_SISTEMA = ["doble_filtracion", "ultrafiltracion", "osmosis_inversa", "dispensador", "ozono"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cambia solo la clasificación del portal; el resto del producto lo manda Siigo.
export async function clasificarProducto(
  productoId: string,
  categoria: string,
  tipoSistema: string | null,
): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!UUID.test(productoId) || !CATEGORIAS.includes(categoria)) return "Datos no válidos.";
  if (tipoSistema && !TIPOS_SISTEMA.includes(tipoSistema)) return "Datos no válidos.";
  if (categoria === "equipo" && !tipoSistema) return "Elige a qué tipo de equipo corresponde.";

  const { data, error: errorUpdate } = await supabase
    .from("productos")
    .update({ categoria, tipo_sistema: categoria === "equipo" ? tipoSistema : null })
    .eq("id", productoId)
    .select("id");
  if (errorUpdate) return "No pudimos guardar el cambio. Intenta de nuevo.";
  if (!data || data.length === 0) return "No encontramos ese producto.";

  revalidatePath("/admin/inventario");
  return null;
}

export async function sincronizarAhora(): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;

  const resultado = await invocarFuncion(supabase, "sincronizar-siigo", {});
  if (!resultado.ok) return `No se pudo sincronizar con Siigo: ${resultado.mensaje}`;

  revalidatePath("/admin/inventario");
  return null;
}

export async function guardarAjustes(enviarDian: boolean, enviarCorreo: boolean, cobrarIva: boolean): Promise<string | null> {
  const { supabase, error } = await sesionSuperadmin();
  if (error) return error;

  const { data, error: errorUpdate } = await supabase
    .from("ajustes_facturacion")
    .update({ enviar_dian: enviarDian, enviar_correo: enviarCorreo, cobrar_iva: cobrarIva, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("id");
  if (errorUpdate || !data || data.length === 0) return "No pudimos guardar los ajustes. Intenta de nuevo.";

  revalidatePath("/admin/inventario");
  return null;
}

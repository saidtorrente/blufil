"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  correoValido,
  crearCuentaDeAcceso,
  documento,
  esSuperadmin,
  mensajeDeBase,
  sesionOperador,
  texto,
  valoresDe,
} from "../../admin";
import type { EstadoForm } from "../../tipos";

function refrescarTecnico(id?: string) {
  if (id) revalidatePath(`/admin/tecnicos/${id}`);
  revalidatePath("/admin/tecnicos");
}

type Basicos =
  | { datos: { nombre: string; correo: string | null; ciudad: string | null; zona: string | null }; error?: undefined }
  | { datos?: undefined; error: string };

function leerBasicos(formData: FormData): Basicos {
  const nombre = texto(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio." };

  const correo = texto(formData, "correo")?.toLowerCase() ?? null;
  if (correo && !correoValido(correo)) return { error: "El correo no parece válido." };

  return { datos: { nombre, correo, ciudad: texto(formData, "ciudad"), zona: texto(formData, "zona") } };
}

export async function crearTecnico(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, admin, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const basicos = leerBasicos(formData);
  if (!basicos.datos) return { error: basicos.error, valores };

  const doc = documento(formData, "cedula");
  if (doc.error) return { error: doc.error, valores };

  const crearCuenta = formData.get("crear_cuenta") === "on";
  if (crearCuenta && (!basicos.datos.correo || !doc.valor)) {
    return { error: "Para crear la cuenta de acceso hacen falta el correo y la cédula.", valores };
  }

  // Solo un superadmin puede dar de alta a un técnico ya certificado.
  const certificado = esSuperadmin(admin) && formData.get("certificado") === "on";

  const { data: nuevo, error: errorInsert } = await supabase
    .from("tecnicos")
    .insert({ ...basicos.datos, cedula: doc.valor, certificado })
    .select("id")
    .single();
  if (errorInsert || !nuevo) return { error: errorInsert ? mensajeDeBase(errorInsert) : "No pudimos crear al técnico.", valores };

  let aviso = "";
  if (crearCuenta) {
    const cuenta = await crearCuentaDeAcceso(supabase, "provisionar-tecnico", "tecnico_id", nuevo.id);
    aviso = `?aviso=${encodeURIComponent(cuenta.ok ? cuenta.mensaje : `El técnico se creó, pero ${cuenta.mensaje}`)}`;
  }

  refrescarTecnico();
  redirect(`/admin/tecnicos/${nuevo.id}${aviso}`);
}

export async function actualizarTecnico(tecnicoId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, admin, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const basicos = leerBasicos(formData);
  if (!basicos.datos) return { error: basicos.error, valores };

  const { data: actual } = await supabase.from("tecnicos").select("auth_user_id, correo").eq("id", tecnicoId).maybeSingle();
  if (!actual) return { error: "No encontramos al técnico.", valores };

  const cambios: Record<string, string | boolean | null> = {
    ...basicos.datos,
    disponible: formData.get("disponible") === "on",
  };
  // El correo es la llave de su cuenta de acceso: con cuenta creada no se cambia desde aquí.
  if (actual.auth_user_id) cambios.correo = actual.correo;

  // Cédula y certificación solo las toca un superadmin (la base también lo exige).
  if (esSuperadmin(admin)) {
    const doc = documento(formData, "cedula");
    if (doc.error) return { error: doc.error, valores };
    cambios.cedula = doc.valor;
    cambios.certificado = formData.get("certificado") === "on";
  }

  const { error: errorUpdate } = await supabase.from("tecnicos").update(cambios).eq("id", tecnicoId);
  if (errorUpdate) return { error: mensajeDeBase(errorUpdate), valores };

  refrescarTecnico(tecnicoId);
  return { exito: "Cambios guardados." };
}

export async function crearCuentaTecnico(tecnicoId: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;

  const cuenta = await crearCuentaDeAcceso(supabase, "provisionar-tecnico", "tecnico_id", tecnicoId);
  if (!cuenta.ok) return cuenta.mensaje;

  refrescarTecnico(tecnicoId);
  return null;
}

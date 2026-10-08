"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  correoValido,
  crearCuentaDeAcceso,
  documento,
  mensajeDeBase,
  sesionOperador,
  texto,
  valoresDe,
} from "../../admin";
import type { EstadoForm } from "../../tipos";

const TIPOS_SISTEMA = ["doble_filtracion", "ultrafiltracion", "osmosis_inversa", "dispensador", "ozono"];
const ESTATUS = ["nuevo", "activo", "por_vencer", "vencido", "inactivo"];
const ESTADOS_REFERIDO = ["pendiente", "instalado_pagado", "credito_liberado"];

function refrescarCliente(id: string) {
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
}

type DatosCliente = {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  cedula_nit: string | null;
  direccion: string | null;
  ciudad: string;
  tipo_persona: "natural" | "juridica";
  fuente_adquisicion: string | null;
};

// Lee y valida los campos comunes de alta y edición de un cliente.
function leerCliente(formData: FormData): { datos?: DatosCliente; error?: string } {
  const nombre = texto(formData, "nombre");
  if (!nombre) return { error: "El nombre es obligatorio." };

  const correo = texto(formData, "correo")?.toLowerCase() ?? null;
  if (correo && !correoValido(correo)) return { error: "El correo no parece válido." };

  const doc = documento(formData, "cedula_nit");
  if (doc.error) return { error: doc.error };

  const tipo = texto(formData, "tipo_persona") === "juridica" ? "juridica" : "natural";

  return {
    datos: {
      nombre,
      telefono: texto(formData, "telefono"),
      correo,
      cedula_nit: doc.valor,
      direccion: texto(formData, "direccion"),
      ciudad: texto(formData, "ciudad") ?? "Barranquilla",
      tipo_persona: tipo,
      fuente_adquisicion: texto(formData, "fuente_adquisicion"),
    },
  };
}

export async function crearCliente(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const { datos, error: errorDatos } = leerCliente(formData);
  if (!datos) return { error: errorDatos, valores };

  const crearCuenta = formData.get("crear_cuenta") === "on";
  if (crearCuenta && (!datos.correo || !datos.cedula_nit)) {
    return { error: "Para crear la cuenta de acceso hacen falta el correo y la cédula o NIT.", valores };
  }

  const { data: nuevo, error: errorInsert } = await supabase
    .from("clientes")
    .insert(datos)
    .select("id")
    .single();
  if (errorInsert || !nuevo) return { error: errorInsert ? mensajeDeBase(errorInsert) : "No pudimos crear el cliente.", valores };

  let aviso = "";
  if (crearCuenta) {
    const cuenta = await crearCuentaDeAcceso(supabase, "provisionar-cliente", "cliente_id", nuevo.id);
    aviso = `?aviso=${encodeURIComponent(cuenta.ok ? cuenta.mensaje : `El cliente se creó, pero ${cuenta.mensaje}`)}`;
  }

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${nuevo.id}${aviso}`);
}

export async function actualizarCliente(clienteId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const { datos, error: errorDatos } = leerCliente(formData);
  if (!datos) return { error: errorDatos, valores };

  const estatus = texto(formData, "estatus") ?? "nuevo";
  if (!ESTATUS.includes(estatus)) return { error: "Estatus no válido.", valores };

  // El correo es la llave de la cuenta de acceso: con cuenta creada no se cambia desde aquí.
  const { data: actual } = await supabase
    .from("clientes")
    .select("auth_user_id, correo")
    .eq("id", clienteId)
    .maybeSingle();
  if (!actual) return { error: "No encontramos al cliente.", valores };

  const cambios: Record<string, string | null> = { ...datos, estatus };
  if (actual.auth_user_id) cambios.correo = actual.correo;

  const { error: errorUpdate } = await supabase.from("clientes").update(cambios).eq("id", clienteId);
  if (errorUpdate) return { error: mensajeDeBase(errorUpdate), valores };

  refrescarCliente(clienteId);
  return { exito: "Cambios guardados." };
}

export async function crearCuentaCliente(clienteId: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;

  const cuenta = await crearCuentaDeAcceso(supabase, "provisionar-cliente", "cliente_id", clienteId);
  if (!cuenta.ok) return cuenta.mensaje;

  refrescarCliente(clienteId);
  return null;
}

// ---- Equipos ----

function leerEquipo(formData: FormData) {
  const tipo = texto(formData, "tipo") ?? "";
  if (!TIPOS_SISTEMA.includes(tipo)) return { error: "Elige el tipo de equipo." };

  const direccion = texto(formData, "direccion");
  if (!direccion) return { error: "La dirección del equipo es obligatoria." };

  const fecha = texto(formData, "fecha_instalacion");
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "La fecha de instalación no es válida." };

  return { datos: { tipo, direccion, barrio: texto(formData, "barrio"), fecha_instalacion: fecha } };
}

export async function agregarEquipo(clienteId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const { datos, error: errorDatos } = leerEquipo(formData);
  if (!datos) return { error: errorDatos, valores };

  const { error: errorInsert } = await supabase.from("sistemas_instalados").insert({ ...datos, cliente_id: clienteId });
  if (errorInsert) return { error: mensajeDeBase(errorInsert), valores };

  refrescarCliente(clienteId);
  return { exito: "Equipo agregado." };
}

export async function actualizarEquipo(
  equipoId: string,
  clienteId: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const { datos, error: errorDatos } = leerEquipo(formData);
  if (!datos) return { error: errorDatos, valores };

  const { error: errorUpdate } = await supabase.from("sistemas_instalados").update(datos).eq("id", equipoId);
  if (errorUpdate) return { error: mensajeDeBase(errorUpdate), valores };

  refrescarCliente(clienteId);
  return { exito: "Equipo actualizado." };
}

// ---- Retomas y referidos ----

export async function registrarRetoma(clienteId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const marca = texto(formData, "equipo_marca");
  if (!marca) return { error: "Escribe la marca del equipo recibido.", valores };

  const crudo = texto(formData, "bono_aplicado");
  const bono = crudo === null ? null : Number(crudo);
  if (bono !== null && (!Number.isFinite(bono) || bono < 0)) return { error: "El bono no es válido.", valores };

  const { error: errorInsert } = await supabase
    .from("retomas")
    .insert({ cliente_id: clienteId, equipo_marca: marca, bono_aplicado: bono });
  if (errorInsert) return { error: mensajeDeBase(errorInsert), valores };

  refrescarCliente(clienteId);
  return { exito: "Retoma registrada." };
}

export async function registrarReferido(clienteId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const referidoId = texto(formData, "referido_cliente_id");
  if (!referidoId) return { error: "Elige al cliente que fue referido.", valores };
  if (referidoId === clienteId) return { error: "Un cliente no puede referirse a sí mismo.", valores };

  const { error: errorInsert } = await supabase
    .from("referidos")
    .insert({ referente_cliente_id: clienteId, referido_cliente_id: referidoId });
  if (errorInsert) return { error: mensajeDeBase(errorInsert), valores };

  refrescarCliente(clienteId);
  return { exito: "Referido registrado." };
}

export async function cambiarEstadoReferido(referidoId: string, clienteId: string, estado: string): Promise<string | null> {
  const { supabase, error } = await sesionOperador();
  if (error) return error;
  if (!ESTADOS_REFERIDO.includes(estado)) return "Estado no válido.";

  const { data, error: errorUpdate } = await supabase
    .from("referidos")
    .update({ estado, credito_liberado: estado === "credito_liberado" })
    .eq("id", referidoId)
    .select("id");
  if (errorUpdate) return mensajeDeBase(errorUpdate);
  if (!data || data.length === 0) return "No pudimos cambiar el estado.";

  refrescarCliente(clienteId);
  return null;
}

import { createClient } from "@/lib/supabase/server";

export type NivelAdmin = "superadmin" | "operador" | "lector";
export type Admin = { nombre: string; nivel: NivelAdmin };
type Supabase = Awaited<ReturnType<typeof createClient>>;

export const ETIQUETA_NIVEL: Record<NivelAdmin, string> = {
  superadmin: "Superadmin",
  operador: "Operador",
  lector: "Solo lectura",
};

// El admin actual, leído con su propia sesión: la política RLS de `admins`
// deja a cada admin ver su fila. Devuelve null si no hay sesión o no es admin.
export async function obtenerAdmin(supabase: Supabase): Promise<Admin | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("admins")
    .select("nombre, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data as Admin | null) ?? null;
}

export function puedeEscribir(admin: Admin | null): boolean {
  return admin?.nivel === "operador" || admin?.nivel === "superadmin";
}

export function esSuperadmin(admin: Admin | null): boolean {
  return admin?.nivel === "superadmin";
}

// Las políticas RLS rechazan en silencio la escritura de un lector (0 filas
// afectadas), así que el nivel se comprueba antes para dar un mensaje claro.
export async function sesionOperador() {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);
  return {
    supabase,
    admin,
    error: puedeEscribir(admin) ? null : ("Tu nivel de acceso es de solo lectura." as string | null),
  };
}

export async function sesionSuperadmin() {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);
  return {
    supabase,
    admin,
    error: esSuperadmin(admin) ? null : ("Esto solo lo puede hacer un superadmin." as string | null),
  };
}

// ---- Lectura de formularios ----

export function texto(formData: FormData, nombre: string): string | null {
  const valor = String(formData.get(nombre) ?? "").trim();
  return valor === "" ? null : valor;
}

// Cédula o NIT: se aceptan puntos, espacios y guiones al escribirlos, pero se
// guardan solo los dígitos (Siigo y el login por cédula comparan así).
export function documento(formData: FormData, nombre: string): { valor: string | null; error: string | null } {
  const crudo = texto(formData, nombre);
  if (crudo === null) return { valor: null, error: null };
  const limpio = crudo.replace(/[.\s-]/g, "");
  if (!/^\d{5,15}$/.test(limpio)) {
    return { valor: null, error: "La cédula o NIT debe tener entre 5 y 15 dígitos, sin letras." };
  }
  return { valor: limpio, error: null };
}

export function correoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
}

// Devuelve lo que el usuario escribió para repoblar el formulario si hay un
// error (React 19 vacía los campos tras cada envío).
export function valoresDe(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (typeof valor === "string") valores[clave] = valor;
  }
  return valores;
}

// Traduce los errores de la base a mensajes que se entienden.
export function mensajeDeBase(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("cedula")) return "Ya existe un registro con esa cédula o NIT.";
    if (error.message.includes("correo")) return "Ya existe un registro con ese correo.";
    return "Ya existe un registro con esos datos.";
  }
  if (error.code === "42501") return "No tienes permiso para hacer este cambio.";
  return "No pudimos guardar los cambios. Intenta de nuevo.";
}

// Llama a una Edge Function con el token del propio admin (la función verifica
// que sea operador o superadmin).
export async function invocarFuncion(
  supabase: Supabase,
  nombre: string,
  cuerpo: Record<string, string>,
): Promise<{ ok: boolean; mensaje: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, mensaje: "Tu sesión expiró. Vuelve a entrar." };

  const respuesta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${nombre}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  }).catch(() => null);

  if (!respuesta) return { ok: false, mensaje: "No pudimos comunicarnos con el servicio. Intenta de nuevo." };

  const datos = (await respuesta.json().catch(() => ({}))) as { error?: string; warning?: string };
  if (!respuesta.ok) return { ok: false, mensaje: datos.error ?? "Error desconocido." };
  return { ok: true, mensaje: datos.warning ?? "" };
}

// Crea la cuenta de acceso (cliente o técnico) y traduce el resultado.
export async function crearCuentaDeAcceso(
  supabase: Supabase,
  funcion: "provisionar-cliente" | "provisionar-tecnico",
  clave: "cliente_id" | "tecnico_id",
  id: string,
): Promise<{ ok: boolean; mensaje: string }> {
  const resultado = await invocarFuncion(supabase, funcion, { [clave]: id });
  if (!resultado.ok) {
    const amigable = /already|registered|exists/i.test(resultado.mensaje)
      ? "Ya existe una cuenta con ese correo."
      : resultado.mensaje;
    return { ok: false, mensaje: `No se pudo crear la cuenta: ${amigable}` };
  }
  return {
    ok: true,
    mensaje:
      resultado.mensaje ||
      "Cuenta creada. Le enviamos un correo para confirmar su dirección; su contraseña inicial es su cédula.",
  };
}

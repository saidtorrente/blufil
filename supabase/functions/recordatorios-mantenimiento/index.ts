import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Recordatorio por correo, 7 dias antes del mantenimiento (6 meses desde el
// ultimo servicio). La llama el reloj de la base de datos (pg_cron) todos los
// dias; solo envia si el interruptor `ajustes_seguimiento.enviar_recordatorios`
// esta encendido, a lo sumo una vez por tarjeta y con un tope por corrida.

const REMITENTE = "notificaciones@blufil.com";
const LOGO_URL = "https://portal.blufil.com/logo-blufil.png";
const AZUL_MARCA = "#123C5B";
const CIAN_MARCA = "#1EBBEB";
const DIAS_ANTES = 7;
const DIAS_MAXIMOS_VENCIDO = 30; // no se avisa por tarjetas viejas
const MAX_CLIENTES_POR_CORRIDA = 40;

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble Filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis Inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de Ozono",
};

// ---- Quien llama -----------------------------------------------------------
// Esta funcion no usa verify_jwt: la llama el reloj de la base de datos con un
// secreto guardado en Vault, o un admin operador+ con su propio token.

function rolDelJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function llamantePermitido(admin: ReturnType<typeof createClient>, req: Request): Promise<boolean | null> {
  const secretoCron = req.headers.get("x-cron-secret");
  if (secretoCron) {
    const { data } = await admin.rpc("obtener_secreto", { nombre: "cron_sincronizacion" });
    return typeof data === "string" && data.length > 0 && iguales(secretoCron, data);
  }
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  if (rolDelJwt(jwt) === "service_role") return true;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  const { data: fila, error: errAdmin } = await admin
    .from("admins")
    .select("nivel")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (errAdmin || !fila) return false;
  return fila.nivel === "operador" || fila.nivel === "superadmin";
}

function respuesta(cuerpo: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const formatoFechaLarga = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});

function fechaLarga(fecha: string): string {
  return formatoFechaLarga.format(new Date(`${fecha}T12:00:00-05:00`));
}

function plantillaRecordatorio(nombre: string, equipos: { etiqueta: string; fecha: string; vencido: boolean }[]): string {
  const primerNombre = escapar(nombre.trim().split(/\s+/)[0] ?? "");
  const unico = equipos.length === 1;
  const filas = equipos
    .map(
      (e) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #eef2f5;"><p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${escapar(e.etiqueta)}</p>` +
        `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${e.vencido ? "Su mantenimiento ya le toca" : "Le toca mantenimiento el " + escapar(fechaLarga(e.fecha))}</p></td></tr>`,
    )
    .join("");

  // Todo en una sola linea a proposito: denomailer codifica el HTML en
  // quoted-printable y las lineas vacias de un template multi-linea se
  // filtran como "=20" en el correo recibido.
  return (
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f5f9fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f9fb;padding:32px 16px;"><tr><td align="center">` +
    `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">` +
    `<tr><td style="background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #eef2f5;"><img src="${LOGO_URL}" alt="Blufil" width="120" style="display:block;" /></td></tr>` +
    `<tr><td style="padding:32px;">` +
    `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">Recordatorio de mantenimiento</p>` +
    `<h1 style="margin:0 0 16px;font-size:20px;color:${AZUL_MARCA};">${primerNombre ? "Hola, " + primerNombre : "Hola"}</h1>` +
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#374151;">${unico ? "Tu equipo Blufil está por cumplir" : "Tus equipos Blufil están por cumplir"} el tiempo de su mantenimiento. Hacerlo a tiempo mantiene tu agua en las mejores condiciones y conserva tu nivel de descuento del Club Blufil.</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef2f5;">${filas}</table>` +
    `<a href="https://portal.blufil.com/dashboard/equipos" style="display:inline-block;margin-top:28px;background-color:${AZUL_MARCA};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">Solicitar mantenimiento</a>` +
    `<p style="margin:20px 0 0;font-size:13px;color:#6b7280;">También puedes escribirnos por WhatsApp y lo agendamos contigo.</p>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 32px;background-color:#f5f9fb;"><p style="margin:0;font-size:12px;color:#9ca3af;">Blufil &middot; Aviso automático, no responder a este correo.</p></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const permitido = await llamantePermitido(admin, req);
  if (permitido === null) return respuesta({ error: "no_autenticado" }, 401);
  if (!permitido) return respuesta({ error: "no_autorizado" }, 403);

  const { data: ajustes } = await admin.from("ajustes_seguimiento").select("enviar_recordatorios").maybeSingle();
  if (!ajustes?.enviar_recordatorios) return respuesta({ status: "apagado" }, 200);

  const smtpPassword = Deno.env.get("notificaciones_smtp_password");
  if (!smtpPassword) return respuesta({ error: "falta el secreto notificaciones_smtp_password" }, 503);

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const sumarDias = (fecha: string, dias: number) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };

  const { data: tarjetas, error } = await admin
    .from("seguimientos")
    .select("id, fecha_objetivo, cliente_id, clientes(nombre, correo), sistemas_instalados(tipo, barrio)")
    .eq("tipo", "mantenimiento")
    .is("cerrado_at", null)
    .is("recordatorio_enviado_at", null)
    .in("etapa", ["por_vencer", "contactado", "sin_respuesta"])
    .lte("fecha_objetivo", sumarDias(hoy, DIAS_ANTES))
    .gte("fecha_objetivo", sumarDias(hoy, -DIAS_MAXIMOS_VENCIDO))
    .order("fecha_objetivo");
  if (error) return respuesta({ error: "no se pudo leer el seguimiento", detalle: error.message }, 500);

  // Un solo correo por cliente, con todos sus equipos.
  type Tarjeta = NonNullable<typeof tarjetas>[number];
  const porCliente = new Map<string, Tarjeta[]>();
  for (const t of tarjetas ?? []) {
    const cliente = Array.isArray(t.clientes) ? t.clientes[0] : t.clientes;
    if (!cliente?.correo) continue;
    porCliente.set(t.cliente_id, [...(porCliente.get(t.cliente_id) ?? []), t]);
  }

  const client = new SMTPClient({
    connection: { hostname: "smtp.hostinger.com", port: 465, tls: true, auth: { username: REMITENTE, password: smtpPassword } },
  });

  let enviados = 0;
  const fallos: string[] = [];
  try {
    for (const [, grupo] of [...porCliente.entries()].slice(0, MAX_CLIENTES_POR_CORRIDA)) {
      const cliente = Array.isArray(grupo[0].clientes) ? grupo[0].clientes[0] : grupo[0].clientes;
      if (!cliente?.correo) continue;
      const equipos = grupo.map((t) => {
        const sistema = Array.isArray(t.sistemas_instalados) ? t.sistemas_instalados[0] : t.sistemas_instalados;
        return {
          etiqueta: `${ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? sistema?.tipo ?? "Equipo"}${sistema?.barrio ? " · " + sistema.barrio : ""}`,
          fecha: t.fecha_objetivo as string,
          vencido: (t.fecha_objetivo as string) < hoy,
        };
      });
      try {
        await client.send({
          from: `Blufil <${REMITENTE}>`,
          to: [cliente.correo],
          subject: equipos.length === 1 ? "Es hora del mantenimiento de tu equipo Blufil" : "Es hora del mantenimiento de tus equipos Blufil",
          html: plantillaRecordatorio(cliente.nombre ?? "", equipos),
          content: "auto",
        });
        const ids = grupo.map((t) => t.id);
        await admin.from("seguimientos").update({ recordatorio_enviado_at: new Date().toISOString() }).in("id", ids);
        await admin.from("contactos_seguimiento").insert(
          ids.map((id) => ({ seguimiento_id: id, canal: "correo", nota: "Recordatorio automático enviado por correo." })),
        );
        enviados++;
      } catch (err) {
        fallos.push(`${grupo[0].cliente_id}: ${String(err).slice(0, 120)}`);
      }
    }
  } finally {
    try {
      await client.close();
    } catch {
      // cerrar la conexion no debe tumbar la respuesta
    }
  }

  return respuesta({ status: "ok", enviados, fallos }, 200);
});

import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Avisos de la agenda de visitas:
//  - evento "confirmada": la visita quedo programada -> correo al cliente y al tecnico.
//  - evento "propuesta": el tecnico propuso una hora -> correo al administrador.
// Quien llama debe ser un admin operador+ (confirmada o propuesta) o el tecnico del servicio (propuesta).

const REMITENTE = "notificaciones@blufil.com";
const LOGO_URL = "https://portal.blufil.com/logo-blufil.png";
const AZUL_MARCA = "#123C5B";
const CIAN_MARCA = "#1EBBEB";
const DESTINATARIO_ADMIN = "saidtorrente@gmail.com";

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble Filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis Inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de Ozono",
};
const ETIQUETA_TIPO: Record<string, string> = { instalacion: "Instalación", mantenimiento: "Mantenimiento" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rolDelJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}

function respuesta(cuerpo: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const formatoDia = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});
const formatoHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

function fila(etiqueta: string, valor: string): string {
  return `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:110px;vertical-align:top;">${etiqueta}</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${valor}</td></tr>`;
}

function plantilla(params: { antetitulo: string; titulo: string; intro: string; filas: string; textoBoton: string; urlBoton: string }): string {
  // Todo en una sola linea a proposito (ver nota en notificar-solicitud: denomailer + quoted-printable).
  return (
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f5f9fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f9fb;padding:32px 16px;"><tr><td align="center">` +
    `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">` +
    `<tr><td style="background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #eef2f5;"><img src="${LOGO_URL}" alt="Blufil" width="120" style="display:block;" /></td></tr>` +
    `<tr><td style="padding:32px;">` +
    `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">${params.antetitulo}</p>` +
    `<h1 style="margin:0 0 16px;font-size:20px;color:${AZUL_MARCA};">${params.titulo}</h1>` +
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#374151;">${params.intro}</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef2f5;">${params.filas}</table>` +
    `<a href="${params.urlBoton}" style="display:inline-block;margin-top:28px;background-color:${AZUL_MARCA};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${params.textoBoton}</a>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 32px;background-color:#f5f9fb;"><p style="margin:0;font-size:12px;color:#9ca3af;">Blufil · Aviso automático del portal, no responder a este correo.</p></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  let body: { servicio_id?: string; evento?: string };
  try {
    body = await req.json();
  } catch {
    return respuesta({ error: "body_invalido" }, 400);
  }
  if (!body.servicio_id || !UUID.test(body.servicio_id) || !["confirmada", "propuesta"].includes(body.evento ?? "")) {
    return respuesta({ error: "datos no validos" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ---- Quien llama ----
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || rolDelJwt(jwt) === "anon") return respuesta({ error: "no_autenticado" }, 401);
  const { data: sesion, error: errSesion } = await admin.auth.getUser(jwt);
  if (errSesion || !sesion.user) return respuesta({ error: "no_autenticado" }, 401);
  const userId = sesion.user.id;

  const { data: servicio } = await admin
    .from("servicios")
    .select(
      "id, numero_orden, tipo, estado, tecnico_id, inicio_programado, duracion_minutos, agenda_estado, tecnicos(nombre, correo, auth_user_id), sistemas_instalados(tipo, direccion, barrio, clientes(nombre, correo, telefono, ciudad))",
    )
    .eq("id", body.servicio_id)
    .maybeSingle();
  if (!servicio) return respuesta({ error: "servicio no encontrado" }, 404);

  const tecnico = Array.isArray(servicio.tecnicos) ? servicio.tecnicos[0] : servicio.tecnicos;
  const { data: filaAdmin } = await admin.from("admins").select("nivel").eq("auth_user_id", userId).maybeSingle();
  const esAdminOperador = filaAdmin?.nivel === "operador" || filaAdmin?.nivel === "superadmin";
  const esSuTecnico = Boolean(tecnico?.auth_user_id) && tecnico?.auth_user_id === userId;
  if (!(esAdminOperador || (body.evento === "propuesta" && esSuTecnico))) {
    return respuesta({ error: "no_autorizado" }, 403);
  }
  if (!servicio.inicio_programado || servicio.agenda_estado !== body.evento) {
    return respuesta({ error: "la agenda del servicio no esta en ese estado" }, 409);
  }

  const smtpPassword = Deno.env.get("notificaciones_smtp_password");
  if (!smtpPassword) return respuesta({ warning: "no hay notificaciones_smtp_password configurada como Edge Function Secret" }, 200);

  const sistema = Array.isArray(servicio.sistemas_instalados) ? servicio.sistemas_instalados[0] : servicio.sistemas_instalados;
  const cliente = sistema ? (Array.isArray(sistema.clientes) ? sistema.clientes[0] : sistema.clientes) : null;
  const inicio = new Date(servicio.inicio_programado);
  const fin = new Date(inicio.getTime() + servicio.duracion_minutos * 60000);
  const dia = escapar(formatoDia.format(inicio));
  const horario = `${formatoHora.format(inicio)} – ${formatoHora.format(fin)}`;
  const tipo = ETIQUETA_TIPO[servicio.tipo] ?? servicio.tipo;
  const equipo = ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? sistema?.tipo ?? "equipo";
  const orden = `BLF-${String(servicio.numero_orden).padStart(6, "0")}`;

  const mensajes: { to: string; subject: string; html: string }[] = [];

  if (body.evento === "confirmada") {
    if (cliente?.correo) {
      mensajes.push({
        to: cliente.correo,
        subject: `Tu visita de Blufil: ${dia}`,
        html: plantilla({
          antetitulo: "Visita programada",
          titulo: `${tipo} · ${equipo}`,
          intro: `Hola${cliente.nombre ? ", " + escapar(cliente.nombre.trim().split(/\s+/)[0]) : ""}. Programamos la visita a tu equipo. Si necesitas cambiarla, escríbenos por WhatsApp.`,
          filas:
            fila("Día", dia) +
            fila("Hora", escapar(horario)) +
            (tecnico?.nombre ? fila("Técnico", escapar(tecnico.nombre)) : "") +
            fila("Dirección", escapar(sistema?.direccion ?? "")) +
            fila("Orden", orden),
          textoBoton: "Ver mis equipos",
          urlBoton: "https://portal.blufil.com/dashboard/equipos",
        }),
      });
    }
    if (tecnico?.correo) {
      mensajes.push({
        to: tecnico.correo,
        subject: `Visita programada: ${dia}, ${formatoHora.format(inicio)}`,
        html: plantilla({
          antetitulo: "Tienes una visita",
          titulo: `${tipo} · ${equipo}`,
          intro: "Quedó confirmada en tu agenda.",
          filas:
            fila("Día", dia) +
            fila("Hora", escapar(horario)) +
            fila("Cliente", escapar(cliente?.nombre ?? "")) +
            fila("Teléfono", escapar(cliente?.telefono ?? "sin teléfono")) +
            fila("Dirección", escapar(sistema?.direccion ?? "")) +
            fila("Orden", orden),
          textoBoton: "Ver mi agenda",
          urlBoton: "https://portal.blufil.com/tecnico/agenda",
        }),
      });
    }
  } else {
    mensajes.push({
      to: DESTINATARIO_ADMIN,
      subject: `Hora propuesta por ${tecnico?.nombre ?? "un técnico"} para ${orden}`,
      html: plantilla({
        antetitulo: "Por confirmar",
        titulo: `${tipo} · ${equipo}`,
        intro: `${escapar(tecnico?.nombre ?? "El técnico")} propone una hora para esta visita. Confírmala en el panel o cámbiala si no le sirve al cliente.`,
        filas:
          fila("Día", dia) +
          fila("Hora", escapar(horario)) +
          fila("Cliente", escapar(cliente?.nombre ?? "")) +
          fila("Teléfono", escapar(cliente?.telefono ?? "sin teléfono")) +
          fila("Orden", orden),
        textoBoton: "Abrir la agenda",
        urlBoton: "https://portal.blufil.com/admin/agenda",
      }),
    });
  }

  if (mensajes.length === 0) return respuesta({ status: "ok", enviados: 0, warning: "no hay correos a quien avisar" }, 200);

  const client = new SMTPClient({
    connection: { hostname: "smtp.hostinger.com", port: 465, tls: true, auth: { username: REMITENTE, password: smtpPassword } },
  });
  const fallos: string[] = [];
  let enviados = 0;
  try {
    for (const m of mensajes) {
      try {
        await client.send({ from: `Blufil <${REMITENTE}>`, to: [m.to], subject: m.subject, html: m.html, content: "auto" });
        enviados++;
      } catch (err) {
        fallos.push(String(err).slice(0, 120));
      }
    }
  } finally {
    try {
      await client.close();
    } catch {
      // cerrar la conexion no debe tumbar la respuesta
    }
  }

  return respuesta(
    { status: "ok", enviados, ...(fallos.length > 0 ? { warning: "algunos correos no salieron", detalle: fallos } : {}) },
    200,
  );
});

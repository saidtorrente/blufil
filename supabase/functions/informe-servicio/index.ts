import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Informe de servicio por correo: al completarse un servicio el cliente recibe un resumen
// (lo que se hizo, repuestos y filtros cambiados, proximo mantenimiento con su beneficio del
// Club Blufil) y un enlace al informe completo en el portal. Lo dispara el tecnico al cerrar
// el servicio o un admin operador+ para reenviarlo.

const REMITENTE = "notificaciones@blufil.com";
const LOGO_URL = "https://portal.blufil.com/logo-blufil.png";
const AZUL_MARCA = "#123C5B";
const CIAN_MARCA = "#1EBBEB";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble Filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis Inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de Ozono",
};
const ETIQUETA_TIPO: Record<string, string> = { instalacion: "Instalación", mantenimiento: "Mantenimiento" };

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

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

function fechaDeDia(fecha: string): string {
  return formatoFecha.format(new Date(`${fecha}T12:00:00-05:00`));
}

function seccion(titulo: string, contenido: string): string {
  return (
    `<tr><td style="padding:18px 0 0;">` +
    `<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">${titulo}</p>` +
    contenido +
    `</td></tr>`
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  let body: { servicio_id?: string };
  try {
    body = await req.json();
  } catch {
    return respuesta({ error: "body_invalido" }, 400);
  }
  if (!body.servicio_id || !UUID.test(body.servicio_id)) return respuesta({ error: "servicio_id no valido" }, 400);

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
      "id, numero_orden, tipo, estado, completada_at, reporte_ia, descuento_aplicado, sistema_instalado_id, tecnicos(nombre, auth_user_id), sistemas_instalados(tipo, barrio, direccion, clientes(nombre, correo))",
    )
    .eq("id", body.servicio_id)
    .maybeSingle();
  if (!servicio) return respuesta({ error: "servicio no encontrado" }, 404);

  const tecnico = Array.isArray(servicio.tecnicos) ? servicio.tecnicos[0] : servicio.tecnicos;
  const { data: filaAdmin } = await admin.from("admins").select("nivel").eq("auth_user_id", userId).maybeSingle();
  const esAdminOperador = filaAdmin?.nivel === "operador" || filaAdmin?.nivel === "superadmin";
  const esSuTecnico = Boolean(tecnico?.auth_user_id) && tecnico?.auth_user_id === userId;
  if (!(esAdminOperador || esSuTecnico)) return respuesta({ error: "no_autorizado" }, 403);
  if (servicio.estado !== "completada") return respuesta({ error: "el servicio todavia no esta completado" }, 409);

  const sistema = Array.isArray(servicio.sistemas_instalados) ? servicio.sistemas_instalados[0] : servicio.sistemas_instalados;
  const cliente = sistema ? (Array.isArray(sistema.clientes) ? sistema.clientes[0] : sistema.clientes) : null;
  if (!cliente?.correo) return respuesta({ status: "ok", enviado: false, warning: "el cliente no tiene correo registrado" }, 200);

  const smtpPassword = Deno.env.get("notificaciones_smtp_password");
  if (!smtpPassword) return respuesta({ error: "falta el secreto notificaciones_smtp_password" }, 503);

  // ---- Datos del informe ----
  const { data: productos } = await admin
    .from("servicio_productos")
    .select("cantidad, productos(nombre)")
    .eq("servicio_id", servicio.id);
  const { data: proximoFila } = await admin
    .from("proximo_mantenimiento")
    .select("proximo_mantenimiento")
    .eq("sistema_instalado_id", servicio.sistema_instalado_id)
    .maybeSingle();
  const { data: clubFila } = await admin.rpc("club_proximo_mantenimiento", { p_sistema: servicio.sistema_instalado_id });
  const club = (Array.isArray(clubFila) ? clubFila[0] : clubFila) as
    | { descuento: number; descuento_siguiente: number; numero: number; racha_hasta: string | null; racha_vencida: boolean }
    | null;

  const equipo = ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? sistema?.tipo ?? "equipo";
  const tipo = ETIQUETA_TIPO[servicio.tipo] ?? servicio.tipo;
  const fecha = servicio.completada_at
    ? fechaDeDia(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(servicio.completada_at)))
    : "";
  const primerNombre = escapar((cliente.nombre ?? "").trim().split(/\s+/)[0] ?? "");
  const enlace = `https://portal.blufil.com/dashboard/servicios/${servicio.id}`;

  const notas = servicio.reporte_ia
    ? `<p style="margin:0;font-size:14px;line-height:1.55;color:#374151;">${escapar(servicio.reporte_ia).replace(/\n/g, "<br>")}</p>`
    : `<p style="margin:0;font-size:14px;color:#6b7280;">Sin notas adicionales.</p>`;

  const listaProductos = (productos ?? [])
    .map((p) => {
      const producto = Array.isArray(p.productos) ? p.productos[0] : p.productos;
      return `<li style="margin:0 0 4px;font-size:14px;color:#374151;">${escapar(producto?.nombre ?? "Repuesto")} &times; ${Number(p.cantidad)}</li>`;
    })
    .join("");
  const seccionProductos = listaProductos
    ? seccion("Repuestos y filtros cambiados", `<ul style="margin:0;padding-left:18px;">${listaProductos}</ul>`)
    : "";

  let seccionProximo = "";
  if (proximoFila?.proximo_mantenimiento) {
    let beneficio = "";
    if (club) {
      const texto = club.descuento > 0
        ? `<strong>${club.descuento}% de descuento</strong> del Club Blufil en tu próximo mantenimiento (el #${club.numero} de tu racha).`
        : `Tu próximo mantenimiento ya suma en el Club Blufil: a partir del siguiente tendrás <strong>${club.descuento_siguiente}% de descuento</strong>.`;
      beneficio =
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;background-color:#eaf7fb;border-radius:8px;"><tr>` +
        `<td style="padding:12px 16px;width:84px;font-size:28px;font-weight:700;color:${AZUL_MARCA};">${club.descuento > 0 ? club.descuento + "%" : club.descuento_siguiente + "%"}</td>` +
        `<td style="padding:12px 16px 12px 0;font-size:13px;line-height:1.4;color:#374151;">${texto}</td></tr></table>`;
    }
    seccionProximo = seccion(
      "Tu próximo mantenimiento",
      `<p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${escapar(fechaDeDia(proximoFila.proximo_mantenimiento))}</p>` +
        `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Te lo recordaremos por correo con anticipación.</p>` +
        beneficio,
    );
  }

  // Todo en una sola linea a proposito (ver nota en notificar-solicitud: denomailer + quoted-printable).
  const html =
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f5f9fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f9fb;padding:32px 16px;"><tr><td align="center">` +
    `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">` +
    `<tr><td style="background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #eef2f5;"><img src="${LOGO_URL}" alt="Blufil" width="120" style="display:block;" /></td></tr>` +
    `<tr><td style="padding:32px;">` +
    `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">Informe de servicio</p>` +
    `<h1 style="margin:0 0 6px;font-size:21px;color:${AZUL_MARCA};">${escapar(tipo)} · ${escapar(equipo)}</h1>` +
    `<p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${primerNombre ? "Hola, " + primerNombre + ". " : ""}Terminamos el servicio de tu equipo. Este es el resumen:</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    seccion(
      "Resumen",
      `<p style="margin:0;font-size:14px;color:#374151;">${escapar(fecha)}</p>` +
        (tecnico?.nombre ? `<p style="margin:2px 0 0;font-size:14px;color:#374151;">Técnico: ${escapar(tecnico.nombre)}</p>` : "") +
        `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Orden BLF-${String(servicio.numero_orden).padStart(6, "0")}</p>`,
    ) +
    seccion("Lo que hicimos", notas) +
    seccionProductos +
    seccionProximo +
    `</table>` +
    `<a href="${enlace}" style="display:inline-block;margin-top:26px;background-color:${AZUL_MARCA};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">Ver el informe completo</a>` +
    `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">En el portal encuentras las fotos del servicio, el detalle de lo realizado y la información de tu próximo mantenimiento.</p>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 32px;background-color:#f5f9fb;"><p style="margin:0;font-size:12px;color:#9ca3af;">Blufil &middot; Informe automático del portal, no responder a este correo.</p></td></tr>` +
    `</table></td></tr></table></body></html>`;

  const client = new SMTPClient({
    connection: { hostname: "smtp.hostinger.com", port: 465, tls: true, auth: { username: REMITENTE, password: smtpPassword } },
  });
  try {
    await client.send({
      from: `Blufil <${REMITENTE}>`,
      to: [cliente.correo],
      subject: "Tu informe de servicio Blufil",
      html,
      content: "auto",
    });
  } catch (err) {
    return respuesta({ status: "ok", enviado: false, warning: "no se pudo enviar el correo", detalle: String(err).slice(0, 160) }, 200);
  } finally {
    try {
      await client.close();
    } catch {
      // cerrar la conexion no debe tumbar la respuesta
    }
  }

  await admin.from("servicios").update({ informe_enviado_at: new Date().toISOString() }).eq("id", servicio.id);
  return respuesta({ status: "ok", enviado: true }, 200);
});

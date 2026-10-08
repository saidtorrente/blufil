import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const REMITENTE = "notificaciones@blufil.com";
const LOGO_URL = "https://portal.blufil.com/logo-blufil.png";
const AZUL_MARCA = "#123C5B";
const CIAN_MARCA = "#1EBBEB";

// Correo admin fijo -- recibe el detalle completo (incluye datos del
// cliente). Los tecnicos NO -- ver nota mas abajo.
const DESTINATARIO_ADMIN = "saidtorrente@gmail.com";

// ---- Quien llama -----------------------------------------------------------
// verify_jwt solo comprueba que el token sea valido, y la anon key (publica)
// lo es. Por eso aqui se identifica al usuario real detras del token.

function rolDelJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}

async function identificarLlamante(
  admin: ReturnType<typeof createClient>,
  req: Request,
): Promise<{ esServicio: boolean; userId: string | null } | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  // La firma ya la valido verify_jwt; aqui solo se lee el rol del token.
  if (rolDelJwt(jwt) === "service_role") return { esServicio: true, userId: null };
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { esServicio: false, userId: data.user.id };
}

// Admin con permiso de escritura (operador o superadmin). Si la tabla
// `admins` todavia no existe (antes de la Fase 2) la consulta falla y se
// trata como "no es admin".
async function esAdminOperador(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("admins").select("nivel").eq("auth_user_id", userId).maybeSingle();
  if (error || !data) return false;
  return data.nivel === "operador" || data.nivel === "superadmin";
}

// Correos de tecnicos disponibles/certificados que tambien deben enterarse
// de la solicitud. Filtra por ciudad cuando la visita tiene una ciudad
// conocida y el tecnico ya completo la suya en su perfil -- un tecnico sin
// ciudad definida todavia sigue recibiendo avisos de todas formas.
async function correosTecnicos(
  admin: ReturnType<typeof createClient>,
  ciudad: string | null,
): Promise<string[]> {
  const { data: tecnicos } = await admin
    .from("tecnicos")
    .select("correo, ciudad")
    .eq("disponible", true)
    .eq("certificado", true)
    .not("correo", "is", null);

  return (tecnicos ?? [])
    .filter((t) => !ciudad || !t.ciudad || t.ciudad === ciudad)
    .map((t) => t.correo as string);
}

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble Filtracion",
  ultrafiltracion: "Ultrafiltracion",
  osmosis_inversa: "Osmosis Inversa",
  dispensador: "Dispensador sin botellon",
  ozono: "Purificador de Ozono",
};

const ETIQUETA_TIPO: Record<string, string> = {
  instalacion: "Instalacion",
  mantenimiento: "Mantenimiento",
};

// Icono por tipo de sistema -- mismo set de SVGs que ya usa el dashboard
// del portal (portal/public/sistemas/*.svg), para que el tecnico reconozca
// de un vistazo que equipo va a atender.
function iconoSistemaUrl(tipoSistema: string | undefined): string | null {
  if (!tipoSistema || !ETIQUETA_SISTEMA[tipoSistema]) return null;
  return `https://portal.blufil.com/sistemas/${tipoSistema}.svg`;
}

function filaDetalle(etiqueta: string, valor: string): string {
  return `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;vertical-align:top;">${etiqueta}</td><td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${valor}</td></tr>`;
}

function plantillaCorreo(params: {
  tipoEtiqueta: string;
  sistemaEtiqueta: string;
  iconoUrl: string | null;
  filas: string;
  textoBoton: string;
}): string {
  const { tipoEtiqueta, sistemaEtiqueta, iconoUrl, filas, textoBoton } = params;
  const titulo = tipoEtiqueta + (sistemaEtiqueta ? " &middot; " + sistemaEtiqueta : "");

  const encabezadoConIcono = iconoUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
      `<td style="width:56px;vertical-align:top;"><img src="${iconoUrl}" width="48" height="48" alt="" style="display:block;" /></td>` +
      `<td style="vertical-align:top;padding-top:2px;">` +
      `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">Nueva solicitud</p>` +
      `<h1 style="margin:0;font-size:20px;color:${AZUL_MARCA};">${titulo}</h1>` +
      `</td></tr></table>`
    : `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">Nueva solicitud</p>` +
      `<h1 style="margin:0 0 20px;font-size:20px;color:${AZUL_MARCA};">${titulo}</h1>`;

  // Todo en una sola linea a proposito: denomailer codifica el HTML en
  // quoted-printable, y las lineas en blanco / con solo espacios que deja
  // un template literal multi-linea se filtran como texto literal "=20"
  // en el correo recibido (bug de esa codificacion con lineas vacias).
  return (
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f5f9fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f9fb;padding:32px 16px;"><tr><td align="center">` +
    `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">` +
    `<tr><td style="background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #eef2f5;"><img src="${LOGO_URL}" alt="Blufil" width="120" style="display:block;" /></td></tr>` +
    `<tr><td style="padding:32px;">` +
    encabezadoConIcono +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #eef2f5;">${filas}</table>` +
    `<a href="https://portal.blufil.com/tecnico/dashboard" style="display:inline-block;margin-top:28px;background-color:${AZUL_MARCA};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">${textoBoton}</a>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 32px;background-color:#f5f9fb;"><p style="margin:0;font-size:12px;color:#9ca3af;">Blufil &middot; Aviso automatico del portal, no responder a este correo.</p></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  let body: { visita_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "body_invalido" }), { status: 400 });
  }
  if (!body.visita_id) {
    return new Response(JSON.stringify({ error: "visita_id requerido" }), { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const llamante = await identificarLlamante(admin, req);
  if (!llamante) {
    return new Response(JSON.stringify({ error: "no_autenticado" }), { status: 401 });
  }

  const { data: visita } = await admin
    .from("visitas")
    .select(
      "id, estado, clientes(nombre, telefono, ciudad, auth_user_id), servicios(tipo, sistemas_instalados(tipo, direccion, barrio))",
    )
    .eq("id", body.visita_id)
    .maybeSingle();

  if (!visita) {
    return new Response(JSON.stringify({ error: "visita no encontrada" }), { status: 404 });
  }

  const cliente = Array.isArray(visita.clientes) ? visita.clientes[0] : visita.clientes;

  // Solo el dueno de la visita o un admin pueden disparar el aviso.
  const permitido =
    llamante.esServicio ||
    (llamante.userId !== null && cliente?.auth_user_id === llamante.userId) ||
    (llamante.userId !== null && (await esAdminOperador(admin, llamante.userId)));
  if (!permitido) {
    return new Response(JSON.stringify({ error: "no_autorizado" }), { status: 403 });
  }

  // Solo se avisa de solicitudes que siguen esperando tecnico.
  if (visita.estado !== "pendiente") {
    return new Response(JSON.stringify({ error: "la visita ya no esta pendiente" }), { status: 409 });
  }

  const servicios = Array.isArray(visita.servicios) ? visita.servicios : [visita.servicios].filter(Boolean);
  const servicio = servicios[0];
  const sistema = servicio
    ? Array.isArray(servicio.sistemas_instalados)
      ? servicio.sistemas_instalados[0]
      : servicio.sistemas_instalados
    : null;

  const tipoEtiqueta = servicio ? ETIQUETA_TIPO[servicio.tipo] ?? servicio.tipo : "Servicio";
  const sistemaEtiqueta = sistema ? ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo : "";
  const iconoUrl = iconoSistemaUrl(sistema?.tipo);
  const direccion = sistema?.direccion ?? "(sin direccion)";
  const ubicacionAproximada =
    [sistema?.barrio, cliente?.ciudad].filter(Boolean).join(", ") || "(ubicacion por confirmar)";

  // El admin ve el detalle completo del cliente. Los tecnicos que reciben
  // el aviso todavia NO tienen el servicio asignado -- puede que ni lo
  // acepten -- asi que no reciben nombre, telefono ni direccion exacta del
  // cliente, solo barrio/ciudad para decidir si les conviene ir. El detalle
  // completo lo ven dentro del portal recien cuando aceptan el servicio
  // (misma regla que ya aplica en el dashboard y en la pagina del servicio).
  const htmlAdmin = plantillaCorreo({
    tipoEtiqueta,
    sistemaEtiqueta,
    iconoUrl,
    filas: [
      filaDetalle("Cliente", cliente?.nombre ?? "(sin nombre)"),
      filaDetalle("Telefono", cliente?.telefono ?? "(sin telefono)"),
      filaDetalle("Direccion", direccion),
    ].join(""),
    textoBoton: "Ver en el panel de tecnicos",
  });

  const htmlTecnicos = plantillaCorreo({
    tipoEtiqueta,
    sistemaEtiqueta,
    iconoUrl,
    filas: filaDetalle("Zona", ubicacionAproximada),
    textoBoton: "Ver y aceptar en el panel",
  });

  // El secreto vive como Edge Function Secret (variable de entorno), no en
  // el Vault de la base de datos -- se guardo ahi directamente desde el
  // dashboard de Supabase (Project Settings > Edge Functions > Secrets).
  const smtpPassword = Deno.env.get("notificaciones_smtp_password");

  if (!smtpPassword) {
    return new Response(
      JSON.stringify({ warning: "solicitud registrada, pero no hay notificaciones_smtp_password configurada como Edge Function Secret" }),
      { status: 200 },
    );
  }

  const correosParaTecnicos = await correosTecnicos(admin, cliente?.ciudad ?? null);
  const asunto = `Nueva solicitud: ${tipoEtiqueta}${sistemaEtiqueta ? " - " + sistemaEtiqueta : ""}`;

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.hostinger.com",
        port: 465,
        tls: true,
        auth: { username: REMITENTE, password: smtpPassword },
      },
    });

    await client.send({
      from: `Blufil <${REMITENTE}>`,
      to: [DESTINATARIO_ADMIN],
      subject: asunto,
      html: htmlAdmin,
      content: "auto",
    });

    if (correosParaTecnicos.length > 0) {
      await client.send({
        from: `Blufil <${REMITENTE}>`,
        to: correosParaTecnicos,
        subject: asunto,
        html: htmlTecnicos,
        content: "auto",
      });
    }

    await client.close();
  } catch (err) {
    return new Response(
      JSON.stringify({ warning: "solicitud registrada, pero fallo el envio del correo", detalle: String(err) }),
      { status: 200 },
    );
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

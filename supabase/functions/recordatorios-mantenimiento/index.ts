import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Secuencia de recordatorios de mantenimiento por correo: 15, 10 y 5 dias antes y
// el dia del vencimiento (4 correos como maximo por equipo, nunca diarios). La
// llama el reloj de la base de datos (pg_cron) todos los dias a las 8:00 a. m.;
// solo envia si `ajustes_seguimiento.enviar_recordatorios` esta encendido.
// Cada mensaje busca que el cliente agende e incluye el descuento del Club Blufil.

const REMITENTE = "notificaciones@blufil.com";
const LOGO_URL = "https://portal.blufil.com/logo-blufil.png";
const AZUL_MARCA = "#123C5B";
const CIAN_MARCA = "#1EBBEB";
const PASOS = [15, 10, 5, 0];
const DIAS_MAXIMOS_VENCIDO = 30; // no se insiste por tarjetas viejas
const MAX_CLIENTES_POR_CORRIDA = 40;

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble Filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis Inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de Ozono",
};

// ---- Quien llama -----------------------------------------------------------
// Esta funcion no usa verify_jwt: la llaman el reloj de la base de datos con un
// secreto de Vault, o un admin operador+ con su propio token.

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

// ---- Contenido de cada paso ---------------------------------------------------

type Club = {
  descuento: number;
  descuento_siguiente: number;
  numero: number;
  racha_hasta: string | null;
  racha_vencida: boolean;
};

type Equipo = { etiqueta: string; fecha: string; dias: number; club: Club };

type Mensaje = { antetitulo: string; titulo: string; intro: string; boton: string };

function mensajeDelPaso(paso: number, varios: boolean, dias: number): Mensaje {
  const equipo = varios ? "tus equipos" : "tu equipo";
  switch (paso) {
    case 15:
      return {
        antetitulo: "Mantenimiento en 15 días",
        titulo: "Tu agua merece su revisión a tiempo",
        intro: `En unos 15 días ${varios ? "les toca" : "le toca"} el mantenimiento a ${equipo} Blufil. Agéndalo ahora y escoge el día y la hora que mejor te queden: un equipo al día rinde más y te protege de daños costosos.`,
        boton: "Agendar mi mantenimiento",
      };
    case 10:
      return {
        antetitulo: "Quedan 10 días",
        titulo: "Asegura tu mantenimiento esta semana",
        intro: `Un mantenimiento a tiempo mantiene tu agua en las mejores condiciones y alarga la vida de ${equipo}. Agéndalo hoy: son dos minutos desde tu portal.`,
        boton: "Elegir mi fecha",
      };
    case 5:
      return {
        antetitulo: "Faltan 5 días",
        titulo: "Es el momento de agendar",
        intro: `Ya casi llega la fecha del mantenimiento de ${equipo}. Si lo agendas ahora, conservas tu racha y tu descuento del Club Blufil.`,
        boton: "Agendar ahora",
      };
    default:
      return dias < 0
        ? {
            antetitulo: "Mantenimiento vencido",
            titulo: "Tu mantenimiento ya venció",
            intro: `El mantenimiento de ${equipo} ya pasó de su fecha. Agéndalo cuanto antes para volver a tener tu agua en las mejores condiciones.`,
            boton: "Agendar mi mantenimiento",
          }
        : {
            antetitulo: "Hoy es el día",
            titulo: "Hoy le toca mantenimiento a tu equipo",
            intro: `Hoy se cumple el tiempo del mantenimiento de ${equipo}. Agéndalo hoy mismo y no pierdas tu racha en el Club Blufil.`,
            boton: "Agendar hoy",
          };
  }
}

// Bloque del Club Blufil: el porcentaje al que accede con este mantenimiento.
function bloqueClub(club: Club): string {
  const caja = (grande: string, texto: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:#eaf7fb;border-radius:8px;"><tr>` +
    `<td style="padding:12px 16px;width:84px;font-size:28px;font-weight:700;color:${AZUL_MARCA};">${grande}</td>` +
    `<td style="padding:12px 16px 12px 0;font-size:13px;line-height:1.4;color:#374151;">${texto}</td></tr></table>`;

  if (club.racha_vencida) {
    return caja(
      "Club",
      `Tu racha del Club Blufil venció: este mantenimiento la reinicia y el siguiente ya tendrá <strong>${club.descuento_siguiente}% de descuento</strong>.`,
    );
  }
  if (club.descuento > 0) {
    const limite = club.racha_hasta ? ` Agéndalo antes del <strong>${escapar(fechaLarga(club.racha_hasta))}</strong> para conservarlo.` : "";
    return caja(
      `${club.descuento}%`,
      `de descuento del Club Blufil en este mantenimiento (el #${club.numero} de tu racha).${limite}`,
    );
  }
  return caja(
    `${club.descuento_siguiente}%`,
    `Con este mantenimiento inicias tu racha en el Club Blufil: el siguiente ya tiene <strong>${club.descuento_siguiente}% de descuento</strong>, y sube con cada mantenimiento.`,
  );
}

// Asuntos cortos a proposito (maximo ~48 caracteres): denomailer codifica el asunto
// con acentos en una sola «encoded-word» y, si pasa de ~75 caracteres, parte mal las
// cabeceras y el correo llega con ellas a la vista dentro del cuerpo.
function asunto(paso: number, equipos: Equipo[]): string {
  const mayor = Math.max(...equipos.map((e) => (e.club.racha_vencida ? 0 : e.club.descuento)));
  const vencido = equipos.some((e) => e.dias < 0);
  switch (paso) {
    case 15:
      return mayor > 0 ? `Tu mantenimiento Blufil: ${mayor}% de descuento` : "Agenda el mantenimiento de tu equipo Blufil";
    case 10:
      return mayor > 0 ? `Quedan 10 días: ${mayor}% de descuento Club Blufil` : "Quedan 10 días para tu mantenimiento Blufil";
    case 5:
      return mayor > 0 ? `Faltan 5 días: no pierdas tu ${mayor}% de descuento` : "Faltan 5 días para tu mantenimiento Blufil";
    default:
      if (vencido) return "Tu mantenimiento Blufil ya venció";
      return mayor > 0 ? `Hoy es tu mantenimiento: ${mayor}% de descuento` : "Hoy le toca mantenimiento a tu equipo";
  }
}

function plazo(dias: number): string {
  if (dias < 0) return `Venció hace ${-dias} día${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "Le toca hoy";
  return `Le toca en ${dias} día${dias === 1 ? "" : "s"}`;
}

function plantilla(nombre: string, equipos: Equipo[], paso: number): string {
  const primerNombre = escapar(nombre.trim().split(/\s+/)[0] ?? "");
  const masUrgente = Math.min(...equipos.map((e) => e.dias));
  const m = mensajeDelPaso(paso, equipos.length > 1, masUrgente);

  const filas = equipos
    .map(
      (e) =>
        `<tr><td style="padding:14px 0;border-bottom:1px solid #eef2f5;">` +
        `<p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${escapar(e.etiqueta)}</p>` +
        `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${escapar(plazo(e.dias))} · ${escapar(fechaLarga(e.fecha))}</p>` +
        bloqueClub(e.club) +
        `</td></tr>`,
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
    `<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${CIAN_MARCA};">${escapar(m.antetitulo)}</p>` +
    `<h1 style="margin:0 0 6px;font-size:21px;color:${AZUL_MARCA};">${escapar(m.titulo)}</h1>` +
    `<p style="margin:0 0 16px;font-size:14px;color:#6b7280;">${primerNombre ? "Hola, " + primerNombre + "." : "Hola."}</p>` +
    `<p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#374151;">${m.intro}</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef2f5;">${filas}</table>` +
    `<a href="https://portal.blufil.com/dashboard/equipos" style="display:inline-block;margin-top:26px;background-color:${AZUL_MARCA};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">${escapar(m.boton)}</a>` +
    `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">¿Prefieres que lo agendemos por ti? Respóndenos por WhatsApp y te asignamos el día y la hora.</p>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 32px;background-color:#f5f9fb;"><p style="margin:0;font-size:12px;color:#9ca3af;">Blufil &middot; Recordatorio automático del portal, no responder a este correo.</p></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

// El paso que corresponde a los dias que faltan: el menor de 15, 10, 5 y 0 que sea
// mayor o igual a los dias restantes (vencido cuenta como 0). Mas de 15 dias: ninguno.
function pasoPara(dias: number): number | null {
  if (dias > 15) return null;
  if (dias <= 0) return 0;
  return Math.min(...PASOS.filter((p) => p >= dias));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const permitido = await llamantePermitido(admin, req);
  if (permitido === null) return respuesta({ error: "no_autenticado" }, 401);
  if (!permitido) return respuesta({ error: "no_autorizado" }, 403);

  let cuerpo: { vista_previa?: boolean; correo?: string } = {};
  try {
    cuerpo = await req.json();
  } catch {
    // sin cuerpo: ejecucion normal
  }

  const smtpPassword = Deno.env.get("notificaciones_smtp_password");
  const crearCliente = () =>
    new SMTPClient({
      connection: { hostname: "smtp.hostinger.com", port: 465, tls: true, auth: { username: REMITENTE, password: smtpPassword! } },
    });

  // ---- Vista previa: envia los 4 mensajes con datos de ejemplo a un correo ----
  if (cuerpo.vista_previa) {
    if (!cuerpo.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cuerpo.correo)) {
      return respuesta({ error: "correo no valido" }, 400);
    }
    if (!smtpPassword) return respuesta({ error: "falta el secreto notificaciones_smtp_password" }, 503);
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
    const sumar = (dias: number) => {
      const d = new Date(`${hoy}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + dias);
      return d.toISOString().slice(0, 10);
    };
    const client = crearCliente();
    let enviados = 0;
    try {
      for (const paso of PASOS) {
        const equipos: Equipo[] = [
          {
            etiqueta: "Ósmosis Inversa · El Prado",
            fecha: sumar(paso),
            dias: paso,
            club: { descuento: 15, descuento_siguiente: 25, numero: 3, racha_hasta: sumar(paso + 20), racha_vencida: false },
          },
        ];
        await client.send({
          from: `Blufil <${REMITENTE}>`,
          to: [cuerpo.correo],
          subject: `[Ej] ${asunto(paso, equipos)}`,
          html: plantilla("Said Torrente", equipos, paso),
          content: "auto",
        });
        enviados++;
      }
    } finally {
      try {
        await client.close();
      } catch {
        // cerrar la conexion no debe tumbar la respuesta
      }
    }
    return respuesta({ status: "ok", vista_previa: true, enviados }, 200);
  }

  // ---- Ejecucion normal ----
  const { data: ajustes } = await admin.from("ajustes_seguimiento").select("enviar_recordatorios").maybeSingle();
  if (!ajustes?.enviar_recordatorios) return respuesta({ status: "apagado" }, 200);
  if (!smtpPassword) return respuesta({ error: "falta el secreto notificaciones_smtp_password" }, 503);

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const sumarDias = (fecha: string, dias: number) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  const diasHasta = (fecha: string) =>
    Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);

  const { data: tarjetas, error } = await admin
    .from("seguimientos")
    .select(
      "id, fecha_objetivo, cliente_id, sistema_instalado_id, clientes(nombre, correo), sistemas_instalados(tipo, barrio), recordatorios_mantenimiento(paso)",
    )
    .eq("tipo", "mantenimiento")
    .is("cerrado_at", null)
    .in("etapa", ["por_vencer", "contactado", "sin_respuesta"])
    .lte("fecha_objetivo", sumarDias(hoy, 15))
    .gte("fecha_objetivo", sumarDias(hoy, -DIAS_MAXIMOS_VENCIDO))
    .order("fecha_objetivo");
  if (error) return respuesta({ error: "no se pudo leer el seguimiento", detalle: error.message }, 500);

  type Pendiente = { id: string; paso: number; equipo: Equipo };
  const porCliente = new Map<string, { nombre: string; correo: string; pendientes: Pendiente[] }>();

  for (const t of tarjetas ?? []) {
    const cliente = Array.isArray(t.clientes) ? t.clientes[0] : t.clientes;
    if (!cliente?.correo) continue;
    const dias = diasHasta(t.fecha_objetivo as string);
    const paso = pasoPara(dias);
    if (paso === null) continue;
    const enviados = new Set((t.recordatorios_mantenimiento ?? []).map((r: { paso: number }) => r.paso));
    if (enviados.has(paso)) continue;

    const sistema = Array.isArray(t.sistemas_instalados) ? t.sistemas_instalados[0] : t.sistemas_instalados;
    const { data: club } = await admin.rpc("club_proximo_mantenimiento", { p_sistema: t.sistema_instalado_id });
    const infoClub = (Array.isArray(club) ? club[0] : club) as Club | null;
    if (!infoClub) continue;

    const entrada = porCliente.get(t.cliente_id) ?? { nombre: cliente.nombre ?? "", correo: cliente.correo, pendientes: [] };
    entrada.pendientes.push({
      id: t.id,
      paso,
      equipo: {
        etiqueta: `${ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? sistema?.tipo ?? "Equipo"}${sistema?.barrio ? " · " + sistema.barrio : ""}`,
        fecha: t.fecha_objetivo as string,
        dias,
        club: infoClub,
      },
    });
    porCliente.set(t.cliente_id, entrada);
  }

  const client = crearCliente();
  let enviados = 0;
  const fallos: string[] = [];
  try {
    for (const [clienteId, grupo] of [...porCliente.entries()].slice(0, MAX_CLIENTES_POR_CORRIDA)) {
      // Si un cliente tiene varios equipos, un solo correo con el tono del mas urgente.
      const paso = Math.min(...grupo.pendientes.map((p) => p.paso));
      const equipos = grupo.pendientes.map((p) => p.equipo);
      try {
        await client.send({
          from: `Blufil <${REMITENTE}>`,
          to: [grupo.correo],
          subject: asunto(paso, equipos),
          html: plantilla(grupo.nombre, equipos, paso),
          content: "auto",
        });
        await admin
          .from("recordatorios_mantenimiento")
          .upsert(grupo.pendientes.map((p) => ({ seguimiento_id: p.id, paso: p.paso })), { onConflict: "seguimiento_id,paso" });
        await admin
          .from("seguimientos")
          .update({ recordatorio_enviado_at: new Date().toISOString() })
          .in("id", grupo.pendientes.map((p) => p.id));
        await admin.from("contactos_seguimiento").insert(
          grupo.pendientes.map((p) => ({
            seguimiento_id: p.id,
            canal: "correo",
            nota: `Recordatorio automático enviado por correo (${p.paso === 0 ? "día del vencimiento" : p.paso + " días antes"}).`,
          })),
        );
        enviados++;
      } catch (err) {
        fallos.push(`${clienteId}: ${String(err).slice(0, 120)}`);
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

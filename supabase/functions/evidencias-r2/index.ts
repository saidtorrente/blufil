import { createClient } from "jsr:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

// Evidencias (fotos y video) de los servicios en Cloudflare R2.
//
// El navegador nunca ve las credenciales de R2: esta funcion verifica quien
// llama y entrega enlaces temporales firmados, uno para subir (tecnico del
// servicio) y otros para ver (admin, tecnico del servicio o dueno del equipo).
//
// Secretos (Supabase > Edge Functions > Secrets): R2_ACCOUNT_ID,
// R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS = ["antes", "despues", "extra", "video"];
const EXTENSIONES_FOTO = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const EXTENSIONES_VIDEO = ["mp4", "mov", "webm"];
const MAX_FOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const MAX_RUTAS_POR_LLAMADA = 100;
const VIGENCIA_SUBIDA_S = 900; // 15 minutos
const VIGENCIA_LECTURA_S = 3600; // 1 hora

function respuesta(cuerpo: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

function rolDelJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}

function urlDeObjeto(clave: string): URL {
  const cuenta = Deno.env.get("R2_ACCOUNT_ID")!;
  const bucket = Deno.env.get("R2_BUCKET")!;
  const ruta = clave.split("/").map(encodeURIComponent).join("/");
  return new URL(`https://${cuenta}.r2.cloudflarestorage.com/${bucket}/${ruta}`);
}

async function firmar(r2: AwsClient, metodo: "PUT" | "GET", clave: string, vigencia: number): Promise<string> {
  const url = urlDeObjeto(clave);
  url.searchParams.set("X-Amz-Expires", String(vigencia));
  const firmada = await r2.sign(new Request(url, { method: metodo }), { aws: { signQuery: true } });
  return firmada.url;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ---- Quien llama (verify_jwt solo valida la firma; la anon key tambien pasa) ----
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || rolDelJwt(jwt) === "anon") return respuesta({ error: "no_autenticado" }, 401);
  const { data: sesion, error: errSesion } = await admin.auth.getUser(jwt);
  if (errSesion || !sesion.user) return respuesta({ error: "no_autenticado" }, 401);
  const userId = sesion.user.id;

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return respuesta({ error: "body_invalido" }, 400);
  }

  const cuenta = Deno.env.get("R2_ACCOUNT_ID");
  const llaveId = Deno.env.get("R2_ACCESS_KEY_ID");
  const llaveSecreta = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET");
  if (!cuenta || !llaveId || !llaveSecreta || !bucket) {
    return respuesta({ error: "el almacenamiento de evidencias todavia no esta configurado" }, 503);
  }
  const r2 = new AwsClient({ accessKeyId: llaveId, secretAccessKey: llaveSecreta, service: "s3", region: "auto" });

  const [{ data: filaAdmin }, { data: tecnico }, { data: clientes }] = await Promise.all([
    admin.from("admins").select("nivel").eq("auth_user_id", userId).maybeSingle(),
    admin.from("tecnicos").select("id").eq("auth_user_id", userId).maybeSingle(),
    admin.from("clientes").select("id").eq("auth_user_id", userId),
  ]);

  // ---- Subir: solo el tecnico asignado, mientras el servicio no este cerrado ----
  if (cuerpo.accion === "subir") {
    const servicioId = String(cuerpo.servicio_id ?? "");
    const tipo = String(cuerpo.tipo ?? "");
    const extension = String(cuerpo.extension ?? "").toLowerCase();
    const tamano = Number(cuerpo.tamano);
    if (!UUID.test(servicioId) || !TIPOS.includes(tipo)) return respuesta({ error: "datos no validos" }, 400);

    const esVideo = tipo === "video";
    if (!(esVideo ? EXTENSIONES_VIDEO : EXTENSIONES_FOTO).includes(extension)) {
      return respuesta({ error: "formato de archivo no permitido" }, 400);
    }
    if (!Number.isFinite(tamano) || tamano <= 0 || tamano > (esVideo ? MAX_VIDEO_BYTES : MAX_FOTO_BYTES)) {
      return respuesta({ error: esVideo ? "el video pesa mas de 40 MB" : "la foto pesa mas de 15 MB" }, 413);
    }

    if (!tecnico) return respuesta({ error: "no_autorizado" }, 403);
    const { data: servicio } = await admin
      .from("servicios")
      .select("id")
      .eq("id", servicioId)
      .eq("tecnico_id", tecnico.id)
      .in("estado", ["asignada", "en_progreso"])
      .maybeSingle();
    if (!servicio) return respuesta({ error: "no_autorizado" }, 403);

    const clave = `${servicioId}/${tipo}-${crypto.randomUUID()}.${extension}`;
    const url = await firmar(r2, "PUT", clave, VIGENCIA_SUBIDA_S);
    return respuesta({ status: "ok", ruta: `r2:${clave}`, url }, 200);
  }

  // ---- Ver: admin (cualquier nivel), tecnico del servicio o dueno del equipo ----
  if (cuerpo.accion === "ver") {
    const rutas = Array.isArray(cuerpo.rutas) ? cuerpo.rutas.map(String) : [];
    if (rutas.length > MAX_RUTAS_POR_LLAMADA) return respuesta({ error: "demasiadas rutas" }, 400);

    const claves = rutas
      .filter((r) => r.startsWith("r2:"))
      .map((r) => ({ ruta: r, clave: r.slice(3) }))
      .filter(({ clave }) => {
        const [servicioId, archivo, ...resto] = clave.split("/");
        return UUID.test(servicioId ?? "") && Boolean(archivo) && resto.length === 0;
      });

    let permitidos = new Set<string>();
    const servicioIds = [...new Set(claves.map(({ clave }) => clave.split("/")[0]))];
    if (servicioIds.length > 0) {
      if (filaAdmin) {
        permitidos = new Set(servicioIds);
      } else {
        const { data: servicios } = await admin
          .from("servicios")
          .select("id, tecnico_id, sistemas_instalados(cliente_id)")
          .in("id", servicioIds);
        const idsCliente = new Set((clientes ?? []).map((c) => c.id));
        for (const s of servicios ?? []) {
          const sistema = Array.isArray(s.sistemas_instalados) ? s.sistemas_instalados[0] : s.sistemas_instalados;
          const esDelTecnico = tecnico && s.tecnico_id === tecnico.id;
          const esDelCliente = sistema?.cliente_id && idsCliente.has(sistema.cliente_id);
          if (esDelTecnico || esDelCliente) permitidos.add(s.id);
        }
      }
    }

    const urls: Record<string, string> = {};
    for (const { ruta, clave } of claves) {
      if (!permitidos.has(clave.split("/")[0])) continue;
      urls[ruta] = await firmar(r2, "GET", clave, VIGENCIA_LECTURA_S);
    }
    return respuesta({ status: "ok", urls }, 200);
  }

  return respuesta({ error: "accion no valida" }, 400);
});

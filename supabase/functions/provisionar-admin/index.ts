import { createClient } from "jsr:@supabase/supabase-js@2";

const NIVELES = ["superadmin", "operador", "lector"];

// ---- Quien llama -----------------------------------------------------------
// verify_jwt solo comprueba que el token sea valido, y la anon key (publica)
// lo es. Esta funcion da acceso total al panel, asi que solo la puede usar un
// superadmin real (o el rol de servicio).

function rolDelJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}

async function llamantePermitido(admin: ReturnType<typeof createClient>, req: Request): Promise<boolean | null> {
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
  return fila.nivel === "superadmin";
}

function respuesta(cuerpo: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

// Crea un administrador: la cuenta de Auth (con una contraseña aleatoria que
// nadie conoce) y su fila en `admins`. La persona fija su propia contraseña
// desde /admin/login con "Olvidé mi contraseña": el flujo PKCE del correo solo
// funciona si se inicia desde el navegador de quien lo va a usar.
Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  let body: { correo?: string; nombre?: string; nivel?: string };
  try {
    body = await req.json();
  } catch {
    return respuesta({ error: "body_invalido" }, 400);
  }

  const correo = (body.correo ?? "").trim().toLowerCase();
  const nombre = (body.nombre ?? "").trim();
  const nivel = body.nivel ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return respuesta({ error: "correo no válido" }, 400);
  if (!nombre) return respuesta({ error: "el nombre es obligatorio" }, 400);
  if (!NIVELES.includes(nivel)) return respuesta({ error: "nivel no válido" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const permitido = await llamantePermitido(admin, req);
  if (permitido === null) return respuesta({ error: "no_autenticado" }, 401);
  if (!permitido) return respuesta({ error: "no_autorizado" }, 403);

  const { data: nuevo, error: errCrear } = await admin.auth.admin.createUser({
    email: correo,
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
  });
  if (errCrear || !nuevo.user) {
    return respuesta({ error: errCrear?.message ?? "no se pudo crear la cuenta" }, 409);
  }

  const { error: errAdmin } = await admin
    .from("admins")
    .insert({ auth_user_id: nuevo.user.id, nombre, nivel, correo });
  if (errAdmin) {
    // Sin fila en `admins` la cuenta no sirve: se deshace para no dejar usuarios huérfanos.
    await admin.auth.admin.deleteUser(nuevo.user.id);
    return respuesta({ error: "no se pudo registrar al administrador" }, 500);
  }

  return respuesta({ status: "ok", user_id: nuevo.user.id }, 200);
});

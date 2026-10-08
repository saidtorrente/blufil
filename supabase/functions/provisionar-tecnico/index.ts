import { createClient } from "jsr:@supabase/supabase-js@2";

const REDIRECT_TO = "https://portal.blufil.com/auth/confirm";

// ---- Quien llama -----------------------------------------------------------
// verify_jwt solo comprueba que el token sea valido, y la anon key (publica)
// lo es. Esta funcion crea cuentas, asi que solo la pueden usar el rol de
// servicio o un admin operador/superadmin.

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
  // La firma ya la valido verify_jwt; aqui solo se lee el rol del token.
  if (rolDelJwt(jwt) === "service_role") return true;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  // Si la tabla `admins` todavia no existe, la consulta falla -> no permitido.
  const { data: fila, error: errAdmin } = await admin
    .from("admins")
    .select("nivel")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (errAdmin || !fila) return false;
  return fila.nivel === "operador" || fila.nivel === "superadmin";
}

// Crea la cuenta de Auth de un técnico ya existente en la tabla `tecnicos`:
// contraseña inicial = cédula, correo sin confirmar, dispara el correo de
// confirmación. Mismo patrón que provisionar-cliente.
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  let body: { tecnico_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "body_invalido" }), { status: 400 });
  }

  if (!body.tecnico_id) {
    return new Response(JSON.stringify({ error: "tecnico_id requerido" }), { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const permitido = await llamantePermitido(admin, req);
  if (permitido === null) {
    return new Response(JSON.stringify({ error: "no_autenticado" }), { status: 401 });
  }
  if (!permitido) {
    return new Response(JSON.stringify({ error: "no_autorizado" }), { status: 403 });
  }

  const { data: tecnico, error: errTecnico } = await admin
    .from("tecnicos")
    .select("id, correo, cedula, auth_user_id")
    .eq("id", body.tecnico_id)
    .single();

  if (errTecnico || !tecnico) {
    return new Response(JSON.stringify({ error: "técnico no encontrado" }), { status: 404 });
  }
  if (!tecnico.correo || !tecnico.cedula) {
    return new Response(
      JSON.stringify({ error: "el técnico necesita correo y cédula antes de crear la cuenta" }),
      { status: 422 },
    );
  }
  if (tecnico.auth_user_id) {
    return new Response(JSON.stringify({ error: "este técnico ya tiene una cuenta" }), { status: 409 });
  }

  const { data: nuevoUsuario, error: errCrear } = await admin.auth.admin.createUser({
    email: tecnico.correo,
    password: tecnico.cedula,
    email_confirm: false,
  });

  if (errCrear || !nuevoUsuario.user) {
    return new Response(
      JSON.stringify({ error: errCrear?.message ?? "no se pudo crear la cuenta" }),
      { status: 500 },
    );
  }

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { error: errReenvio } = await anon.auth.resend({
    type: "signup",
    email: tecnico.correo,
    options: { emailRedirectTo: REDIRECT_TO },
  });

  if (errReenvio) {
    return new Response(
      JSON.stringify({
        status: "cuenta_creada_sin_correo",
        warning: "la cuenta se creó pero no se pudo enviar el correo de confirmación",
        detail: errReenvio.message,
        user_id: nuevoUsuario.user.id,
      }),
      { status: 200 },
    );
  }

  return new Response(JSON.stringify({ status: "ok", user_id: nuevoUsuario.user.id }), { status: 200 });
});

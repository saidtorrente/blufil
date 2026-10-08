import { createClient } from "jsr:@supabase/supabase-js@2";

const PARTNER_ID = "BlufilPortal";
const TAMANO_PAGINA = 100;
const MAX_PAGINAS = 30; // tope de seguridad: 3.000 productos

// ---- Quien llama -----------------------------------------------------------
// Esta funcion no usa verify_jwt: la llaman el reloj de la base de datos
// (pg_cron, con un secreto guardado en Vault) y los admins desde el panel
// (con su propio token). Cualquier otra llamada se rechaza.

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

// deno-lint-ignore no-explicit-any
type ProductoSiigo = Record<string, any>;

function aFila(p: ProductoSiigo, ahora: string) {
  const precio = p.prices?.[0]?.price_list?.[0]?.value;
  return {
    siigo_id: String(p.id),
    codigo: String(p.code),
    nombre: String(p.name ?? p.code).slice(0, 300),
    tipo: p.type ?? null,
    controla_inventario: Boolean(p.stock_control),
    activo: p.active !== false,
    precio: typeof precio === "number" ? precio : null,
    cantidad_disponible: typeof p.available_quantity === "number" ? p.available_quantity : null,
    bodegas: Array.isArray(p.warehouses)
      ? p.warehouses.map((w: ProductoSiigo) => ({ id: w.id, nombre: w.name, cantidad: w.quantity }))
      : [],
    impuestos: Array.isArray(p.taxes)
      ? p.taxes.map((t: ProductoSiigo) => ({ id: t.id, nombre: t.name, porcentaje: t.percentage }))
      : [],
    sincronizado_at: ahora,
  };
}

// Trae el catalogo de Siigo y lo copia en `productos`. Solo toca los datos que
// vienen de Siigo: la clasificacion (categoria / tipo de sistema) es del portal.
Deno.serve(async (req) => {
  if (req.method !== "POST") return respuesta({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const permitido = await llamantePermitido(admin, req);
  if (permitido === null) return respuesta({ error: "no_autenticado" }, 401);
  if (!permitido) return respuesta({ error: "no_autorizado" }, 403);

  const { data: username } = await admin.rpc("obtener_secreto", { nombre: "siigo_username" });
  const { data: accessKey } = await admin.rpc("obtener_secreto", { nombre: "siigo_access_key" });
  const authRes = await fetch("https://api.siigo.com/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, access_key: accessKey }),
  });
  if (!authRes.ok) return respuesta({ error: "fallo autenticacion con Siigo" }, 502);
  const { access_token } = await authRes.json();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Partner-Id": PARTNER_ID,
    "Content-Type": "application/json",
  };

  const ahora = new Date().toISOString();
  const filas: ReturnType<typeof aFila>[] = [];
  let completo = false;

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const res = await fetch(`https://api.siigo.com/v1/products?page=${pagina}&page_size=${TAMANO_PAGINA}`, { headers });
    if (!res.ok) return respuesta({ error: "Siigo no devolvio los productos", detalle: await res.text() }, 502);
    const cuerpo = await res.json();
    const resultados: ProductoSiigo[] = cuerpo.results ?? [];
    for (const p of resultados) if (p.id && p.code) filas.push(aFila(p, ahora));
    if (resultados.length < TAMANO_PAGINA) {
      completo = true;
      break;
    }
  }

  if (filas.length === 0) return respuesta({ error: "Siigo no devolvio productos" }, 502);

  for (let i = 0; i < filas.length; i += 200) {
    const { error } = await admin.from("productos").upsert(filas.slice(i, i + 200), { onConflict: "siigo_id" });
    if (error) return respuesta({ error: "no se pudo guardar el catalogo", detalle: error.message }, 500);
  }

  // Lo que ya no aparece en Siigo queda inactivo (solo si se leyo el catalogo completo).
  let desactivados = 0;
  if (completo) {
    const { data } = await admin
      .from("productos")
      .update({ activo: false })
      .lt("sincronizado_at", ahora)
      .eq("activo", true)
      .select("id");
    desactivados = data?.length ?? 0;
  }

  return respuesta({ status: "ok", productos: filas.length, desactivados }, 200);
});

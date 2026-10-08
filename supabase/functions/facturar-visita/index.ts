import { createClient } from "jsr:@supabase/supabase-js@2";

const PARTNER_ID = "BlufilPortal";
// Configuracion descubierta de la cuenta Siigo de Blufil (2026-09-02).
const DOCUMENT_TYPE_ID = 31126; // Factura electronica de venta FJ
const SELLER_ID = 22;
const TAX_ID = 13681; // IVA 0%
const PAYMENT_TYPE_ID = 7001; // Transferencia
const PRODUCT_CODE_INSTALACION = "PORTAL-INSTALACION";
const PRODUCT_CODE_MANTENIMIENTO = "PORTAL-MANTENIMIENTO";

const CIUDADES: Record<string, { state_code: string; city_code: string }> = {
  barranquilla: { state_code: "08", city_code: "08001" },
  soledad: { state_code: "08", city_code: "08758" },
  "puerto colombia": { state_code: "08", city_code: "08573" },
};

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble Filtracion",
  ultrafiltracion: "Ultrafiltracion",
  osmosis_inversa: "Osmosis Inversa",
  dispensador: "Dispensador sin botellon",
  ozono: "Purificador de Ozono",
};

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

// Un tecnico solo puede facturar visitas en las que tiene un servicio.
async function tecnicoTieneServicioEnVisita(
  admin: ReturnType<typeof createClient>,
  userId: string,
  visitaId: string,
): Promise<boolean> {
  const { data: tecnico } = await admin.from("tecnicos").select("id").eq("auth_user_id", userId).maybeSingle();
  if (!tecnico) return false;
  const { count } = await admin
    .from("servicios")
    .select("id", { count: "exact", head: true })
    .eq("visita_id", visitaId)
    .eq("tecnico_id", tecnico.id);
  return (count ?? 0) > 0;
}

function dividirNombre(nombre: string): [string, string] {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return [partes[0], partes[0]];
  const mitad = Math.ceil(partes.length / 2);
  return [partes.slice(0, mitad).join(" "), partes.slice(mitad).join(" ")];
}

// Construye el payload de tercero para Siigo segun sea persona natural
// (cedula, nombre partido en dos) o persona juridica (NIT sin digito de
// verificacion -- Siigo lo calcula solo -- razon social en un unico campo).
function construirTercero(
  cliente: { nombre: string; correo: string | null; cedula_nit: string; tipo_persona: string },
  ciudadInfo: { state_code: string; city_code: string },
) {
  const esJuridica = cliente.tipo_persona === "juridica";
  const address = { address: "N/A", city: { country_code: "Co", ...ciudadInfo } };

  if (esJuridica) {
    return {
      person_type: "Company",
      id_type: "31",
      identification: cliente.cedula_nit,
      name: [cliente.nombre],
      active: true,
      vat_responsible: false,
      address,
      contacts: cliente.correo
        ? [{ first_name: cliente.nombre, last_name: "", email: cliente.correo }]
        : [],
    };
  }

  const [primerNombre, apellido] = dividirNombre(cliente.nombre);
  return {
    person_type: "Person",
    id_type: "13",
    identification: cliente.cedula_nit,
    name: [primerNombre, apellido],
    active: true,
    vat_responsible: false,
    fiscal_responsibilities: [{ code: "R-99-PN" }],
    address,
    contacts: cliente.correo
      ? [{ first_name: primerNombre, last_name: apellido, email: cliente.correo }]
      : [],
  };
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
  const permitido =
    llamante.esServicio ||
    (llamante.userId !== null &&
      ((await esAdminOperador(admin, llamante.userId)) ||
        (await tecnicoTieneServicioEnVisita(admin, llamante.userId, body.visita_id))));
  if (!permitido) {
    return new Response(JSON.stringify({ error: "no_autorizado" }), { status: 403 });
  }

  const { data: facturaExistente } = await admin
    .from("facturas")
    .select("id")
    .eq("visita_id", body.visita_id)
    .maybeSingle();
  if (facturaExistente) {
    return new Response(JSON.stringify({ error: "esta visita ya fue facturada" }), { status: 409 });
  }

  const { data: visita } = await admin
    .from("visitas")
    .select("id, cliente_id, clientes(nombre, correo, cedula_nit, ciudad, tipo_persona)")
    .eq("id", body.visita_id)
    .maybeSingle();
  if (!visita) {
    return new Response(JSON.stringify({ error: "visita no encontrada" }), { status: 404 });
  }
  const cliente = Array.isArray(visita.clientes) ? visita.clientes[0] : visita.clientes;
  if (!cliente?.cedula_nit) {
    return new Response(JSON.stringify({ error: "el cliente no tiene cedula/NIT registrado" }), { status: 422 });
  }

  const { data: servicios } = await admin
    .from("servicios")
    .select(
      "id, tipo, valor_cobrado, descuento_aplicado, reporte_ia, sistemas_instalados(tipo), servicio_productos(cantidad, precio_unitario, productos(codigo, nombre, controla_inventario, bodegas, impuestos))",
    )
    .eq("visita_id", body.visita_id)
    .eq("estado", "completada");

  if (!servicios || servicios.length === 0) {
    return new Response(JSON.stringify({ error: "no hay servicios completados en esta visita" }), { status: 422 });
  }
  if (servicios.some((s) => s.valor_cobrado == null)) {
    return new Response(JSON.stringify({ error: "hay servicios sin valor cobrado registrado" }), { status: 422 });
  }

  const { data: username } = await admin.rpc("obtener_secreto", { nombre: "siigo_username" });
  const { data: accessKey } = await admin.rpc("obtener_secreto", { nombre: "siigo_access_key" });
  const authRes = await fetch("https://api.siigo.com/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, access_key: accessKey }),
  });
  if (!authRes.ok) {
    return new Response(
      JSON.stringify({ error: "fallo autenticacion con Siigo", detalle: await authRes.text() }),
      { status: 502 },
    );
  }
  const { access_token } = await authRes.json();
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Partner-Id": PARTNER_ID,
    "Content-Type": "application/json",
  };

  const busqueda = await fetch(
    `https://api.siigo.com/v1/customers?identification=${cliente.cedula_nit}`,
    { headers },
  );
  const resultadoBusqueda = await busqueda.json();
  let siigoCustomerId: string | undefined = resultadoBusqueda?.results?.[0]?.id;

  if (!siigoCustomerId) {
    const ciudadInfo = CIUDADES[cliente.ciudad?.trim().toLowerCase()] ?? CIUDADES["barranquilla"];
    const crearRes = await fetch("https://api.siigo.com/v1/customers", {
      method: "POST",
      headers,
      body: JSON.stringify(construirTercero(cliente, ciudadInfo)),
    });
    if (!crearRes.ok) {
      return new Response(
        JSON.stringify({ error: "no se pudo crear el tercero en Siigo", detalle: await crearRes.text() }),
        { status: 502 },
      );
    }
    const nuevoCliente = await crearRes.json();
    siigoCustomerId = nuevoCliente.id;
  }

  // Interruptores del panel (Inventario > Facturacion). Sin ellos Siigo deja la
  // factura en borrador: ni DIAN ni correo (ambos valen false por defecto).
  const { data: ajustes } = await admin
    .from("ajustes_facturacion")
    .select("enviar_dian, enviar_correo, cobrar_iva")
    .maybeSingle();
  const enviarDian = ajustes?.enviar_dian ?? false;
  const enviarCorreo = (ajustes?.enviar_correo ?? false) && Boolean(cliente.correo);
  // Al comienzo no se cobra IVA: todo sale con IVA 0%, sin importar el impuesto del producto en Siigo.
  const cobrarIva = ajustes?.cobrar_iva ?? false;

  // Cada servicio genera: (1) la mano de obra, con el descuento del Club Blufil,
  // y (2) una linea por cada producto de Siigo que el tecnico registro (el equipo
  // instalado y los repuestos), a precio de Siigo y sin descuento. Esas lineas
  // llevan el codigo real del producto y su bodega, asi Siigo descuenta el inventario.
  // deno-lint-ignore no-explicit-any
  type Linea = Record<string, any>;
  const items: Linea[] = [];
  // Total con impuestos: el pago debe cuadrar con la factura.
  let total = 0;
  const sumar = (precio: number, cantidad: number, descuento: number, porcentajeImpuesto: number) => {
    const base = Math.round(precio * cantidad * (1 - descuento / 100) * 100) / 100;
    total += base + Math.round(base * porcentajeImpuesto) / 100;
  };

  for (const s of servicios) {
    const sistema = Array.isArray(s.sistemas_instalados) ? s.sistemas_instalados[0] : s.sistemas_instalados;
    const etiquetaSistema = ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? sistema?.tipo ?? "";
    const precioBase = Number(s.valor_cobrado);
    const descuento = Number(s.descuento_aplicado ?? 0);
    const etiquetaTipo = s.tipo === "instalacion" ? "Instalacion" : "Mantenimiento";

    if (precioBase > 0) {
      items.push({
        code: s.tipo === "instalacion" ? PRODUCT_CODE_INSTALACION : PRODUCT_CODE_MANTENIMIENTO,
        description: `${etiquetaTipo} - ${etiquetaSistema}${s.reporte_ia ? " - " + s.reporte_ia : ""}`.slice(0, 500),
        quantity: 1,
        price: precioBase,
        discount: descuento,
        taxes: [{ id: TAX_ID }],
      });
      sumar(precioBase, 1, descuento, 0); // IVA 0%
    }

    for (const sp of s.servicio_productos ?? []) {
      const producto = Array.isArray(sp.productos) ? sp.productos[0] : sp.productos;
      if (!producto) continue;
      const impuestosProducto: { id: number; porcentaje?: number }[] = Array.isArray(producto.impuestos) ? producto.impuestos : [];
      const impuestos = cobrarIva ? impuestosProducto : [{ id: TAX_ID, porcentaje: 0 }];
      const bodega = Array.isArray(producto.bodegas) ? producto.bodegas[0] : null;
      const linea: Linea = {
        code: producto.codigo,
        description: String(producto.nombre).slice(0, 500),
        quantity: Number(sp.cantidad),
        price: Number(sp.precio_unitario),
        discount: 0,
      };
      if (impuestos.length > 0) linea.taxes = impuestos.map((t) => ({ id: t.id }));
      // La bodega "Sin asignar" (id -1) es la unica de la cuenta: Siigo la usa por defecto.
      if (producto.controla_inventario && bodega && bodega.id !== -1) linea.warehouse = bodega.id;
      items.push(linea);
      sumar(
        Number(sp.precio_unitario),
        Number(sp.cantidad),
        0,
        impuestos.reduce((acc, t) => acc + Number(t.porcentaje ?? 0), 0),
      );
    }
  }

  if (items.length === 0) {
    return new Response(JSON.stringify({ error: "no hay nada que facturar: sin valor de servicio ni productos" }), {
      status: 422,
    });
  }
  total = Math.round(total * 100) / 100;

  const facturaRes = await fetch("https://api.siigo.com/v1/invoices", {
    method: "POST",
    headers,
    body: JSON.stringify({
      document: { id: DOCUMENT_TYPE_ID },
      // La fecha de una factura electrónica no puede ser anterior a hoy (hora de Colombia).
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()),
      customer: { identification: cliente.cedula_nit },
      seller: SELLER_ID,
      items,
      payments: [{ id: PAYMENT_TYPE_ID, value: total }],
      stamp: { send: enviarDian },
      mail: { send: enviarCorreo },
    }),
  });

  if (!facturaRes.ok) {
    return new Response(
      JSON.stringify({ error: "no se pudo crear la factura en Siigo", detalle: await facturaRes.text() }),
      { status: 502 },
    );
  }
  const factura = await facturaRes.json();

  // Resultado del envio a la DIAN y al correo (Siigo los devuelve en la respuesta).
  const estadoDian: string | undefined = factura.stamp?.status;
  const aceptadaDian = estadoDian === "Accepted";
  const avisos: string[] = [];
  if (!enviarDian) {
    avisos.push("quedo en borrador en Siigo porque el envio a la DIAN esta apagado en Inventario > Facturacion");
  } else if (!aceptadaDian) {
    const errores = Array.isArray(factura.stamp?.errors)
      ? factura.stamp.errors.map((e: { message?: string }) => e?.message ?? JSON.stringify(e)).join("; ")
      : "";
    avisos.push(
      `la DIAN no la ha aceptado (estado: ${estadoDian ?? "sin respuesta"}${errores ? ", " + errores : ""}). Revisala en Siigo`,
    );
  }
  if (enviarCorreo && factura.mail?.status && factura.mail.status !== "Sent" && factura.mail.status !== "Delivered") {
    avisos.push(
      `el correo al cliente no salio (estado: ${factura.mail.status}${factura.mail.observations ? ", " + factura.mail.observations : ""})`,
    );
  } else if (!cliente.correo) {
    avisos.push("el cliente no tiene correo registrado, asi que Siigo no pudo enviarle la factura");
  }

  const { error: errorGuardar } = await admin.from("facturas").insert({
    visita_id: body.visita_id,
    siigo_invoice_id: String(factura.id),
    // `pendiente` mientras la DIAN no la acepte; el cliente la ve como "Pendiente".
    estado: aceptadaDian ? "emitida" : "pendiente",
    total,
  });

  if (errorGuardar) {
    return new Response(
      JSON.stringify({
        warning: "factura creada en Siigo pero no se pudo guardar en facturas",
        siigo_invoice_id: factura.id,
        detalle: errorGuardar.message,
      }),
      { status: 200 },
    );
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      siigo_invoice_id: factura.id,
      total,
      dian: estadoDian ?? null,
      correo: factura.mail?.status ?? null,
      ...(avisos.length > 0 ? { warning: avisos.join("; ") } : {}),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

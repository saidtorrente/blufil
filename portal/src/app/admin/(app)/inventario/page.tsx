import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esSuperadmin, obtenerAdmin, puedeEscribir } from "../../admin";
import { formatoFechaHora, formatoMoneda } from "../../ui";
import { AjustesFacturacion, BotonSincronizar, ClasificadorProducto } from "./controles";

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  controla_inventario: boolean;
  activo: boolean;
  precio: number | null;
  cantidad_disponible: number | null;
  categoria: string;
  tipo_sistema: string | null;
  sincronizado_at: string;
};

const FILTROS = [
  { clave: "todas", etiqueta: "Todos" },
  { clave: "sin_clasificar", etiqueta: "Sin clasificar" },
  { clave: "equipo", etiqueta: "Equipos" },
  { clave: "repuesto", etiqueta: "Repuestos" },
  { clave: "servicio", etiqueta: "Servicios" },
  { clave: "otro", etiqueta: "Otros" },
];

const LIMITE = 100;

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; inactivos?: string }>;
}) {
  const { categoria = "todas", q = "", inactivos } = await searchParams;
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);
  const busqueda = q.trim();
  const termino = busqueda.replace(/[,()*%]/g, " ").trim();

  let consulta = supabase
    .from("productos")
    .select("id, codigo, nombre, tipo, controla_inventario, activo, precio, cantidad_disponible, categoria, tipo_sistema, sincronizado_at")
    .order("nombre")
    .limit(LIMITE);
  if (!inactivos) consulta = consulta.eq("activo", true);
  if (categoria !== "todas") consulta = consulta.eq("categoria", categoria);
  if (termino) consulta = consulta.or(`nombre.ilike.%${termino}%,codigo.ilike.%${termino}%`);

  const [{ data: productos, error }, { data: ultima }, { data: ajustes }, { count: sinClasificar }] = await Promise.all([
    consulta.returns<Producto[]>(),
    supabase.from("productos").select("sincronizado_at").order("sincronizado_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("ajustes_facturacion").select("enviar_dian, enviar_correo, cobrar_iva").maybeSingle(),
    supabase.from("productos").select("id", { count: "exact", head: true }).eq("activo", true).eq("categoria", "sin_clasificar"),
  ]);

  const escribe = puedeEscribir(admin);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#123C5B]">Inventario</h1>
          <p className="text-sm text-neutral-500">
            Copia del catálogo de Siigo. Se actualiza sola cada 30 minutos
            {ultima ? ` · última vez ${formatoFechaHora.format(new Date(ultima.sincronizado_at))}` : ""}.
          </p>
        </div>
        {escribe && <BotonSincronizar />}
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Facturación</h2>
        <p className="mb-3 mt-0.5 text-xs text-neutral-400">
          Cada factura lleva el equipo y los repuestos que el técnico registró, con su precio de Siigo, y descuenta el inventario.
        </p>
        <AjustesFacturacion
          enviarDian={ajustes?.enviar_dian ?? true}
          enviarCorreo={ajustes?.enviar_correo ?? true}
          cobrarIva={ajustes?.cobrar_iva ?? false}
          puedeEditar={esSuperadmin(admin)}
        />
      </section>

      {(sinClasificar ?? 0) > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Hay {sinClasificar} productos activos sin clasificar. Solo los marcados como <strong>equipo</strong> o{" "}
          <strong>repuesto</strong> los puede elegir el técnico al cerrar un servicio.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const params = new URLSearchParams({ categoria: f.clave });
          if (busqueda) params.set("q", busqueda);
          if (inactivos) params.set("inactivos", "1");
          const activo = f.clave === categoria;
          return (
            <Link
              key={f.clave}
              href={`/admin/inventario?${params.toString()}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activo ? "bg-[#123C5B] text-white" : "bg-white text-neutral-600 ring-1 ring-black/10 hover:bg-neutral-50"
              }`}
            >
              {f.etiqueta}
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <input type="hidden" name="categoria" value={categoria} />
        <input
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por nombre o código, ej: membrana o F063"
          className="min-w-48 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={Boolean(inactivos)} className="h-4 w-4 accent-[#123C5B]" />
          Incluir inactivos
        </label>
        <button type="submit" className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]">
          Buscar
        </button>
      </form>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">No pudimos cargar el inventario. Intenta de nuevo.</p>
      ) : (productos ?? []).length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
          No hay productos con ese filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(productos ?? []).map((p) => (
                <tr key={p.id} className={p.activo ? "" : "bg-neutral-50 text-neutral-400"}>
                  <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                  <td className="px-4 py-3">
                    {p.nombre}
                    {!p.activo && <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">Inactivo</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.precio != null ? formatoMoneda.format(p.precio) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.controla_inventario ? (
                      <span className={(p.cantidad_disponible ?? 0) <= 0 ? "font-medium text-red-600" : ""}>{p.cantidad_disponible ?? 0}</span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ClasificadorProducto
                      productoId={p.id}
                      categoria={p.categoria}
                      tipoSistema={p.tipo_sistema}
                      puedeEscribir={escribe}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(productos ?? []).length === LIMITE && (
        <p className="text-xs text-neutral-400">Se muestran los primeros {LIMITE}. Usa la búsqueda o los filtros para acotar.</p>
      )}
    </div>
  );
}

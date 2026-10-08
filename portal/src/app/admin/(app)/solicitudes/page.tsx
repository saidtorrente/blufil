import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { EstadoChip, formatoFechaCorta, formatoMoneda, formatoOrden, uno } from "../../ui";

const FILTROS_ESTADO: { clave: string; etiqueta: string; estados: string[] | null }[] = [
  { clave: "activas", etiqueta: "Activas", estados: ["pendiente", "asignada", "en_progreso"] },
  { clave: "pendiente", etiqueta: "Sin técnico", estados: ["pendiente"] },
  { clave: "en_curso", etiqueta: "En curso", estados: ["asignada", "en_progreso"] },
  { clave: "completada", etiqueta: "Completadas", estados: ["completada"] },
  { clave: "cancelada", etiqueta: "Canceladas", estados: ["cancelada"] },
  { clave: "todas", etiqueta: "Todas", estados: null },
];

type Fila = {
  id: string;
  numero_orden: number;
  tipo: string;
  estado: string;
  created_at: string;
  tecnico_id: string | null;
  tecnicos: { nombre: string } | { nombre: string }[] | null;
  visitas: {
    facturas: { estado: string; total: number | null }[] | { estado: string; total: number | null } | null;
  } | null;
  sistemas_instalados: {
    tipo: string;
    clientes: { nombre: string; ciudad: string | null } | null;
  } | null;
};

type Params = { estado?: string; tecnico?: string; ciudad?: string; q?: string };

const LIMITE = 100;

export default async function SolicitudesAdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { estado = "activas", tecnico = "", ciudad = "", q = "" } = await searchParams;
  const supabase = await createClient();

  const filtroEstado = FILTROS_ESTADO.find((f) => f.clave === estado) ?? FILTROS_ESTADO[0];
  const busqueda = q.trim();
  const numeroBuscado = /^(?:blf-?)?0*(\d{1,9})$/i.exec(busqueda)?.[1];
  const buscaPorNombre = busqueda !== "" && numeroBuscado === undefined;

  // Los filtros por cliente/ciudad obligan a un join interno; sin ellos se
  // usa el normal para no excluir solicitudes sin datos completos.
  const unir = ciudad !== "" || buscaPorNombre ? "!inner" : "";

  let consulta = supabase
    .from("servicios")
    .select(
      `id, numero_orden, tipo, estado, created_at, tecnico_id, tecnicos(nombre), visitas(facturas(estado, total)), sistemas_instalados${unir}(tipo, clientes${unir}(nombre, ciudad))`,
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE);

  if (filtroEstado.estados) consulta = consulta.in("estado", filtroEstado.estados);
  if (tecnico === "sin") consulta = consulta.is("tecnico_id", null);
  else if (tecnico) consulta = consulta.eq("tecnico_id", tecnico);
  if (ciudad) consulta = consulta.eq("sistemas_instalados.clientes.ciudad", ciudad);
  if (numeroBuscado) consulta = consulta.eq("numero_orden", Number(numeroBuscado));
  if (buscaPorNombre) consulta = consulta.ilike("sistemas_instalados.clientes.nombre", `%${busqueda}%`);

  const [{ data: filas, error }, { data: tecnicos }, { data: ciudades }] = await Promise.all([
    consulta.returns<Fila[]>(),
    supabase.from("tecnicos").select("id, nombre").order("nombre"),
    supabase.from("clientes").select("ciudad").not("ciudad", "is", null).limit(1000),
  ]);

  const listaCiudades = [...new Set((ciudades ?? []).map((c) => c.ciudad as string))].sort();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Solicitudes</h1>
        <p className="text-sm text-neutral-500">Instalaciones y mantenimientos, del más reciente al más antiguo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS_ESTADO.map((f) => {
          const params = new URLSearchParams({ estado: f.clave });
          if (tecnico) params.set("tecnico", tecnico);
          if (ciudad) params.set("ciudad", ciudad);
          if (busqueda) params.set("q", busqueda);
          const activo = f.clave === filtroEstado.clave;
          return (
            <Link
              key={f.clave}
              href={`/admin/solicitudes?${params.toString()}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activo ? "bg-[#123C5B] text-white" : "bg-white text-neutral-600 ring-1 ring-black/10 hover:bg-neutral-50"
              }`}
            >
              {f.etiqueta}
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <input type="hidden" name="estado" value={filtroEstado.clave} />
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-neutral-500">
          Buscar por cliente o N.º de orden
          <input
            name="q"
            defaultValue={busqueda}
            placeholder="Ej: Said, BLF-000012 o 12"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Técnico
          <select
            name="tecnico"
            defaultValue={tecnico}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1EBBEB]"
          >
            <option value="">Todos</option>
            <option value="sin">Sin asignar</option>
            {(tecnicos ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Ciudad
          <select
            name="ciudad"
            defaultValue={ciudad}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1EBBEB]"
          >
            <option value="">Todas</option>
            {listaCiudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
        >
          Filtrar
        </button>
        {(tecnico || ciudad || busqueda) && (
          <Link
            href={`/admin/solicitudes?estado=${filtroEstado.clave}`}
            className="py-2 text-sm text-[#1a8fac] underline underline-offset-2"
          >
            Limpiar
          </Link>
        )}
      </form>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">No pudimos cargar las solicitudes. Intenta de nuevo.</p>
      ) : (filas ?? []).length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
          No hay solicitudes con esos filtros.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Técnico</th>
                <th className="px-4 py-3 font-medium">Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(filas ?? []).map((s) => {
                const sistema = uno(s.sistemas_instalados);
                const cliente = uno(sistema?.clientes);
                const factura = uno(uno(s.visitas)?.facturas);
                return (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium tabular-nums text-[#123C5B]">
                      <Link href={`/admin/solicitudes/${s.id}`} className="underline-offset-2 hover:underline">
                        {formatoOrden(s.numero_orden)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                      {formatoFechaCorta.format(new Date(s.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{cliente?.nombre ?? "—"}</p>
                      <p className="text-xs text-neutral-400">{cliente?.ciudad ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo}
                      <span className="block text-xs text-neutral-400">
                        {sistema ? ETIQUETA_SISTEMA[sistema.tipo] : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoChip estado={s.estado} />
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{uno(s.tecnicos)?.nombre ?? <span className="text-neutral-300">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                      {factura ? (
                        <span className="tabular-nums">{factura.total != null ? formatoMoneda.format(factura.total) : "Emitida"}</span>
                      ) : s.estado === "completada" ? (
                        <span className="text-xs font-medium text-amber-700">Sin factura</span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(filas ?? []).length === LIMITE && (
        <p className="text-xs text-neutral-400">Se muestran las {LIMITE} más recientes; usa los filtros para afinar.</p>
      )}
    </div>
  );
}

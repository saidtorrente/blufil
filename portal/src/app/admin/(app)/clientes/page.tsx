import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerAdmin, puedeEscribir } from "../../admin";
import { formatoFechaCorta } from "../../ui";

type Fila = {
  id: string;
  nombre: string;
  cedula_nit: string | null;
  telefono: string | null;
  correo: string | null;
  ciudad: string;
  estatus: string;
  auth_user_id: string | null;
  created_at: string;
  sistemas_instalados: { id: string }[];
};

const LIMITE = 60;

export default async function ClientesAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);
  const busqueda = q.trim();

  let consulta = supabase
    .from("clientes")
    .select("id, nombre, cedula_nit, telefono, correo, ciudad, estatus, auth_user_id, created_at, sistemas_instalados(id)")
    .order("created_at", { ascending: false })
    .limit(LIMITE);

  if (busqueda) {
    // Se quitan los caracteres que rompen la sintaxis del filtro `or` de PostgREST.
    const termino = busqueda.replace(/[,()*%]/g, " ").trim();
    if (termino) {
      consulta = consulta.or(
        `nombre.ilike.%${termino}%,cedula_nit.ilike.%${termino}%,telefono.ilike.%${termino}%,correo.ilike.%${termino}%`,
      );
    }
  }

  const { data: clientes, error } = await consulta.returns<Fila[]>();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#123C5B]">Clientes</h1>
          <p className="text-sm text-neutral-500">Busca por nombre, cédula o NIT, teléfono o correo.</p>
        </div>
        {puedeEscribir(admin) && (
          <Link
            href="/admin/clientes/nuevo"
            className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
          >
            Nuevo cliente
          </Link>
        )}
      </div>

      <form method="get" className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <input
          name="q"
          defaultValue={busqueda}
          placeholder="Ej: Said, 72345978, 300…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
        <button type="submit" className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]">
          Buscar
        </button>
        {busqueda && (
          <Link href="/admin/clientes" className="self-center text-sm text-[#1a8fac] underline underline-offset-2">
            Limpiar
          </Link>
        )}
      </form>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">No pudimos cargar los clientes. Intenta de nuevo.</p>
      ) : (clientes ?? []).length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
          No hay clientes con ese criterio.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Cédula / NIT</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Equipos</th>
                <th className="px-4 py-3 font-medium">Acceso al portal</th>
                <th className="px-4 py-3 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(clientes ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/${c.id}`} className="font-medium text-[#123C5B] underline-offset-2 hover:underline">
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-neutral-400">{c.ciudad}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-700">{c.cedula_nit ?? <span className="text-neutral-300">—</span>}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {c.telefono ?? <span className="text-neutral-300">sin teléfono</span>}
                    <p className="text-xs text-neutral-400">{c.correo ?? "sin correo"}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-700">{c.sistemas_instalados.length}</td>
                  <td className="px-4 py-3">
                    {c.auth_user_id ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Con acceso</span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">Sin acceso</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{formatoFechaCorta.format(new Date(c.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(clientes ?? []).length === LIMITE && (
        <p className="text-xs text-neutral-400">Se muestran los {LIMITE} más recientes; usa la búsqueda para afinar.</p>
      )}
    </div>
  );
}

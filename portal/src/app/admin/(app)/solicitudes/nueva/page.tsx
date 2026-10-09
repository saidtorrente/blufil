import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { obtenerAdmin, puedeEscribir } from "../../../admin";
import { formatoFechaCorta } from "../../../ui";
import { FormularioSolicitud } from "./formulario-solicitud";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  ciudad: string;
  sistemas_instalados: { id: string; tipo: string; direccion: string; barrio: string | null; fecha_instalacion: string | null }[];
};

const LIMITE = 12;

export default async function NuevaSolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; q?: string; equipo?: string }>;
}) {
  const { cliente: clienteId = "", q = "", equipo } = await searchParams;
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);

  const encabezado = (
    <div>
      <Link href="/admin/solicitudes" className="text-sm text-[#1a8fac] underline underline-offset-2">
        ← Solicitudes
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-[#123C5B]">Nueva solicitud</h1>
      <p className="text-sm text-neutral-500">Para clientes que piden una instalación o un mantenimiento por teléfono o WhatsApp.</p>
    </div>
  );

  if (!puedeEscribir(admin)) {
    return (
      <div className="flex flex-col gap-5">
        {encabezado}
        <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Tu nivel de acceso es de solo lectura: no puedes crear solicitudes.
        </p>
      </div>
    );
  }

  // Paso 1: elegir al cliente.
  if (!clienteId) {
    const busqueda = q.trim();
    let consulta = supabase
      .from("clientes")
      .select("id, nombre, telefono, ciudad, cedula_nit, correo")
      .order("nombre")
      .limit(LIMITE);
    const termino = busqueda.replace(/[,()*%]/g, " ").trim();
    if (termino) {
      consulta = consulta.or(
        `nombre.ilike.%${termino}%,cedula_nit.ilike.%${termino}%,telefono.ilike.%${termino}%,correo.ilike.%${termino}%`,
      );
    }
    const { data: resultados } = termino ? await consulta : { data: [] };

    return (
      <div className="flex flex-col gap-5">
        {encabezado}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eaf7fb] p-4 text-sm text-[#123C5B]">
          <span>¿Es un cliente que todavía no está registrado?</span>
          <Link
            href="/admin/clientes/nuevo"
            className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
          >
            Crear cliente nuevo
          </Link>
        </div>
        <form method="get" className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <input
            name="q"
            defaultValue={busqueda}
            autoFocus
            placeholder="Busca al cliente por nombre, cédula, teléfono o correo"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
          <button type="submit" className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]">
            Buscar
          </button>
        </form>

        {termino && (
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            {(resultados ?? []).length === 0 ? (
              <p className="p-5 text-sm text-neutral-500">
                No encontramos clientes con «{busqueda}».{" "}
                <Link href="/admin/clientes/nuevo" className="text-[#1a8fac] underline underline-offset-2">
                  Crear un cliente nuevo
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {(resultados ?? []).map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/solicitudes/nueva?cliente=${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-neutral-50">
                      <span className="font-medium text-[#123C5B]">{c.nombre}</span>
                      <span className="text-xs text-neutral-400">
                        {c.telefono ?? "sin teléfono"} · {c.ciudad}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  // Paso 2: datos de la solicitud.
  const [{ data: cliente }, { data: tecnicos }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre, telefono, ciudad, sistemas_instalados(id, tipo, direccion, barrio, fecha_instalacion)")
      .eq("id", clienteId)
      .maybeSingle<Cliente>(),
    supabase
      .from("tecnicos")
      .select("id, nombre, ciudad, disponible")
      .eq("certificado", true)
      .order("nombre"),
  ]);

  if (!cliente) {
    return (
      <div className="flex flex-col gap-5">
        {encabezado}
        <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          No encontramos a ese cliente.{" "}
          <Link href="/admin/solicitudes/nueva" className="text-[#1a8fac] underline underline-offset-2">
            Buscar de nuevo
          </Link>
        </p>
      </div>
    );
  }

  const equipos = cliente.sistemas_instalados.map((s) => ({
    id: s.id,
    etiqueta: `${ETIQUETA_SISTEMA[s.tipo] ?? s.tipo} · ${s.barrio ?? s.direccion} · ${
      s.fecha_instalacion ? `instalado el ${formatoFechaCorta.format(new Date(`${s.fecha_instalacion}T12:00:00`))}` : "por instalar"
    }`,
  }));

  const opcionesTecnico = (tecnicos ?? []).map((t) => ({
    id: t.id,
    etiqueta: `${t.nombre}${t.ciudad ? ` · ${t.ciudad}` : ""}${t.disponible ? "" : " (no disponible)"}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      {encabezado}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eaf7fb] p-4 text-sm text-[#123C5B]">
        <span>
          <span className="font-semibold">{cliente.nombre}</span> · {cliente.telefono ?? "sin teléfono"} · {cliente.ciudad}
        </span>
        <Link href="/admin/solicitudes/nueva" className="text-[#1a8fac] underline underline-offset-2">
          Cambiar cliente
        </Link>
      </div>

      {equipos.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
          Este cliente todavía no tiene equipos registrados.{" "}
          <Link href={`/admin/clientes/${cliente.id}`} className="text-[#1a8fac] underline underline-offset-2">
            Agrega el equipo en su ficha
          </Link>{" "}
          y vuelve aquí para crear la instalación.
        </p>
      ) : (
        <FormularioSolicitud equipos={equipos} tecnicos={opcionesTecnico} equipoInicial={equipo} />
      )}
    </div>
  );
}

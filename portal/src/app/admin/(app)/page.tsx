import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { formatoOrden, uno } from "../ui";

type Pendiente = {
  id: string;
  numero_orden: number;
  tipo: string;
  created_at: string;
  sistemas_instalados: { tipo: string; clientes: { nombre: string; ciudad: string | null } | null } | null;
};

type VisitaSinFactura = {
  id: string;
  created_at: string;
  clientes: { nombre: string } | null;
  facturas: { id: string }[] | { id: string } | null;
  servicios: { id: string; numero_orden: number }[];
};

// Primer instante del mes actual en hora de Bogotá (Colombia no usa horario de verano).
function inicioDeMesBogota(): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-");
  return `${partes[0]}-${partes[1]}-01T00:00:00-05:00`;
}

function haceCuanto(fechaIso: string): string {
  const horas = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 3600000);
  if (horas < 1) return "hace menos de 1 h";
  if (horas < 48) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} días`;
}

export default async function TableroAdminPage() {
  const supabase = await createClient();

  const [pendientes, enCurso, completadasMes, listaPendientes, visitasCompletadas] = await Promise.all([
    supabase.from("servicios").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("servicios").select("id", { count: "exact", head: true }).in("estado", ["asignada", "en_progreso"]),
    supabase
      .from("servicios")
      .select("id", { count: "exact", head: true })
      .eq("estado", "completada")
      .gte("updated_at", inicioDeMesBogota()),
    supabase
      .from("servicios")
      .select("id, numero_orden, tipo, created_at, sistemas_instalados(tipo, clientes(nombre, ciudad))")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true })
      .limit(6)
      .returns<Pendiente[]>(),
    supabase
      .from("visitas")
      .select("id, created_at, clientes(nombre), facturas(id), servicios(id, numero_orden)")
      .eq("estado", "completada")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<VisitaSinFactura[]>(),
  ]);

  const sinFactura = (visitasCompletadas.data ?? []).filter((v) => {
    const f = v.facturas;
    return !f || (Array.isArray(f) && f.length === 0);
  });

  const tarjetas = [
    {
      titulo: "Sin técnico",
      valor: pendientes.count ?? 0,
      detalle: "Solicitudes esperando que alguien las acepte",
      href: "/admin/solicitudes?estado=pendiente",
      alerta: (pendientes.count ?? 0) > 0,
    },
    {
      titulo: "En curso",
      valor: enCurso.count ?? 0,
      detalle: "Asignadas o en progreso",
      href: "/admin/solicitudes?estado=en_curso",
      alerta: false,
    },
    {
      titulo: "Completadas este mes",
      valor: completadasMes.count ?? 0,
      detalle: "Servicios cerrados por los técnicos",
      href: "/admin/solicitudes?estado=completada",
      alerta: false,
    },
    {
      titulo: "Sin facturar",
      valor: sinFactura.length,
      detalle: "Visitas completadas sin factura en Siigo",
      href: "/admin/solicitudes?estado=completada",
      alerta: sinFactura.length > 0,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Tablero</h1>
        <p className="text-sm text-neutral-500">Lo que está pasando hoy en Blufil.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <Link
            key={t.titulo}
            href={t.href}
            className={`rounded-xl bg-white p-4 shadow-sm ring-1 transition hover:ring-[#1EBBEB] ${
              t.alerta ? "ring-amber-300" : "ring-black/5"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{t.titulo}</p>
            <p className={`mt-1 text-3xl font-semibold tabular-nums ${t.alerta ? "text-amber-600" : "text-[#123C5B]"}`}>
              {t.valor}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{t.detalle}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-neutral-800">Esperando técnico</h2>
          <Link href="/admin/solicitudes?estado=pendiente" className="text-sm text-[#1a8fac] underline underline-offset-2">
            Ver todas
          </Link>
        </div>
        {(listaPendientes.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No hay solicitudes sin técnico. Todo asignado.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {(listaPendientes.data ?? []).map((s) => {
              const sistema = uno(s.sistemas_instalados);
              const cliente = uno(sistema?.clientes);
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/solicitudes/${s.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo} · {sistema ? ETIQUETA_SISTEMA[sistema.tipo] : ""}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {cliente?.nombre ?? "—"} · {cliente?.ciudad ?? "—"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-neutral-600">{formatoOrden(s.numero_orden)}</p>
                      <p className="text-xs text-amber-700">{haceCuanto(s.created_at)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Completadas sin factura</h2>
        {sinFactura.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Todas las visitas completadas tienen factura.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {sinFactura.slice(0, 6).map((v) => {
              const servicio = v.servicios?.[0];
              return (
                <li key={v.id}>
                  <Link
                    href={servicio ? `/admin/solicitudes/${servicio.id}` : "/admin/solicitudes"}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-neutral-50"
                  >
                    <p className="truncate text-sm text-neutral-800">{uno(v.clientes)?.nombre ?? "—"}</p>
                    <p className="flex-shrink-0 text-xs font-medium text-neutral-600">
                      {servicio ? formatoOrden(servicio.numero_orden) : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

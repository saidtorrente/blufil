import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { diaCorto, diaLargo, fechaBogota, hoyBogota, horaCorta, lunesDe, rangoHorario, sumarDias } from "@/lib/agenda";
import { obtenerAdmin, puedeEscribir } from "../../admin";
import { formatoOrden, uno } from "../../ui";
import { BotonConfirmar } from "./boton-confirmar";

type Visita = {
  id: string;
  numero_orden: number;
  tipo: string;
  estado: string;
  tecnico_id: string | null;
  inicio_programado: string;
  duracion_minutos: number;
  agenda_estado: string;
  tecnicos: { nombre: string } | { nombre: string }[] | null;
  sistemas_instalados: {
    tipo: string;
    barrio: string | null;
    clientes: { nombre: string } | { nombre: string }[] | null;
  } | null;
};

type SinProgramar = {
  id: string;
  numero_orden: number;
  tipo: string;
  estado: string;
  tecnicos: { nombre: string } | { nombre: string }[] | null;
  sistemas_instalados: { tipo: string; clientes: { nombre: string } | { nombre: string }[] | null } | null;
  visitas: { fecha_hora_deseada: string | null } | { fecha_hora_deseada: string | null }[] | null;
};

const SELECCION_VISITA =
  "id, numero_orden, tipo, estado, tecnico_id, inicio_programado, duracion_minutos, agenda_estado, tecnicos(nombre), sistemas_instalados(tipo, barrio, clientes(nombre))";

export default async function AgendaAdminPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const hoy = hoyBogota();
  const lunes = lunesDe(/^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") ? (semana as string) : hoy);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const desde = new Date(`${lunes}T00:00:00-05:00`).toISOString();
  const hasta = new Date(`${sumarDias(lunes, 7)}T00:00:00-05:00`).toISOString();

  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);
  const escribe = puedeEscribir(admin);

  const [{ data: visitas }, { data: porConfirmar }, { data: sinProgramar }, { data: tecnicos }] = await Promise.all([
    supabase
      .from("servicios")
      .select(SELECCION_VISITA)
      .gte("inicio_programado", desde)
      .lt("inicio_programado", hasta)
      .in("estado", ["asignada", "en_progreso", "completada"])
      .order("inicio_programado")
      .returns<Visita[]>(),
    supabase
      .from("servicios")
      .select(SELECCION_VISITA)
      .eq("agenda_estado", "propuesta")
      .eq("estado", "asignada")
      .order("inicio_programado")
      .returns<Visita[]>(),
    supabase
      .from("servicios")
      .select("id, numero_orden, tipo, estado, tecnicos(nombre), sistemas_instalados(tipo, clientes(nombre)), visitas(fecha_hora_deseada)")
      .in("estado", ["pendiente", "asignada"])
      .eq("agenda_estado", "sin_programar")
      .order("created_at")
      .limit(50)
      .returns<SinProgramar[]>(),
    supabase.from("tecnicos").select("id, nombre").eq("certificado", true).order("nombre"),
  ]);

  const porTecnico = new Map<string, Visita[]>();
  for (const v of visitas ?? []) {
    if (!v.tecnico_id) continue;
    porTecnico.set(v.tecnico_id, [...(porTecnico.get(v.tecnico_id) ?? []), v]);
  }
  const filasTecnicos = tecnicos ?? [];

  const enlaceSemana = (lunesDestino: string) => `/admin/agenda?semana=${lunesDestino}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Agenda</h1>
        <p className="text-sm text-neutral-500">Las visitas de cada técnico, por día. Para programar una, ábrela y fija día y hora.</p>
      </div>

      {(porConfirmar ?? []).length > 0 && (
        <section className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <h2 className="font-semibold text-amber-900">Horas propuestas por confirmar</h2>
          <ul className="mt-3 divide-y divide-amber-200">
            {(porConfirmar ?? []).map((v) => {
              const sistema = v.sistemas_instalados;
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/solicitudes/${v.id}`} className="font-medium text-[#123C5B] hover:underline">
                      {formatoOrden(v.numero_orden)}
                    </Link>{" "}
                    · {uno(sistema?.clientes)?.nombre ?? ""} · {ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? sistema?.tipo}
                    <p className="text-xs text-amber-900">
                      {uno(v.tecnicos)?.nombre} propone {diaLargo(v.inicio_programado)}, {rangoHorario(v.inicio_programado, v.duracion_minutos)}
                    </p>
                  </div>
                  {escribe && <BotonConfirmar servicioId={v.id} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-neutral-800">
          Semana del {diaCorto(`${lunes}T12:00:00-05:00`)} al {diaCorto(`${sumarDias(lunes, 6)}T12:00:00-05:00`)}
        </h2>
        <div className="flex gap-2 text-sm">
          <Link href={enlaceSemana(sumarDias(lunes, -7))} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">
            ← Anterior
          </Link>
          <Link href="/admin/agenda" className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">
            Hoy
          </Link>
          <Link href={enlaceSemana(sumarDias(lunes, 7))} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-neutral-50">
            Siguiente →
          </Link>
        </div>
      </div>

      {filasTecnicos.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          No hay técnicos certificados todavía.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-400">
                <th className="w-32 px-3 py-2 font-medium">Técnico</th>
                {dias.map((d) => (
                  <th key={d} className={`px-2 py-2 font-medium ${d === hoy ? "text-[#1a8fac]" : ""}`}>
                    {diaCorto(`${d}T12:00:00-05:00`)}
                    {d === hoy ? " · hoy" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filasTecnicos.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="px-3 py-3 text-sm font-medium text-[#123C5B]">{t.nombre}</td>
                  {dias.map((d) => {
                    const delDia = (porTecnico.get(t.id) ?? []).filter((v) => fechaBogota(v.inicio_programado) === d);
                    return (
                      <td key={d} className={`px-1.5 py-2 ${d === hoy ? "bg-[#eaf7fb]/50" : ""}`}>
                        <div className="flex flex-col gap-1">
                          {delDia.map((v) => {
                            const sistema = v.sistemas_instalados;
                            const color =
                              v.estado === "completada"
                                ? "bg-green-100 text-green-900"
                                : v.agenda_estado === "propuesta"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-[#d5f0f9] text-[#0d5a73]";
                            return (
                              <Link
                                key={v.id}
                                href={`/admin/solicitudes/${v.id}`}
                                className={`block rounded-md px-1.5 py-1 leading-tight hover:opacity-80 ${color}`}
                              >
                                <span className="font-semibold">{horaCorta(v.inicio_programado)}</span>{" "}
                                {uno(sistema?.clientes)?.nombre.split(/\s+/)[0]}
                                <span className="block truncate opacity-80">
                                  {ETIQUETA_SERVICIO[v.tipo] ?? v.tipo} · {ETIQUETA_SISTEMA[sistema?.tipo ?? ""] ?? ""}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Azul: confirmada · Ámbar: hora propuesta por el técnico, por confirmar · Verde: completada.
      </p>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Solicitudes sin programar</h2>
        {(sinProgramar ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Todas las solicitudes activas tienen día y hora.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {(sinProgramar ?? []).map((s) => {
              const deseada = uno(s.visitas)?.fecha_hora_deseada;
              return (
                <li key={s.id}>
                  <Link href={`/admin/solicitudes/${s.id}#agenda`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:bg-neutral-50">
                    <span className="min-w-0">
                      <span className="font-medium text-[#123C5B]">{formatoOrden(s.numero_orden)}</span> ·{" "}
                      {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo} · {ETIQUETA_SISTEMA[s.sistemas_instalados?.tipo ?? ""] ?? ""}
                      <span className="block truncate text-xs text-neutral-400">
                        {uno(s.sistemas_instalados?.clientes)?.nombre}
                        {uno(s.tecnicos) ? ` · técnico: ${uno(s.tecnicos)?.nombre}` : " · sin técnico"}
                        {deseada ? ` · el cliente pidió ${diaLargo(deseada)}` : ""}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-[#1a8fac]">{escribe ? "Programar →" : "Ver →"}</span>
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

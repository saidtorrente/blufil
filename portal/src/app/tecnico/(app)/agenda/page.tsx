import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { diaLargo, fechaBogota, horaBogota, rangoHorario } from "@/lib/agenda";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "../../etiquetas";
import { ProponerForm } from "./proponer-form";

type Visita = {
  id: string;
  tipo: string;
  estado: string;
  inicio_programado: string | null;
  duracion_minutos: number;
  agenda_estado: string;
  sistemas_instalados: {
    tipo: string;
    direccion: string;
    clientes: { nombre: string; telefono: string | null } | null;
  } | null;
  visitas: { fecha_hora_deseada: string | null } | { fecha_hora_deseada: string | null }[] | null;
};

export default async function AgendaTecnicoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/tecnico/login");

  const { data: tecnico } = await supabase.from("tecnicos").select("id, nombre").eq("auth_user_id", user.id).maybeSingle();
  if (!tecnico) redirect("/tecnico/dashboard");

  const { data: visitas } = await supabase
    .from("servicios")
    .select(
      "id, tipo, estado, inicio_programado, duracion_minutos, agenda_estado, sistemas_instalados(tipo, direccion, clientes(nombre, telefono)), visitas(fecha_hora_deseada)",
    )
    .eq("tecnico_id", tecnico.id)
    .in("estado", ["asignada", "en_progreso"])
    .order("inicio_programado", { ascending: true, nullsFirst: true })
    .returns<Visita[]>();

  const lista = visitas ?? [];
  const porProgramar = lista.filter((v) => v.agenda_estado === "sin_programar");
  const porConfirmar = lista.filter((v) => v.agenda_estado === "propuesta");
  const confirmadas = lista.filter((v) => v.agenda_estado === "confirmada");

  const dias = new Map<string, Visita[]>();
  for (const v of confirmadas) {
    const dia = fechaBogota(v.inicio_programado as string);
    dias.set(dia, [...(dias.get(dia) ?? []), v]);
  }

  const titulo = (v: Visita) => `${ETIQUETA_SERVICIO[v.tipo] ?? v.tipo} · ${ETIQUETA_SISTEMA[v.sistemas_instalados?.tipo ?? ""] ?? ""}`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Mi agenda</h1>
        <p className="text-sm text-neutral-500">Tus visitas por día. Si una visita no tiene hora, propónla.</p>
      </div>

      {porProgramar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-neutral-800">Por programar</h2>
          {porProgramar.map((v) => {
            const deseada = Array.isArray(v.visitas) ? v.visitas[0]?.fecha_hora_deseada : v.visitas?.fecha_hora_deseada;
            return (
              <div key={v.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div>
                  <Link href={`/tecnico/servicio/${v.id}`} className="font-medium text-[#123C5B] hover:underline">
                    {titulo(v)}
                  </Link>
                  <p className="text-sm text-neutral-500">{v.sistemas_instalados?.direccion}</p>
                  <p className="text-xs text-neutral-400">
                    {v.sistemas_instalados?.clientes?.nombre}
                    {v.sistemas_instalados?.clientes?.telefono ? ` · ${v.sistemas_instalados.clientes.telefono}` : ""}
                    {deseada ? ` · el cliente pidió ${diaLargo(deseada)}` : ""}
                  </p>
                </div>
                <ProponerForm servicioId={v.id} etiquetaBoton="Proponer hora" />
              </div>
            );
          })}
        </section>
      )}

      {porConfirmar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-neutral-800">Esperando confirmación</h2>
          {porConfirmar.map((v) => (
            <div key={v.id} className="flex flex-col gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <div>
                <Link href={`/tecnico/servicio/${v.id}`} className="font-medium text-[#123C5B] hover:underline">
                  {titulo(v)}
                </Link>
                <p className="text-sm text-amber-900">
                  Propusiste {diaLargo(v.inicio_programado as string)}, {rangoHorario(v.inicio_programado as string, v.duracion_minutos)}.
                  La administración la confirmará.
                </p>
              </div>
              <ProponerForm
                servicioId={v.id}
                fechaInicial={fechaBogota(v.inicio_programado as string)}
                horaInicial={horaBogota(v.inicio_programado as string)}
                etiquetaBoton="Cambiar la hora propuesta"
              />
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-800">Próximas visitas</h2>
        {dias.size === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
            No tienes visitas confirmadas por ahora.
          </p>
        ) : (
          [...dias.entries()].map(([dia, delDia]) => (
            <div key={dia} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium capitalize text-neutral-600">{diaLargo(delDia[0].inicio_programado as string)}</h3>
              {delDia.map((v) => (
                <Link
                  key={v.id}
                  href={`/tecnico/servicio/${v.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-[#1EBBEB]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-800">{titulo(v)}</p>
                    <p className="truncate text-sm text-neutral-500">{v.sistemas_instalados?.direccion}</p>
                    <p className="text-xs text-neutral-400">
                      {v.sistemas_instalados?.clientes?.nombre}
                      {v.sistemas_instalados?.clientes?.telefono ? ` · ${v.sistemas_instalados.clientes.telefono}` : ""}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    {rangoHorario(v.inicio_programado as string, v.duracion_minutos)}
                  </span>
                </Link>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

import { firmarEvidencias } from "@/lib/evidencias-servidor";
import { createClient } from "@/lib/supabase/server";
import { SolicitarMantenimientoButton } from "../solicitar-mantenimiento-button";
import { HistorialServicios } from "../historial-servicios";
import { BarrioForm } from "../barrio-form";
import { estadoClub } from "../club-blufil-niveles";
import { ETIQUETA_SISTEMA, formatoFecha, plazoMantenimiento } from "../tipos";
import type { SistemaInstalado } from "../tipos";

export default async function EquiposPage() {
  const supabase = await createClient();

  const [{ data: cliente }, { data: sistemas }, { data: proximos }] = await Promise.all([
    supabase.from("clientes").select("id, nombre").maybeSingle(),
    supabase
      .from("sistemas_instalados")
      .select(
        "id, tipo, direccion, barrio, fecha_instalacion, club_blufil(conteo_mantenimientos, nivel_descuento, racha_vigente_hasta), servicios(id, tipo, estado, valor_cobrado, descuento_aplicado, reporte_ia, proxima_fecha_mantenimiento, created_at, fotos, numero_orden, tecnicos(nombre))",
      )
      .order("fecha_instalacion", { ascending: false })
      .returns<SistemaInstalado[]>(),
    supabase.from("proximo_mantenimiento").select("sistema_instalado_id, proximo_mantenimiento"),
  ]);

  // Fecha del próximo mantenimiento de cada equipo (6 meses desde su último servicio).
  const proximoPorEquipo = new Map((proximos ?? []).map((p) => [p.sistema_instalado_id as string, p.proximo_mantenimiento as string]));

  if (!cliente) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">
          Ingresaste correctamente, pero todavía no encontramos un perfil de cliente
          asociado a tu cuenta.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Escríbenos por WhatsApp y lo activamos.
        </p>
      </div>
    );
  }

  const todasLasFotos = (sistemas ?? []).flatMap((s) => s.servicios ?? []).flatMap((sv) => sv.fotos ?? []);
  const urlsFotos = todasLasFotos.length > 0 ? await firmarEvidencias(supabase, todasLasFotos) : {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Mis equipos</h1>
        <p className="text-sm text-neutral-500">Tus sistemas Blufil instalados y su historial.</p>
      </div>

      {!sistemas || sistemas.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-neutral-600">
            Todavía no tienes sistemas registrados en tu perfil.
          </p>
        </div>
      ) : (
        sistemas.map((sistema) => {
          const club = sistema.club_blufil;
          const estadoDelClub = estadoClub(club);
          const serviciosDesc = [...(sistema.servicios ?? [])]
            .filter((s) => s.estado !== "cancelada")
            .sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          const serviciosAsc = [...serviciosDesc].reverse();

          const tieneMantenimientoEnCurso = serviciosDesc.some(
            (s) => s.tipo === "mantenimiento" && ["pendiente", "asignada", "en_progreso"].includes(s.estado),
          );

          const plazo = plazoMantenimiento(proximoPorEquipo.get(sistema.id));

          return (
            <section
              key={sistema.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/sistemas/${sistema.tipo}.svg`}
                    alt={ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}
                    className="h-14 w-14 flex-shrink-0 rounded-full"
                  />
                  <div>
                    <h2 className="font-semibold text-neutral-900">
                      {ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}
                    </h2>
                    <p className="text-sm text-neutral-500">{sistema.direccion}</p>
                    <BarrioForm sistemaInstaladoId={sistema.id} barrioActual={sistema.barrio} />
                    {sistema.fecha_instalacion && (
                      <p className="text-xs text-neutral-400">
                        Instalado el {formatoFecha.format(new Date(sistema.fecha_instalacion))}
                      </p>
                    )}
                    {tieneMantenimientoEnCurso ? (
                      <span className="mt-1 inline-block rounded-full bg-[#eaf7fb] px-2 py-0.5 text-xs font-medium text-[#123C5B]">
                        Mantenimiento en curso
                      </span>
                    ) : (
                      plazo && (
                        <p className="mt-1">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              plazo.vencido
                                ? "bg-red-100 text-red-700"
                                : plazo.cercano
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            Próximo mantenimiento: {plazo.texto}
                          </span>
                        </p>
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {club && (
                    <div className="rounded-lg bg-[#eaf7fb] px-3 py-2 text-right text-xs text-[#123C5B]">
                      <p className="font-semibold">Club Blufil · {estadoDelClub.nivel}%</p>
                      <p className="text-neutral-500">
                        {estadoDelClub.vencida
                          ? "Racha vencida"
                          : `Mantenimiento #${club.conteo_mantenimientos}`}
                      </p>
                    </div>
                  )}
                  {tieneMantenimientoEnCurso ? (
                    <p className="text-xs font-medium text-[#1a8fac]">
                      Ya tienes una solicitud de mantenimiento en curso.
                    </p>
                  ) : (
                    <SolicitarMantenimientoButton sistemaInstaladoId={sistema.id} />
                  )}
                </div>
              </div>

              <h3 className="mt-4 text-sm font-medium text-neutral-700">Historial del equipo</h3>
              <p className="text-xs text-neutral-400">
                Cada instalación y mantenimiento realizado, con el detalle de lo que hizo el técnico.
              </p>
              <HistorialServicios servicios={serviciosAsc} fotoUrls={urlsFotos} />
            </section>
          );
        })
      )}
    </div>
  );
}

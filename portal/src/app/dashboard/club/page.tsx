import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SISTEMA } from "../tipos";
import { NIVELES_CLUB_BLUFIL, TOPE_NIVEL_CLUB_BLUFIL } from "../club-blufil-niveles";
import { SolicitarMantenimientoButton } from "../solicitar-mantenimiento-button";
import { DropletMilestone } from "./droplet-milestone";

type SistemaConClub = {
  id: string;
  tipo: string;
  direccion: string;
  club_blufil: { conteo_mantenimientos: number; nivel_descuento: number } | null;
  servicios: { tipo: string; estado: string }[];
};

export default async function ClubBlufilPage() {
  const supabase = await createClient();

  const { data: cliente } = await supabase.from("clientes").select("id").maybeSingle();

  if (!cliente) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">Todavía no encontramos un perfil de cliente asociado a tu cuenta.</p>
      </div>
    );
  }

  const { data: sistemas } = await supabase
    .from("sistemas_instalados")
    .select("id, tipo, direccion, club_blufil(conteo_mantenimientos, nivel_descuento), servicios(tipo, estado)")
    .returns<SistemaConClub[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Club Blufil</h1>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fotos/tecnico-mantenimiento.jpg"
          alt="Técnico Blufil revisando un sistema de filtración"
          className="h-40 w-full object-cover"
        />
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[#123C5B]">
            El agua que tomas hoy no es la misma que filtraste hace un año
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Un filtro no deja de funcionar de un día para otro — pierde efectividad poco a poco, y
            con el tiempo puede terminar siendo el lugar donde se acumula justo lo que se supone
            que debía detener. Por eso el mantenimiento periódico no es un trámite: es lo que
            mantiene tu sistema haciendo el trabajo por el que lo instalaste, y lo que protege el
            agua que toma tu familia todos los días. Cada mantenimiento con Blufil también te
            acerca a un descuento más alto en el Club Blufil.
          </p>
        </div>
      </section>

      {!sistemas || sistemas.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-neutral-600">Todavía no tienes sistemas registrados en tu perfil.</p>
        </div>
      ) : (
        sistemas.map((sistema) => {
          const conteo = sistema.club_blufil?.conteo_mantenimientos ?? 0;
          const nivelActual = sistema.club_blufil?.nivel_descuento ?? 0;
          const enTope = conteo >= TOPE_NIVEL_CLUB_BLUFIL;
          const proximoNivel = enTope ? null : NIVELES_CLUB_BLUFIL[conteo + 1];
          const tieneMantenimientoEnCurso = (sistema.servicios ?? []).some(
            (s) => s.tipo === "mantenimiento" && s.estado !== "completada",
          );

          return (
            <section
              key={sistema.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-neutral-900">
                    {ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}
                  </h2>
                  <p className="text-sm text-neutral-500">{sistema.direccion}</p>
                </div>
                {!enTope &&
                  (tieneMantenimientoEnCurso ? (
                    <p className="text-xs font-medium text-[#1a8fac]">
                      Ya tienes una solicitud de mantenimiento en curso.
                    </p>
                  ) : (
                    <SolicitarMantenimientoButton sistemaInstaladoId={sistema.id} />
                  ))}
              </div>

              <div className="mt-5 flex justify-between px-1">
                {NIVELES_CLUB_BLUFIL.slice(1).map((nivel, i) => {
                  const numeroNivel = i + 1;
                  return (
                    <DropletMilestone
                      key={numeroNivel}
                      nivel={nivel}
                      alcanzado={conteo >= numeroNivel}
                      esActual={conteo === numeroNivel - 1 && !enTope}
                    />
                  );
                })}
              </div>

              <p className="mt-4 text-sm text-neutral-700">
                Nivel actual: <span className="font-semibold text-[#123C5B]">{nivelActual}%</span>
                {enTope ? (
                  " · Ya llegaste al tope máximo — seguimos cuidando tu sistema en cada visita."
                ) : conteo === 0 ? (
                  <> · Tu primer mantenimiento te da acceso al Club Blufil.</>
                ) : (
                  <>
                    {" "}
                    · Te falta menos de lo que crees: con tu próximo mantenimiento subes de{" "}
                    <strong>{nivelActual}%</strong> a <strong>{proximoNivel}%</strong>.
                  </>
                )}
              </p>
            </section>
          );
        })
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-900">Cómo funciona</h2>
        <p className="mt-1 text-sm text-neutral-500">
          El descuento aplica sobre el valor del servicio de mantenimiento, y sube con cada mantenimiento
          que hagas dentro de la ventana recomendada.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-400">
                <th className="py-2 font-medium">Mantenimiento #</th>
                <th className="py-2 font-medium">Descuento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {NIVELES_CLUB_BLUFIL.slice(1).map((nivel, i) => (
                <tr key={i}>
                  <td className="py-2 text-neutral-700">
                    {i + 1}
                    {i + 1 === TOPE_NIVEL_CLUB_BLUFIL ? " en adelante" : "°"}
                  </td>
                  <td className="py-2 font-medium text-[#123C5B]">{nivel}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de ozono",
};

const ETIQUETA_SERVICIO: Record<string, string> = {
  instalacion: "Instalación",
  mantenimiento: "Mantenimiento",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  asignada: "Técnico asignado",
  en_progreso: "En progreso",
  completada: "Completado",
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

type Tecnico = { nombre: string } | null;

type Servicio = {
  id: string;
  tipo: string;
  estado: string;
  valor_cobrado: number | null;
  descuento_aplicado: number;
  reporte_ia: string | null;
  proxima_fecha_mantenimiento: string | null;
  created_at: string;
  fotos: string[];
  tecnicos: Tecnico;
};

type ClubBlufil = {
  conteo_mantenimientos: number;
  nivel_descuento: number;
  racha_vigente_hasta: string | null;
} | null;

type SistemaInstalado = {
  id: string;
  tipo: string;
  direccion: string;
  fecha_instalacion: string | null;
  club_blufil: ClubBlufil;
  servicios: Servicio[];
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("auth_user_id", user.id)
    .maybeSingle();

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

  const { data: sistemas } = await supabase
    .from("sistemas_instalados")
    .select(
      "id, tipo, direccion, fecha_instalacion, club_blufil(conteo_mantenimientos, nivel_descuento, racha_vigente_hasta), servicios(id, tipo, estado, valor_cobrado, descuento_aplicado, reporte_ia, proxima_fecha_mantenimiento, created_at, fotos, tecnicos(nombre))",
    )
    .eq("cliente_id", cliente.id)
    .order("fecha_instalacion", { ascending: false })
    .returns<SistemaInstalado[]>();

  const todasLasFotos = (sistemas ?? []).flatMap((s) => s.servicios ?? []).flatMap((sv) => sv.fotos ?? []);
  const urlsFotos = new Map<string, string>();
  if (todasLasFotos.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from("servicios-fotos")
      .createSignedUrls(todasLasFotos, 3600);
    firmadas?.forEach((f) => {
      if (f.signedUrl) urlsFotos.set(f.path ?? "", f.signedUrl);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Hola, {cliente.nombre}</h1>
        <p className="text-sm text-neutral-500">
          Este es el historial de tus sistemas Blufil.
        </p>
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
          const servicios = [...(sistema.servicios ?? [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
                  {sistema.fecha_instalacion && (
                    <p className="text-xs text-neutral-400">
                      Instalado el {formatoFecha.format(new Date(sistema.fecha_instalacion))}
                    </p>
                  )}
                </div>
                {club && (
                  <div className="rounded-lg bg-[#eaf7fb] px-3 py-2 text-right text-xs text-[#123C5B]">
                    <p className="font-semibold">Club Blufil · {club.nivel_descuento}%</p>
                    <p className="text-neutral-500">
                      Mantenimiento #{club.conteo_mantenimientos}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col divide-y divide-neutral-100">
                {servicios.length === 0 ? (
                  <p className="py-3 text-sm text-neutral-400">Sin servicios registrados.</p>
                ) : (
                  servicios.map((servicio) => (
                    <div key={servicio.id} className="flex flex-col gap-1 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-800">
                          {ETIQUETA_SERVICIO[servicio.tipo] ?? servicio.tipo} ·{" "}
                          {formatoFecha.format(new Date(servicio.created_at))}
                        </p>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {ETIQUETA_ESTADO[servicio.estado] ?? servicio.estado}
                        </span>
                      </div>
                      {servicio.tecnicos?.nombre && (
                        <p className="text-xs text-neutral-500">
                          Técnico: {servicio.tecnicos.nombre}
                        </p>
                      )}
                      {servicio.reporte_ia && (
                        <p className="text-sm text-neutral-700">{servicio.reporte_ia}</p>
                      )}
                      {servicio.fotos && servicio.fotos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {servicio.fotos.map((ruta) =>
                            urlsFotos.get(ruta) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={ruta}
                                src={urlsFotos.get(ruta)}
                                alt="Foto del servicio"
                                className="h-20 w-20 flex-shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                              />
                            ) : null,
                          )}
                        </div>
                      )}
                      {servicio.valor_cobrado != null && (
                        <p className="text-xs text-neutral-500">
                          {formatoMoneda.format(servicio.valor_cobrado)}
                          {servicio.descuento_aplicado > 0 &&
                            ` · ${servicio.descuento_aplicado}% de descuento aplicado`}
                        </p>
                      )}
                      {servicio.proxima_fecha_mantenimiento && (
                        <p className="text-xs text-[#1a8fac]">
                          Próximo mantenimiento recomendado:{" "}
                          {formatoFecha.format(new Date(servicio.proxima_fecha_mantenimiento))}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

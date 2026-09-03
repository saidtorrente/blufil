import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SolicitarMantenimientoButton } from "./solicitar-mantenimiento-button";
import { HistorialServicios } from "./historial-servicios";
import { Referidos } from "./referidos";

const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de ozono",
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DIAS_ALERTA_MANTENIMIENTO = 15;

export type Tecnico = { nombre: string } | null;

export type Servicio = {
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

function calcularAlertaMantenimiento(servicios: Servicio[]) {
  const proximaFecha = servicios
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((s) => s.proxima_fecha_mantenimiento)?.proxima_fecha_mantenimiento;

  if (!proximaFecha) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${proximaFecha}T00:00:00`);
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

  if (dias > DIAS_ALERTA_MANTENIMIENTO) return null;

  return {
    vencido: dias < 0,
    texto: dias < 0 ? "Mantenimiento vencido" : `Próximo mantenimiento: ${formatoFecha.format(fecha)}`,
  };
}

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
    .select("id, nombre, codigo_referido")
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

  const { data: referidos } = await supabase
    .from("referidos")
    .select("id, estado, created_at, referido:clientes!referidos_referido_cliente_id_fkey(nombre)")
    .eq("referente_cliente_id", cliente.id)
    .order("created_at", { ascending: false })
    .returns<{ id: string; estado: string; created_at: string; referido: { nombre: string } | null }[]>();

  const todasLasFotos = (sistemas ?? []).flatMap((s) => s.servicios ?? []).flatMap((sv) => sv.fotos ?? []);
  const urlsFotos: Record<string, string> = {};
  if (todasLasFotos.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from("servicios-fotos")
      .createSignedUrls(todasLasFotos, 3600);
    firmadas?.forEach((f) => {
      if (f.signedUrl && f.path) urlsFotos[f.path] = f.signedUrl;
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
          const serviciosDesc = [...(sistema.servicios ?? [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          const serviciosAsc = [...serviciosDesc].reverse();

          const tieneMantenimientoEnCurso = serviciosDesc.some(
            (s) => s.tipo === "mantenimiento" && s.estado !== "completada",
          );

          const alerta = calcularAlertaMantenimiento(serviciosDesc);

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
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-neutral-900">
                        {ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}
                      </h2>
                      {alerta && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            alerta.vencido
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {alerta.texto}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">{sistema.direccion}</p>
                    {sistema.fecha_instalacion && (
                      <p className="text-xs text-neutral-400">
                        Instalado el {formatoFecha.format(new Date(sistema.fecha_instalacion))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {club && (
                    <div className="rounded-lg bg-[#eaf7fb] px-3 py-2 text-right text-xs text-[#123C5B]">
                      <p className="font-semibold">Club Blufil · {club.nivel_descuento}%</p>
                      <p className="text-neutral-500">
                        Mantenimiento #{club.conteo_mantenimientos}
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

              <HistorialServicios servicios={serviciosAsc} fotoUrls={urlsFotos} />
            </section>
          );
        })
      )}

      <Referidos codigo={cliente.codigo_referido} referidos={referidos ?? []} />
    </div>
  );
}

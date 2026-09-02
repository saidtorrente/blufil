import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AceptarButton } from "./aceptar-button";

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

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

type SistemaInfo = { tipo: string; direccion: string; clientes: { nombre: string; telefono: string | null } | null };

type Servicio = {
  id: string;
  tipo: string;
  estado: string;
  tecnico_id: string | null;
  created_at: string;
  sistemas_instalados: SistemaInfo | null;
};

export default async function DashboardTecnicoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tecnico/login");
  }

  const { data: tecnico } = await supabase
    .from("tecnicos")
    .select("id, nombre")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tecnico) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">
          Ingresaste correctamente, pero todavía no encontramos un perfil de técnico
          asociado a tu cuenta.
        </p>
        <p className="mt-2 text-sm text-neutral-500">Contacta a Blufil para activarlo.</p>
      </div>
    );
  }

  const { data: servicios } = await supabase
    .from("servicios")
    .select(
      "id, tipo, estado, tecnico_id, created_at, sistemas_instalados(tipo, direccion, clientes(nombre, telefono))",
    )
    .order("created_at", { ascending: true })
    .returns<Servicio[]>();

  const asignados = (servicios ?? []).filter(
    (s) => s.tecnico_id === tecnico.id && (s.estado === "asignada" || s.estado === "en_progreso"),
  );
  const disponibles = (servicios ?? []).filter((s) => s.tecnico_id === null && s.estado === "pendiente");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Hola, {tecnico.nombre}</h1>
        <p className="text-sm text-neutral-500">Tus visitas y las solicitudes disponibles.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-800">Mis visitas asignadas</h2>
        {asignados.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
            No tienes visitas asignadas por ahora.
          </p>
        ) : (
          asignados.map((s) => (
            <Link
              key={s.id}
              href={`/tecnico/servicio/${s.id}`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-[#1EBBEB]"
            >
              <div>
                <p className="font-medium text-neutral-800">
                  {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo} ·{" "}
                  {s.sistemas_instalados ? ETIQUETA_SISTEMA[s.sistemas_instalados.tipo] : ""}
                </p>
                <p className="text-sm text-neutral-500">{s.sistemas_instalados?.direccion}</p>
                {s.sistemas_instalados?.clientes && (
                  <p className="text-xs text-neutral-400">
                    {s.sistemas_instalados.clientes.nombre}
                    {s.sistemas_instalados.clientes.telefono
                      ? ` · ${s.sistemas_instalados.clientes.telefono}`
                      : ""}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-[#eaf7fb] px-3 py-1 text-xs font-medium text-[#123C5B]">
                {s.estado === "en_progreso" ? "En progreso" : "Asignada"}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-neutral-800">Solicitudes disponibles</h2>
        {disponibles.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
            No hay solicitudes pendientes por ahora.
          </p>
        ) : (
          disponibles.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div>
                <p className="font-medium text-neutral-800">
                  {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo} ·{" "}
                  {s.sistemas_instalados ? ETIQUETA_SISTEMA[s.sistemas_instalados.tipo] : ""}
                </p>
                <p className="text-sm text-neutral-500">{s.sistemas_instalados?.direccion}</p>
                <p className="text-xs text-neutral-400">
                  Solicitado el {formatoFecha.format(new Date(s.created_at))}
                </p>
              </div>
              <AceptarButton servicioId={s.id} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}

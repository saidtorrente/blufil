import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioCompletar } from "./formulario";
import { AceptarButton } from "../../dashboard/aceptar-button";

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

export default async function ServicioTecnicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tecnico/login");
  }

  const { data: tecnico } = await supabase
    .from("tecnicos")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const { data: servicio } = await supabase
    .from("servicios")
    .select(
      "id, tipo, estado, tecnico_id, sistemas_instalados(tipo, direccion, barrio, clientes(nombre, telefono, ciudad))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!servicio) {
    notFound();
  }

  const sistema = Array.isArray(servicio.sistemas_instalados)
    ? servicio.sistemas_instalados[0]
    : servicio.sistemas_instalados;
  // Descuento del Club Blufil que corresponde a este mantenimiento (0 si es
  // el primero o si la racha de 6 meses ya venció).
  let descuentoSugerido = 0;
  if (
    servicio.tipo === "mantenimiento" &&
    servicio.tecnico_id &&
    servicio.tecnico_id === tecnico?.id &&
    ["asignada", "en_progreso"].includes(servicio.estado)
  ) {
    const { data } = await supabase.rpc("descuento_sugerido", { p_servicio_id: servicio.id });
    descuentoSugerido = Number(data ?? 0);
  }

  const cliente = sistema?.clientes
    ? Array.isArray(sistema.clientes)
      ? sistema.clientes[0]
      : sistema.clientes
    : null;

  // Mientras el servicio no esté asignado a este técnico, no se muestran
  // nombre/teléfono/dirección exacta del cliente — solo lo necesario para
  // decidir si aceptar. Los datos completos aparecen recién al aceptar
  // (mismo criterio que la lista de "Solicitudes disponibles").
  const asignadoAMi = tecnico?.id === servicio.tecnico_id;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="font-semibold text-[#123C5B]">
          {ETIQUETA_SERVICIO[servicio.tipo] ?? servicio.tipo}
          {sistema ? ` · ${ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}` : ""}
        </h1>
        {asignadoAMi ? (
          <>
            <p className="mt-1 text-sm text-neutral-500">{sistema?.direccion}</p>
            {cliente && (
              <p className="mt-1 text-sm text-neutral-500">
                {cliente.nombre}
                {cliente.telefono ? ` · ${cliente.telefono}` : ""}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            {[sistema?.barrio, cliente?.ciudad].filter(Boolean).join(", ") || "Ubicación por confirmar"}
          </p>
        )}
      </div>

      {servicio.estado === "cancelada" ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Esta solicitud fue cancelada.
        </div>
      ) : !asignadoAMi ? (
        servicio.estado === "pendiente" ? (
          <div className="flex items-center justify-between rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-neutral-500">
              Todavía no has aceptado este servicio.
            </p>
            <AceptarButton servicioId={servicio.id} />
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
            Este servicio ya fue tomado por otro técnico.
          </div>
        )
      ) : servicio.estado === "completada" ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Este servicio ya quedó marcado como completado.
        </div>
      ) : (
        <FormularioCompletar servicioId={servicio.id} descuentoSugerido={descuentoSugerido} />
      )}
    </div>
  );
}

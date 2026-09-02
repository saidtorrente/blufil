import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioCompletar } from "./formulario";

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

  const { data: servicio } = await supabase
    .from("servicios")
    .select(
      "id, tipo, estado, sistemas_instalados(tipo, direccion, clientes(nombre, telefono))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!servicio) {
    notFound();
  }

  const sistema = Array.isArray(servicio.sistemas_instalados)
    ? servicio.sistemas_instalados[0]
    : servicio.sistemas_instalados;
  const cliente = sistema?.clientes
    ? Array.isArray(sistema.clientes)
      ? sistema.clientes[0]
      : sistema.clientes
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="font-semibold text-[#123C5B]">
          {ETIQUETA_SERVICIO[servicio.tipo] ?? servicio.tipo}
          {sistema ? ` · ${ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}` : ""}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{sistema?.direccion}</p>
        {cliente && (
          <p className="mt-1 text-sm text-neutral-500">
            {cliente.nombre}
            {cliente.telefono ? ` · ${cliente.telefono}` : ""}
          </p>
        )}
      </div>

      {servicio.estado === "completada" ? (
        <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Este servicio ya quedó marcado como completado.
        </div>
      ) : (
        <FormularioCompletar servicioId={servicio.id} />
      )}
    </div>
  );
}

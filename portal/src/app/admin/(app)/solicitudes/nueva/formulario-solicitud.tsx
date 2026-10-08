"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, Mensaje, Seleccion, valorDe } from "../../../campos";
import { crearSolicitud } from "./actions";

export type OpcionEquipo = { id: string; etiqueta: string };
export type OpcionTecnico = { id: string; etiqueta: string };

export function FormularioSolicitud({
  equipos,
  tecnicos,
  equipoInicial,
}: {
  equipos: OpcionEquipo[];
  tecnicos: OpcionTecnico[];
  equipoInicial?: string;
}) {
  const [estado, formAction, pendiente] = useActionState(crearSolicitud, null);
  const v = (nombre: string, inicial?: string | null) => valorDe(estado, nombre, inicial);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="grid gap-4 md:grid-cols-2">
        <Seleccion
          etiqueta="Equipo"
          nombre="sistema_id"
          valor={v("sistema_id", equipoInicial ?? equipos[0]?.id)}
          opciones={equipos.map((e) => ({ valor: e.id, etiqueta: e.etiqueta }))}
          requerido
        />
        <Seleccion
          etiqueta="Tipo de servicio"
          nombre="tipo"
          valor={v("tipo", "mantenimiento")}
          opciones={[
            { valor: "mantenimiento", etiqueta: "Mantenimiento" },
            { valor: "instalacion", etiqueta: "Instalación" },
          ]}
          requerido
          ayuda="La instalación es solo para equipos que aún no se han instalado."
        />
        <Campo
          etiqueta="Fecha deseada"
          nombre="fecha"
          tipo="date"
          valor={v("fecha")}
          ayuda="Opcional. La que acordó el cliente por teléfono."
        />
        <Seleccion
          etiqueta="Técnico"
          nombre="tecnico_id"
          valor={v("tecnico_id")}
          opciones={[{ valor: "", etiqueta: "Sin asignar: avisar a los técnicos" }, ...tecnicos.map((t) => ({ valor: t.id, etiqueta: t.etiqueta }))]}
          ayuda="Si lo dejas sin asignar, los técnicos de la ciudad reciben el aviso por correo y uno la acepta."
        />
      </div>

      <div className="flex items-center gap-4">
        <BotonEnviar pendiente={pendiente}>Crear solicitud</BotonEnviar>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

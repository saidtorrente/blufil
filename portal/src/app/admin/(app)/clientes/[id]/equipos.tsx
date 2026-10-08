"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, Mensaje, Seleccion, valorDe } from "../../../campos";
import { actualizarEquipo, agregarEquipo } from "../actions";

const TIPOS = [
  { valor: "", etiqueta: "Elige un equipo…" },
  { valor: "doble_filtracion", etiqueta: "Doble filtración" },
  { valor: "ultrafiltracion", etiqueta: "Ultrafiltración" },
  { valor: "osmosis_inversa", etiqueta: "Ósmosis inversa" },
  { valor: "dispensador", etiqueta: "Dispensador sin botellón" },
  { valor: "ozono", etiqueta: "Purificador de ozono" },
];

export type EquipoInicial = {
  id: string;
  tipo: string;
  direccion: string;
  barrio: string | null;
  fecha_instalacion: string | null;
};

export function FormularioEquipo({
  clienteId,
  equipo,
  direccionSugerida,
}: {
  clienteId: string;
  equipo?: EquipoInicial;
  direccionSugerida?: string | null;
}) {
  const accion = equipo ? actualizarEquipo.bind(null, equipo.id, clienteId) : agregarEquipo.bind(null, clienteId);
  const [estado, formAction, pendiente] = useActionState(accion, null);
  const v = (nombre: string, inicial?: string | null) => valorDe(estado, nombre, inicial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Seleccion etiqueta="Equipo" nombre="tipo" valor={v("tipo", equipo?.tipo)} opciones={TIPOS} requerido />
        <Campo etiqueta="Fecha de instalación" nombre="fecha_instalacion" tipo="date" valor={v("fecha_instalacion", equipo?.fecha_instalacion)} ayuda="Déjala vacía si aún no se instala." />
        <Campo etiqueta="Dirección del equipo" nombre="direccion" valor={v("direccion", equipo?.direccion ?? direccionSugerida)} requerido />
        <Campo etiqueta="Barrio" nombre="barrio" valor={v("barrio", equipo?.barrio)} ayuda="Es lo que ven los técnicos antes de aceptar el servicio." />
      </div>
      <div className="flex items-center gap-4">
        <BotonEnviar pendiente={pendiente}>{equipo ? "Guardar equipo" : "Agregar equipo"}</BotonEnviar>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

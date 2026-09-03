"use client";

import { useState } from "react";
import type { Servicio } from "./tipos";
import { formatoFecha, formatoMoneda } from "./tipos";
import { NIVELES_CLUB_BLUFIL } from "./club-blufil-niveles";

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

export function HistorialServicios({
  servicios,
  fotoUrls,
}: {
  servicios: Servicio[];
  fotoUrls: Record<string, string>;
}) {
  const [seleccionado, setSeleccionado] = useState<string | null>(
    servicios.length > 0 ? servicios[servicios.length - 1].id : null,
  );

  if (servicios.length === 0) {
    return <p className="mt-4 text-sm text-neutral-400">Sin servicios registrados.</p>;
  }

  let contadorMantenimientos = 0;
  const pasos = servicios.map((servicio) => {
    let nivel: number | null = null;
    if (servicio.tipo === "mantenimiento" && servicio.estado === "completada") {
      contadorMantenimientos += 1;
      nivel = NIVELES_CLUB_BLUFIL[Math.min(contadorMantenimientos, NIVELES_CLUB_BLUFIL.length - 1)];
    }
    return { servicio, nivel };
  });

  const activo = servicios.find((s) => s.id === seleccionado) ?? servicios[servicios.length - 1];

  return (
    <div className="mt-4 flex flex-col gap-4 md:flex-row">
      <div className="flex gap-2 overflow-x-auto pb-2 md:w-56 md:flex-shrink-0 md:flex-col md:overflow-visible md:pb-0">
        {pasos.map(({ servicio, nivel }) => {
          const esActivo = servicio.id === activo.id;
          return (
            <button
              key={servicio.id}
              type="button"
              onClick={() => setSeleccionado(servicio.id)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                esActivo ? "bg-[#eaf7fb] ring-1 ring-[#1EBBEB]" : "hover:bg-neutral-50"
              }`}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  servicio.tipo === "instalacion"
                    ? "bg-[#123C5B] text-white"
                    : servicio.estado === "completada"
                      ? "bg-[#1EBBEB] text-white"
                      : "border border-dashed border-neutral-300 text-neutral-400"
                }`}
              >
                {servicio.tipo === "instalacion" ? "Inst." : nivel !== null ? `${nivel}%` : "…"}
              </span>
              <span className="flex flex-col whitespace-nowrap">
                <span className="text-xs font-medium text-neutral-700">
                  {ETIQUETA_SERVICIO[servicio.tipo] ?? servicio.tipo}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {formatoFecha.format(new Date(servicio.created_at))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 rounded-lg bg-neutral-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-neutral-800">
            {ETIQUETA_SERVICIO[activo.tipo] ?? activo.tipo} ·{" "}
            {formatoFecha.format(new Date(activo.created_at))}
          </p>
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            {ETIQUETA_ESTADO[activo.estado] ?? activo.estado}
          </span>
        </div>
        {activo.tecnicos?.nombre && (
          <p className="mt-2 text-xs text-neutral-500">Técnico: {activo.tecnicos.nombre}</p>
        )}
        {activo.reporte_ia && <p className="mt-2 text-sm text-neutral-700">{activo.reporte_ia}</p>}
        {activo.fotos && activo.fotos.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto py-1">
            {activo.fotos.map((ruta) =>
              fotoUrls[ruta] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={ruta}
                  src={fotoUrls[ruta]}
                  alt="Foto del servicio"
                  className="h-20 w-20 flex-shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                />
              ) : null,
            )}
          </div>
        )}
        {activo.valor_cobrado != null && (
          <p className="mt-2 text-xs text-neutral-500">
            {formatoMoneda.format(activo.valor_cobrado)}
            {activo.descuento_aplicado > 0 && ` · ${activo.descuento_aplicado}% de descuento aplicado`}
          </p>
        )}
        {activo.proxima_fecha_mantenimiento && (
          <p className="mt-2 text-xs text-[#1a8fac]">
            Próximo mantenimiento recomendado:{" "}
            {formatoFecha.format(new Date(activo.proxima_fecha_mantenimiento))}
          </p>
        )}
      </div>
    </div>
  );
}

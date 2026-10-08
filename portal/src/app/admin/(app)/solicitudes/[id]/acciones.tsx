"use client";

import { useState, useTransition } from "react";
import { asignarTecnico, cancelarSolicitud, devolverAPendiente, reintentarFactura } from "./actions";

type TecnicoOpcion = { id: string; nombre: string; ciudad: string | null; disponible: boolean };

type Props = {
  servicioId: string;
  estado: string;
  tecnicoActualId: string | null;
  tecnicos: TecnicoOpcion[];
  puedeEscribir: boolean;
  puedeFacturar: boolean;
};

export function AccionesSolicitud({ servicioId, estado, tecnicoActualId, tecnicos, puedeEscribir, puedeFacturar }: Props) {
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [tecnicoElegido, setTecnicoElegido] = useState(tecnicoActualId ?? "");

  const editable = ["pendiente", "asignada", "en_progreso"].includes(estado);

  function ejecutar(accion: () => Promise<string | null>, textoExito: string, confirmacion?: string) {
    if (confirmacion && !window.confirm(confirmacion)) return;
    setMensaje(null);
    startTransition(async () => {
      const error = await accion();
      setMensaje(error ? { texto: error, ok: false } : { texto: textoExito, ok: true });
    });
  }

  if (!puedeEscribir) {
    return (
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Acciones</h2>
        <p className="mt-2 text-sm text-neutral-500">Tu nivel de acceso es de solo lectura: puedes consultar pero no modificar.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-neutral-800">Acciones</h2>

      {editable && (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-600" htmlFor="tecnico">
            {tecnicoActualId ? "Reasignar a otro técnico" : "Asignar un técnico"}
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id="tecnico"
              value={tecnicoElegido}
              onChange={(e) => setTecnicoElegido(e.target.value)}
              className="min-w-52 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#1EBBEB]"
            >
              <option value="">Elige un técnico…</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.ciudad ? ` · ${t.ciudad}` : ""}
                  {t.disponible ? "" : " (no disponible)"}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                ejecutar(
                  () => asignarTecnico(servicioId, tecnicoElegido),
                  "Técnico asignado.",
                  tecnicoActualId && tecnicoElegido !== tecnicoActualId
                    ? "Esta solicitud ya tiene técnico. ¿Reasignarla a otro?"
                    : undefined,
                )
              }
              disabled={pending || !tecnicoElegido || tecnicoElegido === tecnicoActualId}
              className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-50"
            >
              {tecnicoActualId ? "Reasignar" : "Asignar"}
            </button>
          </div>
          {tecnicos.length === 0 && <p className="text-xs text-neutral-400">No hay técnicos certificados todavía.</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {editable && tecnicoActualId && (
          <button
            onClick={() =>
              ejecutar(
                () => devolverAPendiente(servicioId),
                "Quedó sin técnico y se avisó a los técnicos disponibles.",
                "Se le quitará el técnico y se avisará de nuevo a los técnicos disponibles. ¿Continuar?",
              )
            }
            disabled={pending}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Devolver a «sin técnico»
          </button>
        )}
        {editable && (
          <button
            onClick={() =>
              ejecutar(
                () => cancelarSolicitud(servicioId),
                "Solicitud cancelada.",
                "¿Cancelar esta solicitud? El cliente podrá pedir otra después.",
              )
            }
            disabled={pending}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            Cancelar solicitud
          </button>
        )}
        {puedeFacturar && (
          <button
            onClick={() =>
              ejecutar(
                () => reintentarFactura(servicioId),
                "Factura emitida en Siigo.",
                "Se emitirá una factura electrónica REAL en Siigo para esta visita. ¿Continuar?",
              )
            }
            disabled={pending}
            className="rounded-lg bg-[#1EBBEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf] disabled:opacity-50"
          >
            Emitir factura
          </button>
        )}
      </div>

      {!editable && !puedeFacturar && (
        <p className="text-sm text-neutral-500">Esta solicitud ya no admite cambios.</p>
      )}

      {pending && <p className="text-sm text-neutral-500">Procesando…</p>}
      {mensaje && <p className={`text-sm ${mensaje.ok ? "text-green-700" : "text-red-600"}`}>{mensaje.texto}</p>}
    </section>
  );
}

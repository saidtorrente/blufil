"use client";

import { useState, useTransition } from "react";
import { DURACIONES, DURACION_POR_TIPO } from "@/lib/agenda";
import { confirmarPropuesta, programarVisita } from "./actions";

type TecnicoOpcion = { id: string; nombre: string; ciudad: string | null; disponible: boolean };

const ENTRADA =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]";

export function FormularioProgramar({
  servicioId,
  tipo,
  tecnicoActualId,
  tecnicos,
  fechaInicial,
  horaInicial,
  duracionInicial,
  agendaEstado,
  resumenActual,
  fechaDeseada,
}: {
  servicioId: string;
  tipo: string;
  tecnicoActualId: string | null;
  tecnicos: TecnicoOpcion[];
  fechaInicial: string;
  horaInicial: string;
  duracionInicial: number | null;
  agendaEstado: string;
  resumenActual: string | null;
  fechaDeseada: string | null;
}) {
  const [pendiente, startTransition] = useTransition();
  const [tecnico, setTecnico] = useState(tecnicoActualId ?? "");
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState(horaInicial);
  const [duracion, setDuracion] = useState(duracionInicial ?? DURACION_POR_TIPO[tipo] ?? 90);
  const [cruce, setCruce] = useState(false);
  const [forzar, setForzar] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);

  // Al cambiar cualquier dato, el cruce anterior ya no aplica: se vuelve a validar.
  function reiniciarCruce() {
    setCruce(false);
    setForzar(false);
  }

  function resolver(accion: () => ReturnType<typeof programarVisita>) {
    setMensaje(null);
    startTransition(async () => {
      const resultado = await accion();
      if (resultado.error) {
        setMensaje({ texto: resultado.error, ok: false });
        setCruce(Boolean(resultado.cruce));
      } else {
        setCruce(false);
        setForzar(false);
        setMensaje({ texto: resultado.aviso ?? "Listo.", ok: true });
      }
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5" id="agenda">
      <div>
        <h2 className="font-semibold text-neutral-800">Agenda de la visita</h2>
        {resumenActual ? (
          <p className="mt-1 text-sm text-neutral-600">
            {resumenActual}{" "}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                agendaEstado === "confirmada" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {agendaEstado === "confirmada" ? "Confirmada" : "Por confirmar"}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            Todavía sin día ni hora.
            {fechaDeseada ? ` El cliente pidió: ${fechaDeseada}.` : ""}
          </p>
        )}
      </div>

      {agendaEstado === "propuesta" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          El técnico propuso esta hora.
          <button
            type="button"
            disabled={pendiente}
            onClick={() => resolver(() => confirmarPropuesta(servicioId))}
            className="rounded-lg bg-[#123C5B] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
          >
            Confirmar esta hora
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Técnico
          <select value={tecnico} onChange={(e) => { setTecnico(e.target.value); reiniciarCruce(); }} className={ENTRADA}>
            <option value="">Elige un técnico…</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
                {t.ciudad ? ` · ${t.ciudad}` : ""}
                {t.disponible ? "" : " (no disponible)"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Duración
          <select value={duracion} onChange={(e) => { setDuracion(Number(e.target.value)); reiniciarCruce(); }} className={ENTRADA}>
            {DURACIONES.map((d) => (
              <option key={d.minutos} value={d.minutos}>
                {d.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Día
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); reiniciarCruce(); }} className={ENTRADA} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Hora de inicio
          <input type="time" step={900} value={hora} onChange={(e) => { setHora(e.target.value); reiniciarCruce(); }} className={ENTRADA} />
        </label>
      </div>

      {cruce && (
        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={forzar}
            onChange={(e) => setForzar(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#123C5B]"
          />
          Programar de todos modos (el técnico tendrá dos visitas que se cruzan)
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pendiente || !tecnico || !fecha || !hora || (cruce && !forzar)}
          onClick={() => resolver(() => programarVisita(servicioId, tecnico, fecha, hora, duracion, forzar))}
          className="rounded-lg bg-[#1EBBEB] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf] disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : resumenActual ? "Reprogramar y avisar" : "Programar y avisar"}
        </button>
        {mensaje && <p className={`text-sm ${mensaje.ok ? "text-green-700" : "text-red-600"}`}>{mensaje.texto}</p>}
      </div>
    </section>
  );
}

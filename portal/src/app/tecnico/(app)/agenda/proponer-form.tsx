"use client";

import { useState, useTransition } from "react";
import { proponerHorario } from "./actions";

const ENTRADA =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]";

export function ProponerForm({
  servicioId,
  fechaInicial,
  horaInicial,
  etiquetaBoton,
}: {
  servicioId: string;
  fechaInicial?: string;
  horaInicial?: string;
  etiquetaBoton: string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [fecha, setFecha] = useState(fechaInicial ?? "");
  const [hora, setHora] = useState(horaInicial ?? "");
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Día
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={ENTRADA} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Hora
          <input type="time" step={900} value={hora} onChange={(e) => setHora(e.target.value)} className={ENTRADA} />
        </label>
        <button
          type="button"
          disabled={pendiente || !fecha || !hora}
          onClick={() => {
            setMensaje(null);
            startTransition(async () => {
              const r = await proponerHorario(servicioId, fecha, hora);
              setMensaje(r.error ? { texto: r.error, ok: false } : { texto: r.aviso ?? "Listo.", ok: true });
            });
          }}
          className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : etiquetaBoton}
        </button>
      </div>
      {mensaje && <p className={`text-sm ${mensaje.ok ? "text-green-700" : "text-red-600"}`}>{mensaje.texto}</p>}
    </div>
  );
}

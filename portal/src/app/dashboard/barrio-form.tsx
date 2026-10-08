"use client";

import { useState, useTransition, type FormEvent } from "react";
import { guardarBarrio } from "./actions";

export function BarrioForm({
  sistemaInstaladoId,
  barrioActual,
}: {
  sistemaInstaladoId: string;
  barrioActual: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [editando, setEditando] = useState(!barrioActual);
  const [valor, setValor] = useState(barrioActual ?? "");
  const [error, setError] = useState<string | null>(null);

  function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const resultado = await guardarBarrio(sistemaInstaladoId, valor);
      if (resultado) {
        setError(resultado);
        return;
      }
      setEditando(false);
    });
  }

  if (!editando && barrioActual) {
    return (
      <p className="mt-1 text-xs text-neutral-500">
        Barrio: <span className="font-medium text-neutral-700">{barrioActual}</span>{" "}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-[#1a8fac] underline underline-offset-2 hover:text-[#123C5B]"
        >
          Cambiar
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={guardar} className="mt-2 flex flex-col gap-1">
      <label className="text-xs text-neutral-600" htmlFor={`barrio-${sistemaInstaladoId}`}>
        ¿En qué barrio está este equipo?
      </label>
      <div className="flex gap-2">
        <input
          id={`barrio-${sistemaInstaladoId}`}
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          maxLength={80}
          placeholder="Ej: El Prado"
          className="w-44 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
        <button
          type="submit"
          disabled={pending || !valor.trim()}
          className="rounded-lg bg-[#123C5B] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <p className="text-xs text-neutral-400">
        Los técnicos solo ven el barrio y la ciudad hasta que aceptan tu servicio — nunca tu dirección ni tu teléfono antes.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

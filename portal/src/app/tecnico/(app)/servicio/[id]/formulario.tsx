"use client";

import { useActionState } from "react";
import { completarServicio } from "./actions";

export function FormularioCompletar({ servicioId }: { servicioId: string }) {
  const accionConId = completarServicio.bind(null, servicioId);
  const [error, formAction, pending] = useActionState(accionConId, null);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-neutral-800">Marcar como completado</h2>

      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Notas del servicio
        <textarea
          name="notas"
          required
          rows={4}
          placeholder="Qué se hizo, filtros cambiados, observaciones…"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Fotos del servicio
        <input
          type="file"
          name="fotos"
          accept="image/*"
          capture="environment"
          multiple
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Valor cobrado (COP)
          <input
            type="number"
            name="valor_cobrado"
            min={0}
            step={1000}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Descuento aplicado (%)
          <input
            type="number"
            name="descuento_aplicado"
            min={0}
            max={100}
            defaultValue={0}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Próximo mantenimiento recomendado
        <input
          type="date"
          name="proxima_fecha_mantenimiento"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-[#123C5B] py-2.5 font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Marcar como completado"}
      </button>
    </form>
  );
}

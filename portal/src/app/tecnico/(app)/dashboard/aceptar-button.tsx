"use client";

import { useState, useTransition } from "react";
import { aceptarServicio } from "./actions";

export function AceptarButton({ servicioId }: { servicioId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function aceptar() {
    setError(null);
    startTransition(async () => {
      const resultado = await aceptarServicio(servicioId);
      if (resultado) setError(resultado);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={aceptar}
        disabled={pending}
        className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
      >
        {pending ? "Aceptando…" : "Aceptar"}
      </button>
      {error && <p className="max-w-48 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}

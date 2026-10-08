"use client";

import { useState, useTransition } from "react";
import { confirmarPropuesta } from "./actions";

export function BotonConfirmar({ servicioId }: { servicioId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ texto: string; ok: boolean } | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          setResultado(null);
          startTransition(async () => {
            const r = await confirmarPropuesta(servicioId);
            setResultado(r.error ? { texto: r.error, ok: false } : { texto: r.aviso ?? "Confirmada.", ok: true });
          });
        }}
        className="rounded-lg bg-[#123C5B] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
      >
        {pendiente ? "Confirmando…" : "Confirmar y avisar"}
      </button>
      {resultado && <p className={`text-xs ${resultado.ok ? "text-green-700" : "text-red-600"}`}>{resultado.texto}</p>}
    </div>
  );
}

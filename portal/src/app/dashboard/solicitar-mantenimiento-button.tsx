"use client";

import { useState, useTransition } from "react";
import { solicitarMantenimiento } from "./actions";

export function SolicitarMantenimientoButton({ sistemaInstaladoId }: { sistemaInstaladoId: string }) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<"idle" | "enviado" | string>("idle");

  function solicitar() {
    startTransition(async () => {
      const resultado = await solicitarMantenimiento(sistemaInstaladoId);
      setEstado(resultado ?? "enviado");
    });
  }

  if (estado === "enviado") {
    return <p className="text-xs font-medium text-[#1a8fac]">Solicitud enviada — te contactaremos pronto.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={solicitar}
        disabled={pending}
        className="rounded-lg bg-[#1EBBEB] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#17a3cf] disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Solicitar mantenimiento"}
      </button>
      {estado !== "idle" && <p className="text-xs text-red-600">{estado}</p>}
    </div>
  );
}

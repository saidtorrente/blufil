"use client";

import { useActionState, useState, useTransition } from "react";
import { BotonEnviar, Campo, Mensaje, Seleccion, valorDe } from "../../../campos";
import { cambiarEstadoReferido, crearCuentaCliente, registrarReferido, registrarRetoma } from "../actions";

export function FormularioRetoma({ clienteId }: { clienteId: string }) {
  const [estado, formAction, pendiente] = useActionState(registrarRetoma.bind(null, clienteId), null);
  const v = (nombre: string, inicial?: string) => valorDe(estado, nombre, inicial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Campo etiqueta="Marca del equipo recibido" nombre="equipo_marca" valor={v("equipo_marca")} requerido placeholder="Ej: Pura, Aquaflex…" />
        <Campo etiqueta="Bono aplicado (COP)" nombre="bono_aplicado" tipo="number" valor={v("bono_aplicado", "50000")} inputMode="numeric" />
      </div>
      <div className="flex items-center gap-4">
        <BotonEnviar pendiente={pendiente}>Registrar retoma</BotonEnviar>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function FormularioReferido({
  clienteId,
  opciones,
}: {
  clienteId: string;
  opciones: { id: string; nombre: string }[];
}) {
  const [estado, formAction, pendiente] = useActionState(registrarReferido.bind(null, clienteId), null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Seleccion
        etiqueta="Cliente que fue referido"
        nombre="referido_cliente_id"
        valor={valorDe(estado, "referido_cliente_id")}
        opciones={[{ valor: "", etiqueta: "Elige un cliente…" }, ...opciones.map((o) => ({ valor: o.id, etiqueta: o.nombre }))]}
        requerido
        ayuda="Debe estar creado antes como cliente."
      />
      <div className="flex items-center gap-4">
        <BotonEnviar pendiente={pendiente}>Registrar referido</BotonEnviar>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

const ESTADOS_REFERIDO = [
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "instalado_pagado", etiqueta: "Instalado y pagado" },
  { valor: "credito_liberado", etiqueta: "Crédito liberado" },
];

export function SelectorEstadoReferido({
  referidoId,
  clienteId,
  estado,
  puedeEscribir,
}: {
  referidoId: string;
  clienteId: string;
  estado: string;
  puedeEscribir: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={estado}
        disabled={!puedeEscribir || pendiente}
        onChange={(e) => {
          const nuevo = e.target.value;
          setError(null);
          startTransition(async () => {
            const resultado = await cambiarEstadoReferido(referidoId, clienteId, nuevo);
            if (resultado) setError(resultado);
          });
        }}
        className="rounded-lg border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-[#1EBBEB] disabled:bg-neutral-100"
      >
        {ESTADOS_REFERIDO.map((e) => (
          <option key={e.valor} value={e.valor}>
            {e.etiqueta}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function BotonCrearCuenta({ clienteId }: { clienteId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ texto: string; ok: boolean } | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (!window.confirm("Se creará su cuenta de acceso y se le enviará un correo de confirmación. ¿Continuar?")) return;
          setResultado(null);
          startTransition(async () => {
            const error = await crearCuentaCliente(clienteId);
            setResultado(error ? { texto: error, ok: false } : { texto: "Cuenta creada y correo de confirmación enviado.", ok: true });
          });
        }}
        className="rounded-lg bg-[#1EBBEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf] disabled:opacity-60"
      >
        {pendiente ? "Creando…" : "Crear cuenta de acceso"}
      </button>
      {resultado && <p className={`text-sm ${resultado.ok ? "text-green-700" : "text-red-600"}`}>{resultado.texto}</p>}
    </div>
  );
}

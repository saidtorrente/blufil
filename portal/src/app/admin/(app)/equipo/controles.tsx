"use client";

import { useActionState, useState, useTransition } from "react";
import { BotonEnviar, Campo, Mensaje, Seleccion, valorDe } from "../../campos";
import { agregarAdmin, cambiarNivel, quitarAdmin } from "./actions";

const NIVELES = [
  { valor: "lector", etiqueta: "Solo lectura: ve todo, no cambia nada" },
  { valor: "operador", etiqueta: "Operador: crea y edita clientes, equipos, solicitudes y técnicos" },
  { valor: "superadmin", etiqueta: "Superadmin: además certifica técnicos y gestiona al equipo" },
];

export function FormularioAdmin() {
  const [estado, formAction, pendiente] = useActionState(agregarAdmin, null);
  const v = (nombre: string, inicial?: string | null) => valorDe(estado, nombre, inicial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Nombre completo" nombre="nombre" valor={v("nombre")} requerido />
        <Campo etiqueta="Correo" nombre="correo" tipo="email" inputMode="email" valor={v("correo")} requerido ayuda="Con este correo entra al panel." />
        <Seleccion etiqueta="Nivel de acceso" nombre="nivel" valor={v("nivel", "operador")} opciones={NIVELES} requerido />
      </div>
      <div className="flex items-center gap-4">
        <BotonEnviar pendiente={pendiente}>Agregar al equipo</BotonEnviar>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function ControlesAdmin({ authUserId, nivel, esYo }: { authUserId: string; nivel: string; esYo: boolean }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (esYo) return <span className="text-xs text-neutral-400">Tu cuenta</span>;

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-2">
        <select
          defaultValue={nivel}
          disabled={pendiente}
          aria-label="Nivel de acceso"
          onChange={(e) => {
            setError(null);
            const nuevo = e.target.value;
            startTransition(async () => {
              const mensaje = await cambiarNivel(authUserId, nuevo);
              if (mensaje) {
                setError(mensaje);
                e.target.value = nivel;
              }
            });
          }}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-[#1EBBEB]"
        >
          <option value="lector">Solo lectura</option>
          <option value="operador">Operador</option>
          <option value="superadmin">Superadmin</option>
        </select>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm("Esta persona dejará de tener acceso al panel de administración. ¿Continuar?")) return;
            setError(null);
            startTransition(async () => {
              const mensaje = await quitarAdmin(authUserId);
              if (mensaje) setError(mensaje);
            });
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          Quitar
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

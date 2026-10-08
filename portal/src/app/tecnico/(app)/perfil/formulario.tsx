"use client";

import { useActionState, useState } from "react";
import { actualizarPerfilTecnico } from "./actions";

type Props = {
  nombre: string;
  correo: string | null;
  ciudad: string | null;
  zona: string | null;
  disponible: boolean;
  certificado: boolean;
};

export function FormularioPerfil({ nombre, correo, ciudad, zona, disponible, certificado }: Props) {
  const [error, formAction, pending] = useActionState(actualizarPerfilTecnico, null);
  const [disponibleActivo, setDisponibleActivo] = useState(disponible);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg bg-[#f5f9fb] px-3 py-2">
        <span className="text-sm text-neutral-600">Estado de certificación</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            certificado ? "bg-[#eaf7fb] text-[#123C5B]" : "bg-amber-50 text-amber-700"
          }`}
        >
          {certificado ? "Certificado" : "En proceso de certificación"}
        </span>
      </div>

      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Nombre
        <input
          type="text"
          name="nombre"
          defaultValue={nombre}
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Correo
        <input
          type="email"
          name="correo"
          defaultValue={correo ?? ""}
          placeholder="tucorreo@ejemplo.com"
          className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
        />
        <span className="text-xs text-neutral-400">Ahí llegan los avisos de nuevas solicitudes.</span>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-700">
          Ciudad
          <input
            type="text"
            name="ciudad"
            defaultValue={ciudad ?? ""}
            placeholder="Barranquilla"
            className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-700">
          Zona
          <input
            type="text"
            name="zona"
            defaultValue={zona ?? ""}
            placeholder="Norte"
            className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-neutral-800">Disponible para nuevos trabajos</p>
          <p className="text-xs text-neutral-500">
            Si la apagas, dejas de recibir avisos de solicitudes nuevas por correo.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={disponibleActivo}
          onClick={() => setDisponibleActivo((v) => !v)}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
            disponibleActivo ? "bg-[#1EBBEB]" : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
              disponibleActivo ? "left-5" : "left-0.5"
            }`}
          />
        </button>
        <input type="hidden" name="disponible" value={disponibleActivo ? "on" : "off"} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#123C5B] py-2.5 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

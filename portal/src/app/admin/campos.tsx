// Campos de formulario del panel admin (sin estado: sirven en componentes de
// servidor y de cliente).
import type { EstadoForm } from "./tipos";

const ENTRADA =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB] disabled:bg-neutral-100 disabled:text-neutral-500";

export function valorDe(estado: EstadoForm, nombre: string, inicial?: string | null): string {
  return estado?.valores?.[nombre] ?? inicial ?? "";
}

export function Campo({
  etiqueta,
  nombre,
  valor,
  tipo = "text",
  requerido,
  placeholder,
  ayuda,
  deshabilitado,
  inputMode,
  maxLength,
}: {
  etiqueta: string;
  nombre: string;
  valor?: string;
  tipo?: string;
  requerido?: boolean;
  placeholder?: string;
  ayuda?: string;
  deshabilitado?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-neutral-700">
      <span>
        {etiqueta}
        {requerido && <span className="text-red-500"> *</span>}
      </span>
      <input
        name={nombre}
        type={tipo}
        defaultValue={valor ?? ""}
        required={requerido}
        placeholder={placeholder}
        disabled={deshabilitado}
        inputMode={inputMode}
        maxLength={maxLength}
        className={ENTRADA}
      />
      {ayuda && <span className="text-xs text-neutral-400">{ayuda}</span>}
    </label>
  );
}

export function Seleccion({
  etiqueta,
  nombre,
  valor,
  opciones,
  requerido,
  ayuda,
  deshabilitado,
}: {
  etiqueta: string;
  nombre: string;
  valor?: string;
  opciones: { valor: string; etiqueta: string }[];
  requerido?: boolean;
  ayuda?: string;
  deshabilitado?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-neutral-700">
      <span>
        {etiqueta}
        {requerido && <span className="text-red-500"> *</span>}
      </span>
      <select name={nombre} defaultValue={valor ?? ""} required={requerido} disabled={deshabilitado} className={ENTRADA}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {ayuda && <span className="text-xs text-neutral-400">{ayuda}</span>}
    </label>
  );
}

export function Casilla({
  etiqueta,
  nombre,
  marcada,
  ayuda,
  deshabilitada,
}: {
  etiqueta: string;
  nombre: string;
  marcada?: boolean;
  ayuda?: string;
  deshabilitada?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        name={nombre}
        defaultChecked={marcada}
        disabled={deshabilitada}
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#123C5B]"
      />
      <span>
        {etiqueta}
        {ayuda && <span className="block text-xs text-neutral-400">{ayuda}</span>}
      </span>
    </label>
  );
}

export function Mensaje({ estado }: { estado: EstadoForm }) {
  if (!estado) return null;
  if (estado.error) return <p className="text-sm text-red-600">{estado.error}</p>;
  if (estado.exito) return <p className="text-sm text-green-700">{estado.exito}</p>;
  return null;
}

export function BotonEnviar({ pendiente, children }: { pendiente: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pendiente}
      className="rounded-lg bg-[#123C5B] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
    >
      {pendiente ? "Guardando…" : children}
    </button>
  );
}

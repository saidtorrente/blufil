"use client";

import { useActionState, useState } from "react";
import { completarServicio } from "./actions";

export type ProductoOpcion = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number | null;
  cantidad_disponible: number | null;
};

const ENTRADA =
  "rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]";

const formatoPrecio = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function etiquetaProducto(p: ProductoOpcion) {
  const precio = p.precio != null ? ` · ${formatoPrecio.format(p.precio)}` : "";
  const stock = p.cantidad_disponible != null ? ` · stock ${p.cantidad_disponible}` : "";
  return `${p.nombre}${precio}${stock}`;
}

export function FormularioCompletar({
  servicioId,
  tipo,
  descuentoSugerido = 0,
  equipos,
  repuestos,
}: {
  servicioId: string;
  tipo: string;
  descuentoSugerido?: number;
  equipos: ProductoOpcion[];
  repuestos: ProductoOpcion[];
}) {
  const accionConId = completarServicio.bind(null, servicioId);
  const [error, formAction, pending] = useActionState(accionConId, null);
  const [filas, setFilas] = useState<number[]>([]);
  const [siguiente, setSiguiente] = useState(0);

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

      {tipo === "instalacion" && (
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Equipo instalado
          <select name="equipo_id" required defaultValue="" className={ENTRADA}>
            <option value="" disabled>
              Elige el equipo que instalaste…
            </option>
            {equipos.map((p) => (
              <option key={p.id} value={p.id}>
                {etiquetaProducto(p)}
              </option>
            ))}
          </select>
          {equipos.length === 0 && (
            <span className="text-xs text-red-600">
              No hay equipos de este tipo en el inventario. Avisa a la administración.
            </span>
          )}
          <span className="text-xs text-neutral-400">Se factura al precio de Siigo y descuenta del inventario.</span>
        </label>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm text-neutral-700">Repuestos y accesorios usados</p>
        {filas.length === 0 && <p className="text-xs text-neutral-400">Si no usaste ninguno, déjalo vacío.</p>}
        {filas.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <select name="producto_id" required defaultValue="" className={`min-w-0 flex-1 text-sm ${ENTRADA}`}>
              <option value="" disabled>
                Elige un repuesto…
              </option>
              {repuestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {etiquetaProducto(p)}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="producto_cantidad"
              min={1}
              step={1}
              defaultValue={1}
              required
              aria-label="Cantidad"
              className={`w-20 ${ENTRADA}`}
            />
            <button
              type="button"
              onClick={() => setFilas((f) => f.filter((x) => x !== id))}
              className="rounded-lg px-2 py-2 text-sm text-red-600 transition hover:bg-red-50"
              aria-label="Quitar repuesto"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setFilas((f) => [...f, siguiente]);
            setSiguiente((n) => n + 1);
          }}
          className="self-start text-sm text-[#1a8fac] underline underline-offset-2"
        >
          + Agregar repuesto
        </button>
        <p className="text-xs text-neutral-400">Se cobran aparte, al precio de Siigo, y descuentan del inventario.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Valor del servicio (mano de obra, COP)
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
            defaultValue={descuentoSugerido}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
          />
          {descuentoSugerido > 0 && (
            <span className="text-xs text-[#1a8fac]">Club Blufil del cliente: {descuentoSugerido}%</span>
          )}
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

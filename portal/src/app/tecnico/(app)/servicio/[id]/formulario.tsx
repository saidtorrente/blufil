"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { comprimirFoto, extensionDe, MAX_VIDEO_BYTES, type TipoEvidencia } from "@/lib/evidencias";
import { completarServicio, pedirSubidaEvidencia } from "./actions";

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
  const [error, formAction, enviando] = useActionState(accionConId, null);
  const [, startTransition] = useTransition();
  const [filas, setFilas] = useState<number[]>([]);
  const [siguiente, setSiguiente] = useState(0);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const pending = enviando || progreso !== null;

  // Las evidencias suben directo al almacenamiento (las fotos, ya comprimidas) y
  // al servidor solo llegan sus rutas: así no se topa con el límite de tamaño de
  // los formularios y el video puede pesar varios MB.
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorLocal(null);
    const datos = new FormData(e.currentTarget);

    const archivos = (campo: string) =>
      datos.getAll(campo).filter((f): f is File => f instanceof File && f.size > 0);
    const pendientes: { tipo: TipoEvidencia; archivo: File }[] = [
      ...archivos("ev_antes").map((archivo) => ({ tipo: "antes" as const, archivo })),
      ...archivos("ev_despues").map((archivo) => ({ tipo: "despues" as const, archivo })),
      ...archivos("ev_extra").map((archivo) => ({ tipo: "extra" as const, archivo })),
      ...archivos("ev_video").map((archivo) => ({ tipo: "video" as const, archivo })),
    ];
    for (const campo of ["ev_antes", "ev_despues", "ev_extra", "ev_video"]) datos.delete(campo);

    if (!pendientes.some((p) => p.tipo === "antes")) return setErrorLocal("Falta la foto del antes.");
    if (!pendientes.some((p) => p.tipo === "despues")) return setErrorLocal("Falta la foto del después.");
    const video = pendientes.find((p) => p.tipo === "video");
    if (video && video.archivo.size > MAX_VIDEO_BYTES) {
      return setErrorLocal("El video pesa más de 40 MB. Grábalo más corto (unos 30 segundos).");
    }

    try {
      for (let i = 0; i < pendientes.length; i++) {
        const { tipo, archivo } = pendientes[i];
        setProgreso(`Subiendo evidencias ${i + 1} de ${pendientes.length}…`);
        const { blob, extension } = tipo === "video" ? { blob: archivo as Blob, extension: extensionDe(archivo) } : await comprimirFoto(archivo);
        const permiso = await pedirSubidaEvidencia(servicioId, tipo, extension, blob.size);
        if ("error" in permiso) throw new Error(permiso.error);
        const subida = await fetch(permiso.url, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": blob.type || archivo.type || "application/octet-stream" },
        });
        if (!subida.ok) throw new Error("La subida falló.");
        datos.append("evidencia", permiso.ruta);
      }
    } catch (e) {
      setProgreso(null);
      return setErrorLocal(
        e instanceof Error && e.message !== "La subida falló." && !/fetch|network/i.test(e.message)
          ? e.message
          : "No pudimos subir una de las evidencias. Revisa la señal e intenta de nuevo.",
      );
    }

    setProgreso(null);
    startTransition(() => formAction(datos));
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
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

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-800">Evidencias</legend>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Foto del antes <span className="text-xs text-neutral-400">Cómo estaba el equipo al llegar.</span>
          <input type="file" name="ev_antes" accept="image/*" capture="environment" required className={`text-sm ${ENTRADA}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Foto del después <span className="text-xs text-neutral-400">Cómo quedó al terminar.</span>
          <input type="file" name="ev_despues" accept="image/*" capture="environment" required className={`text-sm ${ENTRADA}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Fotos adicionales <span className="text-xs text-neutral-400">Opcional: piezas cambiadas, fugas, conexiones…</span>
          <input type="file" name="ev_extra" accept="image/*" multiple className={`text-sm ${ENTRADA}`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Video corto <span className="text-xs text-neutral-400">Opcional, unos 30 segundos (máx. 40 MB).</span>
          <input type="file" name="ev_video" accept="video/*" capture="environment" className={`text-sm ${ENTRADA}`} />
        </label>
      </fieldset>

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

      {(errorLocal || error) && <p className="text-sm text-red-600">{errorLocal ?? error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-[#123C5B] py-2.5 font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
      >
        {progreso ?? (pending ? "Guardando…" : "Marcar como completado")}
      </button>
    </form>
  );
}

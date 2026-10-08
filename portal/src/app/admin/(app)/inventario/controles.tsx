"use client";

import { useState, useTransition } from "react";
import { clasificarProducto, guardarAjustes, sincronizarAhora } from "./actions";

const CATEGORIAS = [
  { valor: "sin_clasificar", etiqueta: "Sin clasificar" },
  { valor: "equipo", etiqueta: "Equipo" },
  { valor: "repuesto", etiqueta: "Repuesto" },
  { valor: "servicio", etiqueta: "Servicio" },
  { valor: "otro", etiqueta: "Otro" },
];

const TIPOS_SISTEMA = [
  { valor: "doble_filtracion", etiqueta: "Doble filtración" },
  { valor: "ultrafiltracion", etiqueta: "Ultrafiltración" },
  { valor: "osmosis_inversa", etiqueta: "Ósmosis inversa" },
  { valor: "dispensador", etiqueta: "Dispensador" },
  { valor: "ozono", etiqueta: "Ozono" },
];

const SELECT =
  "rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-[#1EBBEB] disabled:bg-neutral-100 disabled:text-neutral-500";

export function ClasificadorProducto({
  productoId,
  categoria,
  tipoSistema,
  puedeEscribir,
}: {
  productoId: string;
  categoria: string;
  tipoSistema: string | null;
  puedeEscribir: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [valorCategoria, setValorCategoria] = useState(categoria);
  const [valorTipo, setValorTipo] = useState(tipoSistema ?? "");
  const [error, setError] = useState<string | null>(null);

  function guardar(nuevaCategoria: string, nuevoTipo: string) {
    // Un equipo necesita su tipo: se guarda cuando ya se eligió.
    if (nuevaCategoria === "equipo" && !nuevoTipo) return;
    setError(null);
    startTransition(async () => {
      const mensaje = await clasificarProducto(productoId, nuevaCategoria, nuevoTipo || null);
      if (mensaje) setError(mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <select
          value={valorCategoria}
          disabled={!puedeEscribir || pendiente}
          aria-label="Categoría"
          onChange={(e) => {
            setValorCategoria(e.target.value);
            guardar(e.target.value, valorTipo);
          }}
          className={SELECT}
        >
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
        {valorCategoria === "equipo" && (
          <select
            value={valorTipo}
            disabled={!puedeEscribir || pendiente}
            aria-label="Tipo de equipo"
            onChange={(e) => {
              setValorTipo(e.target.value);
              guardar(valorCategoria, e.target.value);
            }}
            className={SELECT}
          >
            <option value="">Tipo de equipo…</option>
            {TIPOS_SISTEMA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function BotonSincronizar() {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ texto: string; ok: boolean } | null>(null);

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          setResultado(null);
          startTransition(async () => {
            const error = await sincronizarAhora();
            setResultado(error ? { texto: error, ok: false } : { texto: "Catálogo actualizado desde Siigo.", ok: true });
          });
        }}
        className="rounded-lg bg-[#1EBBEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf] disabled:opacity-60"
      >
        {pendiente ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      {resultado && <p className={`text-xs ${resultado.ok ? "text-green-700" : "text-red-600"}`}>{resultado.texto}</p>}
    </div>
  );
}

export function AjustesFacturacion({
  enviarDian,
  enviarCorreo,
  puedeEditar,
}: {
  enviarDian: boolean;
  enviarCorreo: boolean;
  puedeEditar: boolean;
}) {
  const [pendiente, startTransition] = useTransition();
  const [dian, setDian] = useState(enviarDian);
  const [correo, setCorreo] = useState(enviarCorreo);
  const [error, setError] = useState<string | null>(null);

  function cambiar(nuevoDian: boolean, nuevoCorreo: boolean) {
    setError(null);
    const anterior = { dian, correo };
    setDian(nuevoDian);
    setCorreo(nuevoCorreo);
    startTransition(async () => {
      const mensaje = await guardarAjustes(nuevoDian, nuevoCorreo);
      if (mensaje) {
        setError(mensaje);
        setDian(anterior.dian);
        setCorreo(anterior.correo);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={dian}
          disabled={!puedeEditar || pendiente}
          onChange={(e) => cambiar(e.target.checked, correo)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#123C5B]"
        />
        <span>
          Enviar las facturas a la DIAN
          <span className="block text-xs text-neutral-400">
            Apagado, Siigo deja la factura en borrador para revisarla. Una factura aceptada por la DIAN solo se corrige con nota crédito.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={correo}
          disabled={!puedeEditar || pendiente}
          onChange={(e) => cambiar(dian, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#123C5B]"
        />
        <span>
          Enviar la factura al correo del cliente
          <span className="block text-xs text-neutral-400">Siigo la envía al correo registrado del cliente.</span>
        </span>
      </label>
      {!puedeEditar && <p className="text-xs text-neutral-400">Solo un superadmin puede cambiar estos ajustes.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

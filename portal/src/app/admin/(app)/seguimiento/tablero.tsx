"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import {
  cambiarRecordatorios,
  guardarNotasSeguimiento,
  moverSeguimiento,
  posponerSeguimiento,
  registrarContacto,
} from "./actions";
import { enlaceWhatsApp } from "./whatsapp";

export type Tarjeta = {
  id: string;
  tipo: "mantenimiento" | "nuevo_cliente";
  etapa: string;
  fecha_objetivo: string;
  notas: string | null;
  ultimo_contacto_at: string | null;
  recordatorio_enviado_at: string | null;
  cerrado_at: string | null;
  clientes: { id: string; nombre: string; telefono: string | null; ciudad: string | null } | null;
  sistemas_instalados: { tipo: string; barrio: string | null } | null;
  contactos_seguimiento: { canal: string; nota: string | null; created_at: string }[];
};

type Columna = { etapa: string; titulo: string; ayuda: string; manual: boolean };

const COLUMNAS_MANTENIMIENTO: Columna[] = [
  { etapa: "por_vencer", titulo: "Por vencer", ayuda: "Le toca en 30 días o menos", manual: true },
  { etapa: "contactado", titulo: "Contactado", ayuda: "Ya hablamos con el cliente", manual: true },
  { etapa: "sin_respuesta", titulo: "Sin respuesta", ayuda: "No contestó: insistir", manual: true },
  { etapa: "agendado", titulo: "Agendado", ayuda: "Tiene solicitud: se mueve sola", manual: false },
  { etapa: "en_servicio", titulo: "En servicio", ayuda: "El técnico está en camino", manual: false },
  { etapa: "hecho", titulo: "Hecho", ayuda: "Últimos 30 días", manual: false },
];

const COLUMNAS_NUEVOS: Columna[] = [
  { etapa: "instalado", titulo: "Recién instalado", ayuda: "Esperando la llamada (a los 7 días)", manual: true },
  { etapa: "llamada", titulo: "Llamada de satisfacción", ayuda: "Ya toca llamarle", manual: true },
  { etapa: "activo", titulo: "Activo", ayuda: "Seguimiento hecho (últimos 30 días)", manual: true },
];

const CANALES = [
  { valor: "whatsapp", etiqueta: "WhatsApp" },
  { valor: "llamada", etiqueta: "Llamada" },
  { valor: "correo", etiqueta: "Correo" },
  { valor: "nota", etiqueta: "Nota" },
];

const formatoFecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
const formatoFechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

function hoyBogota(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function diasHasta(fecha: string): number {
  const dia = 24 * 3600 * 1000;
  return Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoyBogota()}T00:00:00Z`)) / dia);
}

function etiquetaPlazo(fecha: string): { texto: string; clase: string } {
  const d = diasHasta(fecha);
  if (d < 0) return { texto: `Vencido hace ${-d} día${d === -1 ? "" : "s"}`, clase: "bg-red-100 text-red-700" };
  if (d === 0) return { texto: "Vence hoy", clase: "bg-amber-100 text-amber-800" };
  if (d <= 7) return { texto: `Vence en ${d} día${d === 1 ? "" : "s"}`, clase: "bg-amber-100 text-amber-800" };
  return { texto: `Vence en ${d} días`, clase: "bg-[#eaf7fb] text-[#123C5B]" };
}

function mensajeWhatsApp(t: Tarjeta): string {
  const nombre = t.clientes?.nombre.trim().split(/\s+/)[0] ?? "";
  const equipo = ETIQUETA_SISTEMA[t.sistemas_instalados?.tipo ?? ""] ?? "equipo";
  if (t.tipo === "nuevo_cliente") {
    return `Hola ${nombre}, te escribimos de Blufil. ¿Cómo va todo con tu ${equipo}? Queremos saber si quedaste a gusto con la instalación.`;
  }
  const d = diasHasta(t.fecha_objetivo);
  const cuando = d < 0 ? "ya le toca su mantenimiento" : `le toca mantenimiento el ${formatoFecha.format(new Date(`${t.fecha_objetivo}T12:00:00-05:00`))}`;
  return `Hola ${nombre}, te escribimos de Blufil. A tu ${equipo} ${cuando}. ¿Te agendamos una visita?`;
}

function CartaTarjeta({
  tarjeta,
  columna,
  puedeEscribir,
  alMover,
}: {
  tarjeta: Tarjeta;
  columna: Columna;
  puedeEscribir: boolean;
  alMover: (id: string, etapa: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [canal, setCanal] = useState("llamada");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(tarjeta.fecha_objetivo);
  const [notasTarjeta, setNotasTarjeta] = useState(tarjeta.notas ?? "");

  const cliente = tarjeta.clientes;
  const equipo = ETIQUETA_SISTEMA[tarjeta.sistemas_instalados?.tipo ?? ""] ?? "Equipo";
  const plazo = etiquetaPlazo(tarjeta.fecha_objetivo);
  const cerrada = Boolean(tarjeta.cerrado_at);
  const wa = enlaceWhatsApp(cliente?.telefono ?? null, mensajeWhatsApp(tarjeta));
  const arrastrable = puedeEscribir && columna.manual && !cerrada;
  const columnasManuales = (tarjeta.tipo === "mantenimiento" ? COLUMNAS_MANTENIMIENTO : COLUMNAS_NUEVOS).filter(
    (c) => c.manual,
  );

  function ejecutar(accion: () => Promise<string | null>, exito?: () => void) {
    setMensaje(null);
    startTransition(async () => {
      const error = await accion();
      if (error) setMensaje(error);
      else exito?.();
    });
  }

  return (
    <div
      draggable={arrastrable}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", tarjeta.id)}
      className={`rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-black/10 ${arrastrable ? "cursor-grab active:cursor-grabbing" : ""} ${pendiente ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {cliente ? (
            <Link href={`/admin/clientes/${cliente.id}`} className="font-medium text-[#123C5B] hover:underline">
              {cliente.nombre}
            </Link>
          ) : (
            <span className="font-medium text-neutral-500">Sin cliente</span>
          )}
          <p className="truncate text-xs text-neutral-500">
            {equipo}
            {tarjeta.sistemas_instalados?.barrio ? ` · ${tarjeta.sistemas_instalados.barrio}` : ""}
            {cliente?.ciudad ? ` · ${cliente.ciudad}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-label={abierta ? "Cerrar detalle" : "Abrir detalle"}
          className="flex-shrink-0 rounded px-1.5 text-neutral-400 hover:bg-neutral-100"
        >
          {abierta ? "▴" : "▾"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {!cerrada && columna.etapa !== "agendado" && columna.etapa !== "en_servicio" && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${plazo.clase}`}>{plazo.texto}</span>
        )}
        {cerrada && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Cerrada el {formatoFecha.format(new Date(tarjeta.cerrado_at as string))}
          </span>
        )}
        {tarjeta.recordatorio_enviado_at && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            Correo enviado el {formatoFecha.format(new Date(tarjeta.recordatorio_enviado_at))}
          </span>
        )}
      </div>

      {tarjeta.ultimo_contacto_at && (
        <p className="mt-1.5 text-xs text-neutral-400">
          Último contacto: {formatoFechaHora.format(new Date(tarjeta.ultimo_contacto_at))}
        </p>
      )}

      {!cerrada && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-green-700"
            >
              WhatsApp
            </a>
          )}
          {puedeEscribir && tarjeta.tipo === "mantenimiento" && cliente && (
            <Link
              href={`/admin/solicitudes/nueva?cliente=${cliente.id}`}
              className="rounded-md bg-[#123C5B] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#0d2c44]"
            >
              Crear solicitud
            </Link>
          )}
        </div>
      )}

      {abierta && (
        <div className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3">
          {cliente?.telefono && <p className="text-xs text-neutral-500">Teléfono: {cliente.telefono}</p>}

          {puedeEscribir && !cerrada && (
            <>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-neutral-700">Registrar contacto</p>
                <div className="flex gap-1.5">
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    aria-label="Canal"
                  >
                    {CANALES.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                  <input
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="¿Qué dijo?"
                    maxLength={500}
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      ejecutar(() => registrarContacto(tarjeta.id, canal, nota, "contactado"), () => setNota(""))
                    }
                    className="rounded-md bg-[#1EBBEB] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#17a3cf] disabled:opacity-60"
                  >
                    Hablamos
                  </button>
                  {tarjeta.tipo === "mantenimiento" && (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() =>
                        ejecutar(() => registrarContacto(tarjeta.id, canal, nota, "sin_respuesta"), () => setNota(""))
                      }
                      className="rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300 disabled:opacity-60"
                    >
                      No contestó
                    </button>
                  )}
                </div>
              </div>

              {tarjeta.tipo === "mantenimiento" && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-neutral-700">Posponer hasta</p>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      disabled={pendiente || fecha === tarjeta.fecha_objetivo}
                      onClick={() => ejecutar(() => posponerSeguimiento(tarjeta.id, fecha))}
                      className="rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300 disabled:opacity-60"
                    >
                      Guardar fecha
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-neutral-700">Notas</p>
                <textarea
                  value={notasTarjeta}
                  onChange={(e) => setNotasTarjeta(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  disabled={pendiente || notasTarjeta === (tarjeta.notas ?? "")}
                  onClick={() => ejecutar(() => guardarNotasSeguimiento(tarjeta.id, notasTarjeta))}
                  className="self-start rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-300 disabled:opacity-60"
                >
                  Guardar nota
                </button>
              </div>

              {columna.manual && (
                <label className="flex flex-col gap-1 text-xs text-neutral-700">
                  Mover a
                  <select
                    value={tarjeta.etapa}
                    onChange={(e) => alMover(tarjeta.id, e.target.value)}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  >
                    {columnasManuales.map((c) => (
                      <option key={c.etapa} value={c.etapa}>
                        {c.titulo}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          {tarjeta.contactos_seguimiento.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-700">Historial</p>
              <ul className="mt-1 flex flex-col gap-1">
                {tarjeta.contactos_seguimiento.map((c, i) => (
                  <li key={i} className="text-xs text-neutral-500">
                    <span className="font-medium text-neutral-600">
                      {formatoFechaHora.format(new Date(c.created_at))} · {CANALES.find((x) => x.valor === c.canal)?.etiqueta ?? c.canal}
                    </span>
                    {c.nota ? `: ${c.nota}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mensaje && <p className="text-xs text-red-600">{mensaje}</p>}
        </div>
      )}
    </div>
  );
}

export function Tablero({
  tarjetas,
  nuevos,
  puedeEscribir,
}: {
  tarjetas: Tarjeta[];
  nuevos: boolean;
  puedeEscribir: boolean;
}) {
  const [estado, setEstado] = useState(tarjetas);
  const [error, setError] = useState<string | null>(null);
  const [columnaSobre, setColumnaSobre] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const columnas = nuevos ? COLUMNAS_NUEVOS : COLUMNAS_MANTENIMIENTO;

  useEffect(() => setEstado(tarjetas), [tarjetas]);

  function mover(id: string, etapa: string) {
    const actual = estado.find((t) => t.id === id);
    if (!actual || actual.etapa === etapa || actual.cerrado_at) return;
    setError(null);
    const anterior = estado;
    setEstado((todas) =>
      todas.map((t) =>
        t.id === id ? { ...t, etapa, cerrado_at: etapa === "activo" ? new Date().toISOString() : null } : t,
      ),
    );
    startTransition(async () => {
      const mensaje = await moverSeguimiento(id, etapa);
      if (mensaje) {
        setError(mensaje);
        setEstado(anterior);
      }
    });
  }

  if (estado.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
        {nuevos
          ? "Todavía no hay clientes recién instalados. Aparecen solos cuando se completa una instalación."
          : "No hay mantenimientos por vencer. Las tarjetas aparecen solas cuando a un equipo le faltan 30 días o menos."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columnas.map((columna) => {
          const enColumna = estado.filter((t) => t.etapa === columna.etapa);
          const soltable = puedeEscribir && columna.manual;
          return (
            <section
              key={columna.etapa}
              onDragOver={(e) => {
                if (!soltable) return;
                e.preventDefault();
                setColumnaSobre(columna.etapa);
              }}
              onDragLeave={() => setColumnaSobre((c) => (c === columna.etapa ? null : c))}
              onDrop={(e) => {
                if (!soltable) return;
                e.preventDefault();
                setColumnaSobre(null);
                mover(e.dataTransfer.getData("text/plain"), columna.etapa);
              }}
              className={`flex w-72 flex-shrink-0 flex-col gap-2 rounded-xl p-3 ring-1 transition ${
                columnaSobre === columna.etapa ? "bg-[#eaf7fb] ring-[#1EBBEB]" : "bg-neutral-100/70 ring-black/5"
              }`}
            >
              <header>
                <h2 className="flex items-center justify-between text-sm font-semibold text-[#123C5B]">
                  {columna.titulo}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">{enColumna.length}</span>
                </h2>
                <p className="text-xs text-neutral-400">{columna.ayuda}</p>
              </header>
              {enColumna.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-300 p-3 text-center text-xs text-neutral-400">
                  {soltable ? "Arrastra una tarjeta aquí" : "Vacía"}
                </p>
              ) : (
                enColumna.map((t) => (
                  <CartaTarjeta key={t.id} tarjeta={t} columna={columna} puedeEscribir={puedeEscribir} alMover={mover} />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function AjusteRecordatorios({ activo, puedeEditar }: { activo: boolean; puedeEditar: boolean }) {
  const [valor, setValor] = useState(activo);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={valor}
          disabled={!puedeEditar || pendiente}
          onChange={(e) => {
            const nuevo = e.target.checked;
            setError(null);
            setValor(nuevo);
            startTransition(async () => {
              const mensaje = await cambiarRecordatorios(nuevo);
              if (mensaje) {
                setError(mensaje);
                setValor(!nuevo);
              }
            });
          }}
          className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#123C5B]"
        />
        <span>
          Enviar recordatorio por correo 7 días antes del mantenimiento
          <span className="block text-xs text-neutral-400">
            Sale solo, una vez por equipo, a las 8:00 a. m. Con el interruptor apagado las tarjetas se crean igual, pero no se envía nada.
            {!puedeEditar && " Solo un superadmin puede cambiarlo."}
          </span>
        </span>
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

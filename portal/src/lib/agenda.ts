// Utilidades de la agenda de visitas. Todo se piensa en hora de Colombia
// (UTC-5, sin horario de verano); en la base se guarda el instante en UTC.

export const DURACIONES: { minutos: number; etiqueta: string }[] = [
  { minutos: 30, etiqueta: "30 minutos" },
  { minutos: 60, etiqueta: "1 hora" },
  { minutos: 90, etiqueta: "1 hora y media" },
  { minutos: 120, etiqueta: "2 horas" },
  { minutos: 180, etiqueta: "3 horas" },
  { minutos: 240, etiqueta: "4 horas" },
];

export const DURACION_POR_TIPO: Record<string, number> = { instalacion: 180, mantenimiento: 90 };

export const ETIQUETA_AGENDA: Record<string, string> = {
  sin_programar: "Sin programar",
  propuesta: "Por confirmar",
  confirmada: "Confirmada",
};

const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});
const formatoDiaCorto = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "America/Bogota",
});
const formatoHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
const formatoFechaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });
const formatoHoraIso = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Bogota",
});

export const diaLargo = (iso: string) => formatoDiaLargo.format(new Date(iso));
export const diaCorto = (iso: string) => formatoDiaCorto.format(new Date(iso));
export const horaCorta = (iso: string) => formatoHora.format(new Date(iso));
export const fechaBogota = (iso: string | Date) => formatoFechaIso.format(typeof iso === "string" ? new Date(iso) : iso);
export const horaBogota = (iso: string) => formatoHoraIso.format(new Date(iso));

export function rangoHorario(inicioIso: string, minutos: number): string {
  const fin = new Date(new Date(inicioIso).getTime() + minutos * 60000);
  return `${formatoHora.format(new Date(inicioIso))} – ${formatoHora.format(fin)}`;
}

// «2026-10-14» + «13:30» -> instante en UTC (ISO), o null si no es válido.
export function aInstante(fecha: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const d = new Date(`${fecha}T${hora}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Lunes de la semana de una fecha «YYYY-MM-DD».
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = d.getUTCDay(); // 0 = domingo
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

export function hoyBogota(): string {
  return fechaBogota(new Date());
}

export type Tecnico = { nombre: string } | null;

export type Servicio = {
  id: string;
  tipo: string;
  estado: string;
  valor_cobrado: number | null;
  descuento_aplicado: number;
  reporte_ia: string | null;
  proxima_fecha_mantenimiento: string | null;
  created_at: string;
  fotos: string[];
  numero_orden: number;
  tecnicos: Tecnico;
};

export type ClubBlufil = {
  conteo_mantenimientos: number;
  nivel_descuento: number;
  racha_vigente_hasta: string | null;
} | null;

export type SistemaInstalado = {
  id: string;
  tipo: string;
  direccion: string;
  barrio: string | null;
  fecha_instalacion: string | null;
  club_blufil: ClubBlufil;
  servicios: Servicio[];
};

export const ETIQUETA_SISTEMA: Record<string, string> = {
  doble_filtracion: "Doble filtración",
  ultrafiltracion: "Ultrafiltración",
  osmosis_inversa: "Ósmosis inversa",
  dispensador: "Dispensador sin botellón",
  ozono: "Purificador de ozono",
};

export const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const DIAS_AVISO_MANTENIMIENTO = 30;

export type PlazoMantenimiento = {
  dias: number;
  vencido: boolean;
  cercano: boolean;
  fecha: string;
  texto: string;
};

// Plazo del próximo mantenimiento de un equipo. La fecha viene de la vista
// `proximo_mantenimiento` (6 meses después del último servicio).
export function plazoMantenimiento(fechaIso: string | null | undefined): PlazoMantenimiento | null {
  if (!fechaIso) return null;
  const hoy = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()) + "T00:00:00");
  const fecha = new Date(`${fechaIso}T00:00:00`);
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  const vencido = dias < 0;
  const texto = vencido
    ? `Venció el ${formatoFecha.format(fecha)}`
    : dias === 0
      ? "Le toca hoy"
      : dias <= DIAS_AVISO_MANTENIMIENTO
        ? `Le toca el ${formatoFecha.format(fecha)} (en ${dias} día${dias === 1 ? "" : "s"})`
        : `Le toca el ${formatoFecha.format(fecha)}`;
  return { dias, vencido, cercano: !vencido && dias <= DIAS_AVISO_MANTENIMIENTO, fecha: fechaIso, texto };
}

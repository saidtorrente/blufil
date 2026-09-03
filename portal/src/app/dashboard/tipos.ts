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

const DIAS_ALERTA_MANTENIMIENTO = 15;

export function calcularAlertaMantenimiento(servicios: Servicio[]) {
  const proximaFecha = servicios
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((s) => s.proxima_fecha_mantenimiento)?.proxima_fecha_mantenimiento;

  if (!proximaFecha) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${proximaFecha}T00:00:00`);
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);

  if (dias > DIAS_ALERTA_MANTENIMIENTO) return null;

  return {
    vencido: dias < 0,
    texto: dias < 0 ? "Mantenimiento vencido" : `Próximo mantenimiento: ${formatoFecha.format(fecha)}`,
  };
}

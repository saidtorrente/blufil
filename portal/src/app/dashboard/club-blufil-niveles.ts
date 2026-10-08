// Niveles de descuento del Club Blufil por # de mantenimiento completado
// (docs/PROYECTO.md §6.1, anclas dadas por el usuario: 3°=15%, 6°=45%).
// Índice 0 sin usar; índice = # de mantenimiento (tope en 6+).
export const NIVELES_CLUB_BLUFIL = [0, 0, 5, 15, 25, 35, 45];

export const TOPE_NIVEL_CLUB_BLUFIL = NIVELES_CLUB_BLUFIL.length - 1;

export function nivelPara(conteoMantenimientos: number): number {
  return NIVELES_CLUB_BLUFIL[Math.min(Math.max(conteoMantenimientos, 0), TOPE_NIVEL_CLUB_BLUFIL)];
}

export type ClubGuardado = {
  conteo_mantenimientos: number;
  nivel_descuento: number;
  racha_vigente_hasta: string | null;
} | null;

// Estado del Club de un equipo teniendo en cuenta la racha de 6 meses: si la
// fecha de vigencia ya pasó, el conteo "efectivo" es 0 (el próximo
// mantenimiento reinicia en 1°, 0%). El trigger de la base hace el reinicio
// real al completarse el siguiente mantenimiento; esto solo lo muestra bien.
export function estadoClub(club: ClubGuardado) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const vigenteHasta = club?.racha_vigente_hasta ?? null;
  const vencida = vigenteHasta !== null && hoy > vigenteHasta;
  return {
    conteo: vencida ? 0 : (club?.conteo_mantenimientos ?? 0),
    nivel: vencida ? 0 : (club?.nivel_descuento ?? 0),
    vencida,
    vigenteHasta,
  };
}

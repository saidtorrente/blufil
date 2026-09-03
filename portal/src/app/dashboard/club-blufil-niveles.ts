// Niveles de descuento del Club Blufil por # de mantenimiento completado
// (docs/PROYECTO.md §6.1, anclas dadas por el usuario: 3°=15%, 6°=45%).
// Índice 0 sin usar; índice = # de mantenimiento (tope en 6+).
export const NIVELES_CLUB_BLUFIL = [0, 0, 5, 15, 25, 35, 45];

export const TOPE_NIVEL_CLUB_BLUFIL = NIVELES_CLUB_BLUFIL.length - 1;

export function nivelPara(conteoMantenimientos: number): number {
  return NIVELES_CLUB_BLUFIL[Math.min(Math.max(conteoMantenimientos, 0), TOPE_NIVEL_CLUB_BLUFIL)];
}

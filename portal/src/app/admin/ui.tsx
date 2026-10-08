// Utilidades de presentación compartidas por las pantallas del panel admin.

export const formatoFechaCorta = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

export const formatoFechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// Mismo formato que ve el cliente en "Mis equipos": BLF-000123.
export function formatoOrden(numero: number): string {
  return `BLF-${String(numero).padStart(6, "0")}`;
}

const ESTILO_ESTADO: Record<string, { etiqueta: string; clases: string }> = {
  pendiente: { etiqueta: "Sin técnico", clases: "bg-amber-100 text-amber-800" },
  asignada: { etiqueta: "Asignada", clases: "bg-[#eaf7fb] text-[#123C5B]" },
  en_progreso: { etiqueta: "En progreso", clases: "bg-[#d5f0f9] text-[#0d5a73]" },
  completada: { etiqueta: "Completada", clases: "bg-green-100 text-green-800" },
  cancelada: { etiqueta: "Cancelada", clases: "bg-neutral-200 text-neutral-600" },
};

export function EstadoChip({ estado }: { estado: string }) {
  const estilo = ESTILO_ESTADO[estado] ?? { etiqueta: estado, clases: "bg-neutral-100 text-neutral-600" };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo.clases}`}>
      {estilo.etiqueta}
    </span>
  );
}

// PostgREST devuelve un objeto o un arreglo según la relación; esto lo normaliza.
export function uno<T>(valor: T | T[] | null | undefined): T | null {
  if (valor == null) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

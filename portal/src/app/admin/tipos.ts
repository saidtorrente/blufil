// Resultado de una acción de formulario del panel admin. `valores` repuebla el
// formulario cuando hay un error.
export type EstadoForm = { error?: string; exito?: string; valores?: Record<string, string> } | null;

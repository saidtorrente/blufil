// Evidencias de un servicio (fotos y video corto). Se guardan en el bucket
// `servicios-fotos` bajo `<id del servicio>/<tipo>-<uuid>.<ext>`; el tipo va en
// el nombre del archivo, así no hace falta otra columna.

export type TipoEvidencia = "antes" | "despues" | "extra" | "video";

export const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // límite del bucket
const LADO_MAXIMO_FOTO = 1600;

export function tipoDeRuta(ruta: string): TipoEvidencia {
  const nombre = ruta.split("/").pop() ?? "";
  if (nombre.startsWith("antes-")) return "antes";
  if (nombre.startsWith("despues-")) return "despues";
  if (nombre.startsWith("video-") || /\.(mp4|mov|webm)$/i.test(nombre)) return "video";
  return "extra";
}

export function esVideo(ruta: string): boolean {
  return tipoDeRuta(ruta) === "video";
}

export const ETIQUETA_EVIDENCIA: Record<TipoEvidencia, string> = {
  antes: "Antes",
  despues: "Después",
  extra: "Foto",
  video: "Video",
};

// Antes y después primero; el resto en el orden en que se subió.
export function ordenarEvidencias(rutas: string[]): string[] {
  const peso: Record<TipoEvidencia, number> = { antes: 0, despues: 1, extra: 2, video: 3 };
  return [...rutas].sort((a, b) => peso[tipoDeRuta(a)] - peso[tipoDeRuta(b)]);
}

// ---- Solo en el navegador ---------------------------------------------------

// Reduce una foto de celular (varios MB) a ~300 KB antes de subirla. Si no se
// puede (p. ej. formato HEIC) o no mejora, se sube el original.
export async function comprimirFoto(archivo: File): Promise<{ blob: Blob; extension: string }> {
  const original = { blob: archivo as Blob, extension: extensionDe(archivo) };
  if (!archivo.type.startsWith("image/")) return original;
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", 0.8));
    return blob && blob.size < archivo.size ? { blob, extension: "jpg" } : original;
  } catch {
    return original;
  }
}

export function extensionDe(archivo: File): string {
  const delNombre = archivo.name.split(".").pop()?.toLowerCase();
  if (delNombre && /^[a-z0-9]{2,5}$/.test(delNombre)) return delNombre;
  if (archivo.type === "video/quicktime") return "mov";
  return archivo.type.split("/")[1] ?? "bin";
}

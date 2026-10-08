import { esVideo, ETIQUETA_EVIDENCIA, ordenarEvidencias, tipoDeRuta } from "@/lib/evidencias";

// Miniaturas de las evidencias de un servicio. `urls` mapea cada ruta del
// bucket a su URL firmada; las rutas sin URL se omiten.
export function EvidenciasGaleria({
  rutas,
  urls,
  lado = "h-24 w-24",
}: {
  rutas: string[];
  urls: Record<string, string>;
  lado?: string;
}) {
  const visibles = ordenarEvidencias(rutas).filter((ruta) => urls[ruta]);
  if (visibles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {visibles.map((ruta) => {
        const etiqueta = ETIQUETA_EVIDENCIA[tipoDeRuta(ruta)];
        return (
          <figure key={ruta} className="flex flex-col gap-1">
            {esVideo(ruta) ? (
              <video
                src={urls[ruta]}
                controls
                preload="metadata"
                playsInline
                className={`${lado} rounded-lg bg-black object-cover ring-1 ring-black/10`}
              />
            ) : (
              <a href={urls[ruta]} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[ruta]} alt={`Evidencia: ${etiqueta}`} className={`${lado} rounded-lg object-cover ring-1 ring-black/10`} />
              </a>
            )}
            <figcaption className="text-center text-xs text-neutral-500">{etiqueta}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

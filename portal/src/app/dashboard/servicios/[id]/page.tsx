import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenciasGaleria } from "@/app/evidencias-galeria";
import { firmarEvidencias } from "@/lib/evidencias-servidor";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SISTEMA, formatoFecha, formatoMoneda, plazoMantenimiento } from "../../tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ETIQUETA_TIPO: Record<string, string> = { instalacion: "Instalación", mantenimiento: "Mantenimiento" };

type Informe = {
  servicio: {
    id: string;
    numero_orden: number;
    tipo: string;
    estado: string;
    completada_at: string | null;
    reporte: string | null;
    valor_cobrado: number | null;
    descuento_aplicado: number;
    fotos: string[];
    recomendacion_tecnico: string | null;
  };
  equipo: { tipo: string; barrio: string | null; direccion: string };
  cliente: string;
  tecnico: string | null;
  productos: { nombre: string; codigo: string | null; categoria: string | null; cantidad: number; precio_unitario: number | null }[];
  proximo: { fecha: string | null; descuento: number | null; numero: number | null; racha_hasta: string | null; racha_vencida: boolean | null };
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-[#123C5B]">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function InformeServicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("informe_servicio", { p_servicio_id: id });
  const informe = data as Informe | null;
  if (!informe) notFound();

  const { servicio, equipo, productos, proximo } = informe;
  const completado = servicio.estado === "completada";
  const fotos = Array.isArray(servicio.fotos) ? servicio.fotos : [];
  const urls = fotos.length > 0 ? await firmarEvidencias(supabase, fotos) : {};
  const plazo = plazoMantenimiento(proximo.fecha);
  const orden = `BLF-${String(servicio.numero_orden).padStart(6, "0")}`;
  const nombreEquipo = ETIQUETA_SISTEMA[equipo.tipo] ?? equipo.tipo;
  const descuento = proximo.descuento ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/dashboard/equipos" className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800">
          ← Volver a mis equipos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-[#123C5B]">
          Informe de servicio · {ETIQUETA_TIPO[servicio.tipo] ?? servicio.tipo}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {nombreEquipo}
          {equipo.barrio ? ` · ${equipo.barrio}` : ""} · Orden {orden}
          {servicio.completada_at && <> · {formatoFecha.format(new Date(servicio.completada_at))}</>}
          {informe.tecnico && <> · Técnico: {informe.tecnico}</>}
        </p>
      </div>

      {!completado && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Este servicio todavía no se completa. Cuando el técnico lo cierre, aquí verás el detalle de lo que se hizo.
        </p>
      )}

      {completado && (
        <>
          <Seccion titulo="Qué hicimos">
            {servicio.reporte ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{servicio.reporte}</p>
            ) : (
              <p className="text-sm text-neutral-500">El técnico no dejó anotaciones en este servicio.</p>
            )}
          </Seccion>

          <Seccion titulo="Filtros y repuestos cambiados">
            {productos.length === 0 ? (
              <p className="text-sm text-neutral-500">En este servicio no se cambió ningún repuesto adicional.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {productos.map((p, i) => (
                  <li key={`${p.codigo ?? p.nombre}-${i}`} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="text-neutral-800">
                      {p.nombre}
                      {p.cantidad > 1 && <span className="text-neutral-500"> × {p.cantidad}</span>}
                    </span>
                    {p.precio_unitario != null && (
                      <span className="flex-shrink-0 tabular-nums text-neutral-500">
                        {formatoMoneda.format(p.precio_unitario * p.cantidad)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {servicio.valor_cobrado != null && (
              <p className="mt-3 text-xs text-neutral-500">
                Valor del servicio: {formatoMoneda.format(servicio.valor_cobrado)}
                {servicio.descuento_aplicado > 0 && ` · incluye ${servicio.descuento_aplicado}% de descuento del Club Blufil`}
              </p>
            )}
          </Seccion>

          {fotos.length > 0 && Object.keys(urls).length > 0 && (
            <Seccion titulo="Evidencias">
              <EvidenciasGaleria rutas={fotos} urls={urls} lado="h-28 w-28" />
            </Seccion>
          )}

          <Seccion titulo="Tu próximo mantenimiento">
            {plazo ? (
              <>
                <p className="text-sm font-medium text-neutral-800">{plazo.texto}</p>
                {proximo.racha_vencida ? (
                  <p className="mt-2 rounded-lg bg-[#eaf7fb] p-3 text-sm text-[#123C5B]">
                    Tu racha del Club Blufil venció: el próximo mantenimiento la reinicia y el siguiente ya tendrá descuento.
                  </p>
                ) : descuento > 0 ? (
                  <p className="mt-2 rounded-lg bg-[#eaf7fb] p-3 text-sm text-[#123C5B]">
                    Con el Club Blufil tienes <strong>{descuento}% de descuento</strong> en ese mantenimiento
                    {proximo.racha_hasta && <>, si lo haces antes del {formatoFecha.format(new Date(`${proximo.racha_hasta}T12:00:00`))}</>}.
                  </p>
                ) : (
                  <p className="mt-2 rounded-lg bg-[#eaf7fb] p-3 text-sm text-[#123C5B]">
                    Con cada mantenimiento a tiempo subes de nivel en el Club Blufil y tu descuento crece.
                  </p>
                )}
                {servicio.recomendacion_tecnico && (
                  <p className="mt-2 text-xs text-[#1a8fac]">
                    Recomendación del técnico: {formatoFecha.format(new Date(`${servicio.recomendacion_tecnico}T12:00:00`))}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-neutral-500">Te avisaremos cuando se acerque la fecha de tu próximo mantenimiento.</p>
            )}
            <Link
              href="/dashboard/equipos"
              className="mt-4 inline-block rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
            >
              Ver mis equipos
            </Link>
          </Seccion>
        </>
      )}
    </div>
  );
}

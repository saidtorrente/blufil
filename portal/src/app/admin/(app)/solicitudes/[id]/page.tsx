import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { obtenerAdmin, puedeEscribir } from "../../../admin";
import { EstadoChip, formatoFechaCorta, formatoFechaHora, formatoMoneda, formatoOrden, uno } from "../../../ui";
import { AccionesSolicitud } from "./acciones";

type Detalle = {
  id: string;
  numero_orden: number;
  tipo: string;
  estado: string;
  created_at: string;
  updated_at: string;
  tecnico_id: string | null;
  valor_cobrado: number | null;
  descuento_aplicado: number | null;
  reporte_ia: string | null;
  proxima_fecha_mantenimiento: string | null;
  fotos: string[] | null;
  visita_id: string;
  tecnicos: { nombre: string; correo: string | null; ciudad: string | null } | null;
  sistemas_instalados: {
    tipo: string;
    direccion: string;
    barrio: string | null;
    clientes: {
      nombre: string;
      telefono: string | null;
      correo: string | null;
      cedula_nit: string | null;
      ciudad: string | null;
    } | null;
  } | null;
  visitas: {
    estado: string;
    canal_origen: string;
    fecha_hora_deseada: string | null;
    facturas: { siigo_invoice_id: string | null; estado: string; total: number | null }[] | { siigo_invoice_id: string | null; estado: string; total: number | null } | null;
    servicios: { id: string; numero_orden: number; tipo: string; estado: string }[];
  } | null;
};

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-400">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-neutral-800">{children || <span className="text-neutral-300">—</span>}</dd>
    </div>
  );
}

export default async function DetalleSolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: servicio }, admin, { data: tecnicos }] = await Promise.all([
    supabase
      .from("servicios")
      .select(
        "id, numero_orden, tipo, estado, created_at, updated_at, tecnico_id, valor_cobrado, descuento_aplicado, reporte_ia, proxima_fecha_mantenimiento, fotos, visita_id, tecnicos(nombre, correo, ciudad), sistemas_instalados(tipo, direccion, barrio, clientes(nombre, telefono, correo, cedula_nit, ciudad)), visitas(estado, canal_origen, fecha_hora_deseada, facturas(siigo_invoice_id, estado, total), servicios(id, numero_orden, tipo, estado))",
      )
      .eq("id", id)
      .maybeSingle<Detalle>(),
    obtenerAdmin(supabase),
    supabase.from("tecnicos").select("id, nombre, ciudad, disponible").eq("certificado", true).order("nombre"),
  ]);

  if (!servicio) notFound();

  const sistema = uno(servicio.sistemas_instalados);
  const cliente = uno(sistema?.clientes);
  const tecnico = uno(servicio.tecnicos);
  const visita = uno(servicio.visitas);
  const factura = uno(visita?.facturas);
  const otrosServicios = (visita?.servicios ?? []).filter((s) => s.id !== servicio.id);

  const rutasFotos = servicio.fotos ?? [];
  const urlsFotos: string[] = [];
  if (rutasFotos.length > 0) {
    const { data: firmadas } = await supabase.storage.from("servicios-fotos").createSignedUrls(rutasFotos, 3600);
    firmadas?.forEach((f) => {
      if (f.signedUrl) urlsFotos.push(f.signedUrl);
    });
  }

  const escribe = puedeEscribir(admin);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/solicitudes" className="text-sm text-[#1a8fac] underline underline-offset-2">
          ← Solicitudes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-[#123C5B]">
            {formatoOrden(servicio.numero_orden)} · {ETIQUETA_SERVICIO[servicio.tipo] ?? servicio.tipo}
            {sistema ? ` · ${ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}` : ""}
          </h1>
          <EstadoChip estado={servicio.estado} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Solicitada el {formatoFechaHora.format(new Date(servicio.created_at))} · canal{" "}
          {visita?.canal_origen === "telefono" ? "teléfono" : "portal web"}
        </p>
      </div>

      <AccionesSolicitud
        servicioId={servicio.id}
        estado={servicio.estado}
        tecnicoActualId={servicio.tecnico_id}
        tecnicos={tecnicos ?? []}
        puedeEscribir={escribe}
        puedeFacturar={escribe && servicio.estado === "completada" && !factura}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Cliente</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato etiqueta="Nombre">{cliente?.nombre}</Dato>
            <Dato etiqueta="Cédula / NIT">{cliente?.cedula_nit}</Dato>
            <Dato etiqueta="Teléfono">{cliente?.telefono}</Dato>
            <Dato etiqueta="Correo">{cliente?.correo}</Dato>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Equipo y ubicación</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato etiqueta="Equipo">{sistema ? ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo : null}</Dato>
            <Dato etiqueta="Ciudad">{cliente?.ciudad}</Dato>
            <Dato etiqueta="Barrio">{sistema?.barrio}</Dato>
            <Dato etiqueta="Dirección">{sistema?.direccion}</Dato>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Técnico</h2>
          {tecnico ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Dato etiqueta="Nombre">{tecnico.nombre}</Dato>
              <Dato etiqueta="Ciudad">{tecnico.ciudad}</Dato>
              <Dato etiqueta="Correo">{tecnico.correo}</Dato>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-neutral-400">Todavía no tiene técnico asignado.</p>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Factura</h2>
          {factura ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Dato etiqueta="Estado">{factura.estado}</Dato>
              <Dato etiqueta="Total">{factura.total != null ? formatoMoneda.format(factura.total) : null}</Dato>
              <Dato etiqueta="N.º en Siigo">{factura.siigo_invoice_id}</Dato>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-neutral-400">
              {servicio.estado === "completada"
                ? "Completada, pero sin factura. Puedes emitirla desde «Acciones»."
                : "Se factura automáticamente cuando el técnico completa el servicio."}
            </p>
          )}
        </section>
      </div>

      {servicio.estado === "completada" && (
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Reporte del técnico</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <Dato etiqueta="Valor cobrado">
              {servicio.valor_cobrado != null ? formatoMoneda.format(servicio.valor_cobrado) : null}
            </Dato>
            <Dato etiqueta="Descuento">
              {servicio.descuento_aplicado ? `${servicio.descuento_aplicado}%` : "0%"}
            </Dato>
            <Dato etiqueta="Próximo mantenimiento">
              {servicio.proxima_fecha_mantenimiento
                ? formatoFechaCorta.format(new Date(`${servicio.proxima_fecha_mantenimiento}T00:00:00`))
                : null}
            </Dato>
            <Dato etiqueta="Completada">{formatoFechaHora.format(new Date(servicio.updated_at))}</Dato>
          </dl>
          {servicio.reporte_ia && (
            <p className="mt-4 whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
              {servicio.reporte_ia}
            </p>
          )}
          {urlsFotos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {urlsFotos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Foto del servicio" className="h-24 w-24 rounded-lg object-cover ring-1 ring-black/10" />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {otrosServicios.length > 0 && (
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Otros servicios de esta visita</h2>
          <ul className="mt-3 divide-y divide-neutral-100">
            {otrosServicios.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/solicitudes/${s.id}`} className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50">
                  <span>
                    {formatoOrden(s.numero_orden)} · {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo}
                  </span>
                  <EstadoChip estado={s.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

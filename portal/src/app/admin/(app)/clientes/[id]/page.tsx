import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { estadoClub } from "@/app/dashboard/club-blufil-niveles";
import { obtenerAdmin, puedeEscribir } from "../../../admin";
import { EstadoChip, formatoFechaCorta, formatoMoneda, formatoOrden, uno } from "../../../ui";
import { FormularioCliente } from "../formulario-cliente";
import { FormularioEquipo } from "./equipos";
import { BotonCrearCuenta, FormularioReferido, FormularioRetoma, SelectorEstadoReferido } from "./extras";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  cedula_nit: string | null;
  direccion: string | null;
  ciudad: string;
  tipo_persona: string;
  fuente_adquisicion: string | null;
  estatus: string;
  auth_user_id: string | null;
  codigo_referido: string;
  created_at: string;
  sistemas_instalados: {
    id: string;
    tipo: string;
    direccion: string;
    barrio: string | null;
    fecha_instalacion: string | null;
    club_blufil: { conteo_mantenimientos: number; nivel_descuento: number; racha_vigente_hasta: string | null } | { conteo_mantenimientos: number; nivel_descuento: number; racha_vigente_hasta: string | null }[] | null;
  }[];
  visitas: {
    id: string;
    created_at: string;
    servicios: { id: string; numero_orden: number; tipo: string; estado: string }[];
  }[];
  retomas: { id: string; equipo_marca: string | null; bono_aplicado: number | null; created_at: string }[];
};

type ReferidoComoReferente = { id: string; estado: string; created_at: string; clientes: { nombre: string } | { nombre: string }[] | null };
type ReferidoComoReferido = { id: string; estado: string; clientes: { nombre: string } | { nombre: string }[] | null };

function Seccion({ titulo, children, ayuda }: { titulo: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-neutral-800">{titulo}</h2>
      {ayuda && <p className="mt-0.5 text-xs text-neutral-400">{ayuda}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function ClienteAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();

  const [{ data: cliente }, admin, { data: referidosHechos }, { data: referidoPor }, { data: otrosClientes }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, nombre, telefono, correo, cedula_nit, direccion, ciudad, tipo_persona, fuente_adquisicion, estatus, auth_user_id, codigo_referido, created_at, sistemas_instalados(id, tipo, direccion, barrio, fecha_instalacion, club_blufil(conteo_mantenimientos, nivel_descuento, racha_vigente_hasta)), visitas(id, created_at, servicios(id, numero_orden, tipo, estado)), retomas(id, equipo_marca, bono_aplicado, created_at)",
      )
      .eq("id", id)
      .maybeSingle<Cliente>(),
    obtenerAdmin(supabase),
    supabase
      .from("referidos")
      .select("id, estado, created_at, clientes!referidos_referido_cliente_id_fkey(nombre)")
      .eq("referente_cliente_id", id)
      .order("created_at", { ascending: false })
      .returns<ReferidoComoReferente[]>(),
    supabase
      .from("referidos")
      .select("id, estado, clientes!referidos_referente_cliente_id_fkey(nombre)")
      .eq("referido_cliente_id", id)
      .returns<ReferidoComoReferido[]>(),
    supabase.from("clientes").select("id, nombre").neq("id", id).order("nombre").limit(500),
  ]);

  if (!cliente) notFound();

  const escribe = puedeEscribir(admin);
  const servicios = cliente.visitas
    .flatMap((v) => v.servicios.map((s) => ({ ...s, fecha: v.created_at })))
    .sort((a, b) => b.numero_orden - a.numero_orden);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/clientes" className="text-sm text-[#1a8fac] underline underline-offset-2">
          ← Clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-[#123C5B]">{cliente.nombre}</h1>
          {cliente.auth_user_id ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Con acceso al portal</span>
          ) : (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">Sin acceso al portal</span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Cliente desde {formatoFechaCorta.format(new Date(cliente.created_at))} · código de referido{" "}
          <span className="font-mono">{cliente.codigo_referido}</span>
        </p>
      </div>

      {aviso && <p className="rounded-xl bg-[#eaf7fb] p-4 text-sm text-[#123C5B]">{aviso}</p>}

      {!cliente.auth_user_id && escribe && (
        <Seccion
          titulo="Acceso al portal"
          ayuda="Hoy este cliente no puede entrar al portal. Necesita correo y cédula o NIT cargados."
        >
          {cliente.correo && cliente.cedula_nit ? (
            <BotonCrearCuenta clienteId={cliente.id} />
          ) : (
            <p className="text-sm text-amber-700">Completa el correo y la cédula o NIT en «Datos» para poder crear su cuenta.</p>
          )}
        </Seccion>
      )}

      <Seccion titulo="Datos">
        <FormularioCliente
          puedeEscribir={escribe}
          cliente={{
            id: cliente.id,
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            correo: cliente.correo,
            cedula_nit: cliente.cedula_nit,
            direccion: cliente.direccion,
            ciudad: cliente.ciudad,
            tipo_persona: cliente.tipo_persona,
            fuente_adquisicion: cliente.fuente_adquisicion,
            estatus: cliente.estatus,
            tieneCuenta: Boolean(cliente.auth_user_id),
          }}
        />
      </Seccion>

      <Seccion titulo={`Equipos (${cliente.sistemas_instalados.length})`}>
        {cliente.sistemas_instalados.length === 0 ? (
          <p className="text-sm text-neutral-400">Todavía no tiene equipos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cliente.sistemas_instalados.map((equipo) => {
              const club = estadoClub(uno(equipo.club_blufil));
              return (
                <li key={equipo.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-800">{ETIQUETA_SISTEMA[equipo.tipo] ?? equipo.tipo}</p>
                      <p className="text-sm text-neutral-500">
                        {equipo.direccion}
                        {equipo.barrio ? ` · ${equipo.barrio}` : " · sin barrio"}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {equipo.fecha_instalacion
                          ? `Instalado el ${formatoFechaCorta.format(new Date(`${equipo.fecha_instalacion}T00:00:00`))}`
                          : "Instalación pendiente"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#eaf7fb] px-3 py-2 text-right text-xs text-[#123C5B]">
                      <p className="font-semibold">Club Blufil · {club.nivel}%</p>
                      <p className="text-neutral-500">
                        {club.vencida
                          ? "Racha vencida"
                          : club.vigenteHasta
                            ? `Vigente hasta ${formatoFechaCorta.format(new Date(`${club.vigenteHasta}T00:00:00`))}`
                            : "Sin mantenimientos"}
                      </p>
                    </div>
                  </div>
                  {escribe && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-[#1a8fac]">Editar equipo</summary>
                      <div className="mt-3">
                        <FormularioEquipo clienteId={cliente.id} equipo={equipo} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {escribe && (
          <details className="mt-4 rounded-lg border border-dashed border-neutral-300 p-4" open={cliente.sistemas_instalados.length === 0}>
            <summary className="cursor-pointer text-sm font-medium text-[#123C5B]">Agregar un equipo</summary>
            <div className="mt-3">
              <FormularioEquipo clienteId={cliente.id} direccionSugerida={cliente.direccion} />
            </div>
          </details>
        )}
      </Seccion>

      <Seccion titulo="Historial de servicios">
        {escribe && cliente.sistemas_instalados.length > 0 && (
          <Link
            href={`/admin/solicitudes/nueva?cliente=${cliente.id}`}
            className="mb-3 inline-block rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
          >
            Nueva solicitud
          </Link>
        )}
        {servicios.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin servicios todavía.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {servicios.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/solicitudes/${s.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-neutral-50">
                  <span>
                    <span className="font-medium text-[#123C5B]">{formatoOrden(s.numero_orden)}</span> · {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo}
                    <span className="ml-2 text-xs text-neutral-400">{formatoFechaCorta.format(new Date(s.fecha))}</span>
                  </span>
                  <EstadoChip estado={s.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion titulo="Retomas" ayuda="Equipos viejos que el cliente entregó como parte de pago.">
          {cliente.retomas.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin retomas registradas.</p>
          ) : (
            <ul className="mb-4 divide-y divide-neutral-100">
              {cliente.retomas.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {r.equipo_marca ?? "Equipo"}
                    <span className="ml-2 text-xs text-neutral-400">{formatoFechaCorta.format(new Date(r.created_at))}</span>
                  </span>
                  <span className="tabular-nums text-neutral-600">{r.bono_aplicado != null ? formatoMoneda.format(r.bono_aplicado) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
          {escribe && <FormularioRetoma clienteId={cliente.id} />}
        </Seccion>

        <Seccion titulo="Referidos" ayuda="Clientes que este cliente recomendó.">
          {(referidoPor ?? []).map((r) => (
            <p key={r.id} className="mb-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
              Llegó referido por <strong>{uno(r.clientes)?.nombre ?? "—"}</strong>.
            </p>
          ))}
          {(referidosHechos ?? []).length === 0 ? (
            <p className="text-sm text-neutral-400">No ha referido a nadie todavía.</p>
          ) : (
            <ul className="mb-4 divide-y divide-neutral-100">
              {(referidosHechos ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{uno(r.clientes)?.nombre ?? "—"}</span>
                  <SelectorEstadoReferido referidoId={r.id} clienteId={cliente.id} estado={r.estado} puedeEscribir={escribe} />
                </li>
              ))}
            </ul>
          )}
          {escribe && <FormularioReferido clienteId={cliente.id} opciones={otrosClientes ?? []} />}
        </Seccion>
      </div>
    </div>
  );
}

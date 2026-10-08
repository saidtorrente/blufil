import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SERVICIO, ETIQUETA_SISTEMA } from "@/app/tecnico/etiquetas";
import { esSuperadmin, obtenerAdmin, puedeEscribir } from "../../../admin";
import { EstadoChip, formatoFechaCorta, formatoOrden, uno } from "../../../ui";
import { BotonCrearCuentaTecnico, FormularioTecnico } from "../formulario-tecnico";

type Tecnico = {
  id: string;
  nombre: string;
  cedula: string | null;
  correo: string | null;
  ciudad: string | null;
  zona: string | null;
  certificado: boolean;
  disponible: boolean;
  auth_user_id: string | null;
  created_at: string;
};

type Servicio = {
  id: string;
  numero_orden: number;
  tipo: string;
  estado: string;
  updated_at: string;
  sistemas_instalados: { tipo: string; clientes: { nombre: string } | { nombre: string }[] | null } | null;
};

export default async function TecnicoAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();

  const [{ data: tecnico }, admin, { data: servicios }] = await Promise.all([
    supabase
      .from("tecnicos")
      .select("id, nombre, cedula, correo, ciudad, zona, certificado, disponible, auth_user_id, created_at")
      .eq("id", id)
      .maybeSingle<Tecnico>(),
    obtenerAdmin(supabase),
    supabase
      .from("servicios")
      .select("id, numero_orden, tipo, estado, updated_at, sistemas_instalados(tipo, clientes(nombre))")
      .eq("tecnico_id", id)
      .order("updated_at", { ascending: false })
      .limit(15)
      .returns<Servicio[]>(),
  ]);

  if (!tecnico) notFound();

  const escribe = puedeEscribir(admin);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/tecnicos" className="text-sm text-[#1a8fac] underline underline-offset-2">
          ← Técnicos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-[#123C5B]">{tecnico.nombre}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              tecnico.certificado ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {tecnico.certificado ? "Certificado" : "Sin certificar"}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              tecnico.auth_user_id ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {tecnico.auth_user_id ? "Con acceso al panel" : "Sin acceso al panel"}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">Registrado el {formatoFechaCorta.format(new Date(tecnico.created_at))}</p>
      </div>

      {aviso && <p className="rounded-xl bg-[#eaf7fb] p-4 text-sm text-[#123C5B]">{aviso}</p>}

      {!tecnico.auth_user_id && escribe && (
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-800">Acceso al panel de técnicos</h2>
          <p className="mt-0.5 text-xs text-neutral-400">Hoy este técnico no puede iniciar sesión. Necesita correo y cédula cargados.</p>
          <div className="mt-4">
            {tecnico.correo && tecnico.cedula ? (
              <BotonCrearCuentaTecnico tecnicoId={tecnico.id} />
            ) : (
              <p className="text-sm text-amber-700">Completa el correo y la cédula abajo para poder crear su cuenta.</p>
            )}
          </div>
        </section>
      )}

      <FormularioTecnico
        puedeEscribir={escribe}
        esSuperadmin={esSuperadmin(admin)}
        tecnico={{
          id: tecnico.id,
          nombre: tecnico.nombre,
          cedula: tecnico.cedula,
          correo: tecnico.correo,
          ciudad: tecnico.ciudad,
          zona: tecnico.zona,
          certificado: tecnico.certificado,
          disponible: tecnico.disponible,
          tieneCuenta: Boolean(tecnico.auth_user_id),
        }}
      />

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Servicios recientes</h2>
        {(servicios ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Todavía no tiene servicios.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {(servicios ?? []).map((s) => {
              const sistema = uno(s.sistemas_instalados);
              return (
                <li key={s.id}>
                  <Link href={`/admin/solicitudes/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-neutral-50">
                    <span className="min-w-0">
                      <span className="font-medium text-[#123C5B]">{formatoOrden(s.numero_orden)}</span> ·{" "}
                      {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo}
                      {sistema ? ` · ${ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}` : ""}
                      <span className="block truncate text-xs text-neutral-400">{uno(sistema?.clientes)?.nombre ?? ""}</span>
                    </span>
                    <EstadoChip estado={s.estado} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

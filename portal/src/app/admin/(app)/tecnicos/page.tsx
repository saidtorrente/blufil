import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerAdmin, puedeEscribir } from "../../admin";

type Fila = {
  id: string;
  nombre: string;
  cedula: string | null;
  correo: string | null;
  ciudad: string | null;
  zona: string | null;
  certificado: boolean;
  disponible: boolean;
  auth_user_id: string | null;
  servicios: { estado: string }[];
};

function Chip({ activo, si, no }: { activo: boolean; si: string; no: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        activo ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {activo ? si : no}
    </span>
  );
}

export default async function TecnicosAdminPage() {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);

  const { data: tecnicos, error } = await supabase
    .from("tecnicos")
    .select("id, nombre, cedula, correo, ciudad, zona, certificado, disponible, auth_user_id, servicios(estado)")
    .order("nombre")
    .returns<Fila[]>();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#123C5B]">Técnicos</h1>
          <p className="text-sm text-neutral-500">Quién puede ver y aceptar solicitudes.</p>
        </div>
        {puedeEscribir(admin) && (
          <Link
            href="/admin/tecnicos/nuevo"
            className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
          >
            Nuevo técnico
          </Link>
        )}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">No pudimos cargar los técnicos. Intenta de nuevo.</p>
      ) : (tecnicos ?? []).length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
          Todavía no hay técnicos registrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-medium">Técnico</th>
                <th className="px-4 py-3 font-medium">Cédula</th>
                <th className="px-4 py-3 font-medium">Ciudad / zona</th>
                <th className="px-4 py-3 font-medium">Certificación</th>
                <th className="px-4 py-3 font-medium">Disponibilidad</th>
                <th className="px-4 py-3 font-medium">Acceso</th>
                <th className="px-4 py-3 font-medium">Servicios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(tecnicos ?? []).map((t) => {
                const activos = t.servicios.filter((s) => s.estado === "asignada" || s.estado === "en_progreso").length;
                const hechos = t.servicios.filter((s) => s.estado === "completada").length;
                return (
                  <tr key={t.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tecnicos/${t.id}`} className="font-medium text-[#123C5B] underline-offset-2 hover:underline">
                        {t.nombre}
                      </Link>
                      <p className="text-xs text-neutral-400">{t.correo ?? "sin correo"}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-700">{t.cedula ?? <span className="text-neutral-300">—</span>}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {t.ciudad ?? <span className="text-neutral-300">sin ciudad</span>}
                      {t.zona && <span className="text-xs text-neutral-400"> · {t.zona}</span>}
                    </td>
                    <td className="px-4 py-3"><Chip activo={t.certificado} si="Certificado" no="Sin certificar" /></td>
                    <td className="px-4 py-3"><Chip activo={t.disponible} si="Disponible" no="No disponible" /></td>
                    <td className="px-4 py-3"><Chip activo={Boolean(t.auth_user_id)} si="Con acceso" no="Sin acceso" /></td>
                    <td className="px-4 py-3 text-neutral-700">
                      {activos} en curso
                      <p className="text-xs text-neutral-400">{hechos} completados</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

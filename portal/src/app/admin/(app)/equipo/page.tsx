import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_NIVEL, esSuperadmin, obtenerAdmin, type NivelAdmin } from "../../admin";
import { formatoFechaCorta } from "../../ui";
import { ControlesAdmin, FormularioAdmin } from "./controles";

type Fila = { auth_user_id: string; nombre: string; nivel: NivelAdmin; correo: string | null; created_at: string };

export default async function EquipoPage() {
  const supabase = await createClient();
  const [admin, {
    data: { user },
  }] = await Promise.all([obtenerAdmin(supabase), supabase.auth.getUser()]);

  if (!esSuperadmin(admin)) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-[#123C5B]">Equipo</h1>
        <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Solo un superadmin puede gestionar al equipo de administración.
        </p>
      </div>
    );
  }

  const { data: admins, error } = await supabase
    .from("admins")
    .select("auth_user_id, nombre, nivel, correo, created_at")
    .order("created_at")
    .returns<Fila[]>();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Equipo</h1>
        <p className="text-sm text-neutral-500">Quién puede entrar al panel de administración y qué puede hacer.</p>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Administradores</h2>
        {error ? (
          <p className="mt-3 text-sm text-red-700">No pudimos cargar al equipo. Intenta de nuevo.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {(admins ?? []).map((a) => (
              <li key={a.auth_user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[#123C5B]">
                    {a.nombre}{" "}
                    <span className="rounded-full bg-[#eaf7fb] px-2 py-0.5 text-xs font-medium">{ETIQUETA_NIVEL[a.nivel]}</span>
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    {a.correo ?? "sin correo"} · desde {formatoFechaCorta.format(new Date(a.created_at))}
                  </p>
                </div>
                <ControlesAdmin authUserId={a.auth_user_id} nivel={a.nivel} esYo={a.auth_user_id === user?.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-800">Agregar a alguien</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          La persona crea su propia contraseña: nadie más la conoce. Tampoco se envía por correo.
        </p>
        <div className="mt-4">
          <FormularioAdmin />
        </div>
      </section>
    </div>
  );
}

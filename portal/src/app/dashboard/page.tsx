import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularAlertaMantenimiento } from "./tipos";
import type { Servicio } from "./tipos";

type SistemaResumen = {
  id: string;
  servicios: Servicio[];
  club_blufil: { nivel_descuento: number } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cliente) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">
          Ingresaste correctamente, pero todavía no encontramos un perfil de cliente
          asociado a tu cuenta.
        </p>
        <p className="mt-2 text-sm text-neutral-500">Escríbenos por WhatsApp y lo activamos.</p>
      </div>
    );
  }

  const { data: sistemas } = await supabase
    .from("sistemas_instalados")
    .select("id, servicios(id, tipo, estado, proxima_fecha_mantenimiento, created_at), club_blufil(nivel_descuento)")
    .eq("cliente_id", cliente.id)
    .returns<SistemaResumen[]>();

  const totalEquipos = sistemas?.length ?? 0;
  const equiposConAlerta = (sistemas ?? []).filter((s) => calcularAlertaMantenimiento(s.servicios ?? [])).length;
  const nivelMasAlto = Math.max(0, ...(sistemas ?? []).map((s) => s.club_blufil?.nivel_descuento ?? 0));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Hola, {cliente.nombre}</h1>
        <p className="text-sm text-neutral-500">Este es el resumen de tu cuenta Blufil.</p>
      </div>

      {totalEquipos === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-neutral-600">Todavía no tienes sistemas registrados en tu perfil.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-2xl font-semibold text-[#123C5B]">{totalEquipos}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {totalEquipos === 1 ? "equipo instalado" : "equipos instalados"}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className={`text-2xl font-semibold ${equiposConAlerta > 0 ? "text-amber-600" : "text-[#123C5B]"}`}>
              {equiposConAlerta}
            </p>
            <p className="mt-1 text-sm text-neutral-500">con mantenimiento próximo</p>
          </div>
          <Link
            href="/dashboard/club"
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:ring-[#1EBBEB]"
          >
            <p className="text-2xl font-semibold text-[#123C5B]">{nivelMasAlto}%</p>
            <p className="mt-1 text-sm text-neutral-500">tu mejor nivel en el Club Blufil</p>
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/equipos"
          className="rounded-lg bg-[#123C5B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d2c44]"
        >
          Ver mis equipos
        </Link>
        <Link
          href="/dashboard/referidos"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Referir a un amigo
        </Link>
      </div>
    </div>
  );
}

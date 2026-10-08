import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esSuperadmin, obtenerAdmin, puedeEscribir } from "../../../admin";
import { FormularioTecnico } from "../formulario-tecnico";

export default async function NuevoTecnicoPage() {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/tecnicos" className="text-sm text-[#1a8fac] underline underline-offset-2">
          ← Técnicos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-[#123C5B]">Nuevo técnico</h1>
        <p className="text-sm text-neutral-500">
          Un técnico nuevo queda sin certificar: no verá solicitudes hasta que un superadmin lo certifique.
        </p>
      </div>

      {puedeEscribir(admin) ? (
        <FormularioTecnico puedeEscribir esSuperadmin={esSuperadmin(admin)} />
      ) : (
        <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Tu nivel de acceso es de solo lectura: no puedes crear técnicos.
        </p>
      )}
    </div>
  );
}

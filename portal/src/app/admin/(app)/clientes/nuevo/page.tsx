import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerAdmin, puedeEscribir } from "../../../admin";
import { FormularioCliente } from "../formulario-cliente";

export default async function NuevoClientePage() {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/clientes" className="text-sm text-[#1a8fac] underline underline-offset-2">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-[#123C5B]">Nuevo cliente</h1>
        <p className="text-sm text-neutral-500">Después de crearlo puedes agregarle sus equipos.</p>
      </div>

      {puedeEscribir(admin) ? (
        <FormularioCliente />
      ) : (
        <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5">
          Tu nivel de acceso es de solo lectura: no puedes crear clientes.
        </p>
      )}
    </div>
  );
}

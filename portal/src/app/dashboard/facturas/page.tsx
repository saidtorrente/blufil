import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha, formatoMoneda } from "../tipos";

const ETIQUETA_ESTADO_FACTURA: Record<string, string> = {
  pendiente: "Pendiente",
  emitida: "Emitida",
  anulada: "Anulada",
};

type Factura = {
  id: string;
  estado: string;
  total: number | null;
  created_at: string;
};

export default async function FacturasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: facturas } = await supabase
    .from("facturas")
    .select("id, estado, total, created_at")
    .order("created_at", { ascending: false })
    .returns<Factura[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Facturas</h1>
        <p className="text-sm text-neutral-500">Historial de tus pagos por instalaciones y mantenimientos.</p>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {!facturas || facturas.length === 0 ? (
          <p className="text-center text-neutral-600">Todavía no tienes facturas registradas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100">
            {facturas.map((factura) => (
              <div key={factura.id} className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {factura.total != null ? formatoMoneda.format(factura.total) : "Sin valor"}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatoFecha.format(new Date(factura.created_at))}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {ETIQUETA_ESTADO_FACTURA[factura.estado] ?? factura.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

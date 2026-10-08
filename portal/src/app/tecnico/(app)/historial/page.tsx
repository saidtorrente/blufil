import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SISTEMA, ETIQUETA_SERVICIO } from "../../etiquetas";

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

type Servicio = {
  id: string;
  tipo: string;
  valor_cobrado: number | null;
  fotos: string[] | null;
  created_at: string;
  sistemas_instalados: {
    tipo: string;
    direccion: string;
    clientes: { nombre: string } | null;
  } | null;
};

export default async function HistorialTecnicoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tecnico/login");
  }

  const { data: tecnico } = await supabase
    .from("tecnicos")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tecnico) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">
          Ingresaste correctamente, pero todavía no encontramos un perfil de técnico
          asociado a tu cuenta.
        </p>
        <p className="mt-2 text-sm text-neutral-500">Contacta a Blufil para activarlo.</p>
      </div>
    );
  }

  const { data: servicios } = await supabase
    .from("servicios")
    .select(
      "id, tipo, valor_cobrado, fotos, created_at, sistemas_instalados(tipo, direccion, clientes(nombre))",
    )
    .eq("tecnico_id", tecnico.id)
    .eq("estado", "completada")
    .order("created_at", { ascending: false })
    .returns<Servicio[]>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Mi historial</h1>
        <p className="text-sm text-neutral-500">Servicios que ya completaste.</p>
      </div>

      {!servicios || servicios.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-neutral-400 shadow-sm ring-1 ring-black/5">
          Todavía no has completado ningún servicio.
        </p>
      ) : (
        servicios.map((s) => (
          <div key={s.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="font-medium text-neutral-800">
              {ETIQUETA_SERVICIO[s.tipo] ?? s.tipo} ·{" "}
              {s.sistemas_instalados ? ETIQUETA_SISTEMA[s.sistemas_instalados.tipo] : ""}
            </p>
            <p className="text-sm text-neutral-500">{s.sistemas_instalados?.direccion}</p>
            {s.sistemas_instalados?.clientes && (
              <p className="text-xs text-neutral-400">{s.sistemas_instalados.clientes.nombre}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              <span>{formatoFecha.format(new Date(s.created_at))}</span>
              {s.valor_cobrado != null && <span>{formatoMoneda.format(s.valor_cobrado)}</span>}
              {s.fotos && s.fotos.length > 0 && (
                <span>
                  {s.fotos.length} foto{s.fotos.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

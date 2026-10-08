import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esSuperadmin, obtenerAdmin, puedeEscribir } from "../../admin";
import { AjusteRecordatorios, Tablero, type Tarjeta } from "./tablero";

const DIAS_HECHO_VISIBLE = 30;

export default async function SeguimientoPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const nuevos = vista === "nuevos";
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);

  const desde = new Date(Date.now() - DIAS_HECHO_VISIBLE * 24 * 3600 * 1000).toISOString();

  const [{ data: tarjetas, error }, { data: ajustes }] = await Promise.all([
    supabase
      .from("seguimientos")
      .select(
        "id, tipo, etapa, fecha_objetivo, notas, ultimo_contacto_at, recordatorio_enviado_at, cerrado_at, clientes(id, nombre, telefono, ciudad), sistemas_instalados(tipo, barrio), contactos_seguimiento(canal, nota, created_at)",
      )
      .eq("tipo", nuevos ? "nuevo_cliente" : "mantenimiento")
      .or(`cerrado_at.is.null,cerrado_at.gte.${desde}`)
      .order("fecha_objetivo")
      .order("created_at", { referencedTable: "contactos_seguimiento", ascending: false })
      .limit(5, { referencedTable: "contactos_seguimiento" })
      .limit(300)
      .returns<Tarjeta[]>(),
    supabase.from("ajustes_seguimiento").select("enviar_recordatorios").maybeSingle(),
  ]);

  const pestana = (activa: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      activa ? "bg-[#123C5B] text-white" : "bg-white text-neutral-600 ring-1 ring-black/10 hover:bg-neutral-50"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Seguimiento</h1>
        <p className="text-sm text-neutral-500">
          A quién hay que escribirle o llamarle: mantenimientos por vencer y clientes recién instalados.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/seguimiento" className={pestana(!nuevos)}>
          Mantenimientos
        </Link>
        <Link href="/admin/seguimiento?vista=nuevos" className={pestana(nuevos)}>
          Clientes nuevos
        </Link>
      </div>

      {!nuevos && (
        <AjusteRecordatorios activo={ajustes?.enviar_recordatorios ?? false} puedeEditar={esSuperadmin(admin)} />
      )}

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">No pudimos cargar el seguimiento. Intenta de nuevo.</p>
      ) : (
        <Tablero tarjetas={tarjetas ?? []} nuevos={nuevos} puedeEscribir={puedeEscribir(admin)} />
      )}
    </div>
  );
}

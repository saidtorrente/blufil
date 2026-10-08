"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invocarFuncion, sesionOperador, texto, valoresDe } from "../../../admin";
import type { EstadoForm } from "../../../tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Crea una solicitud a nombre de un cliente (pedida por teléfono). Si queda sin
// técnico, avisa a los técnicos igual que una solicitud hecha en el portal.
export async function crearSolicitud(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { supabase, error } = await sesionOperador();
  const valores = valoresDe(formData);
  if (error) return { error, valores };

  const sistemaId = texto(formData, "sistema_id");
  if (!sistemaId || !UUID.test(sistemaId)) return { error: "Elige el equipo.", valores };

  const tipo = texto(formData, "tipo");
  if (tipo !== "instalacion" && tipo !== "mantenimiento") return { error: "Elige el tipo de servicio.", valores };

  const canal = texto(formData, "canal") ?? "telefono";
  if (canal !== "telefono" && canal !== "whatsapp") return { error: "Canal no válido.", valores };

  const tecnicoId = texto(formData, "tecnico_id");
  if (tecnicoId && !UUID.test(tecnicoId)) return { error: "Técnico no válido.", valores };

  // La fecha deseada se guarda a las 8 a. m. de Colombia (UTC-5, sin horario de verano).
  const fecha = texto(formData, "fecha");
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "La fecha no es válida.", valores };

  const { data, error: errorRpc } = await supabase.rpc("admin_crear_solicitud", {
    p_sistema_instalado_id: sistemaId,
    p_tipo: tipo,
    p_fecha_deseada: fecha ? `${fecha}T08:00:00-05:00` : null,
    p_tecnico_id: tecnicoId,
    p_canal: canal,
  });

  if (errorRpc) {
    // Los mensajes de las reglas de negocio (P0001) ya están pensados para leerse.
    const mensaje =
      errorRpc.code === "P0001"
        ? errorRpc.message
        : errorRpc.code === "42501"
          ? "No tienes permiso para crear solicitudes."
          : "No pudimos crear la solicitud. Intenta de nuevo.";
    return { error: mensaje, valores };
  }

  const creada = (Array.isArray(data) ? data[0] : data) as { visita_id: string; servicio_id: string } | undefined;
  if (!creada) return { error: "No pudimos crear la solicitud. Intenta de nuevo.", valores };

  let aviso = "Solicitud creada.";
  if (tecnicoId) {
    aviso = "Solicitud creada y asignada. El técnico la ve en su panel.";
  } else {
    const resultado = await invocarFuncion(supabase, "notificar-solicitud", { visita_id: creada.visita_id });
    aviso = resultado.ok
      ? "Solicitud creada. Avisamos por correo a los técnicos de la zona."
      : "Solicitud creada, pero no pudimos enviar el aviso a los técnicos. Puedes devolverla a pendiente para reintentarlo.";
  }

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin");
  redirect(`/admin/solicitudes/${creada.servicio_id}?aviso=${encodeURIComponent(aviso)}`);
}

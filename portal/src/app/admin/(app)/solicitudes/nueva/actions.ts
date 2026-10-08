"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aInstante, DURACION_POR_TIPO } from "@/lib/agenda";
import { invocarFuncion, sesionOperador, texto, valoresDe } from "../../../admin";
import type { EstadoForm } from "../../../tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Crea una solicitud a nombre de un cliente (pedida por teléfono o WhatsApp).
// Con técnico, día y hora queda programada y se avisa al cliente y al técnico; sin
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

  const fecha = texto(formData, "fecha");
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "La fecha no es válida.", valores };

  const hora = texto(formData, "hora");
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) return { error: "La hora no es válida.", valores };
  if (hora && (!fecha || !tecnicoId)) return { error: "Para fijar la hora elige también el día y el técnico.", valores };

  // Sin hora, la fecha es solo la deseada por el cliente (se guarda a las 8 a. m. de Colombia).
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
  if (tecnicoId && fecha && hora) {
    const inicio = aInstante(fecha, hora);
    const { error: errorProgramar } = inicio
      ? await supabase.rpc("programar_servicio", {
          p_servicio_id: creada.servicio_id,
          p_inicio: inicio,
          p_duracion: DURACION_POR_TIPO[tipo],
          p_tecnico_id: tecnicoId,
          p_forzar: false,
        })
      : { error: { message: "La fecha y la hora no son válidas." } };
    if (errorProgramar) {
      aviso = `Solicitud creada y asignada, pero no se pudo fijar la hora: ${errorProgramar.message} Prográmala desde aquí.`;
    } else {
      const resultado = await invocarFuncion(supabase, "notificar-agenda", {
        servicio_id: creada.servicio_id,
        evento: "confirmada",
      });
      aviso =
        resultado.ok && !resultado.mensaje
          ? "Solicitud creada y visita programada. Avisamos al cliente y al técnico por correo."
          : "Solicitud creada y visita programada, pero no pudimos enviar todos los correos de aviso.";
    }
  } else if (tecnicoId) {
    aviso = "Solicitud creada y asignada. Falta fijar el día y la hora: hazlo aquí o deja que el técnico la proponga.";
  } else {
    const resultado = await invocarFuncion(supabase, "notificar-solicitud", { visita_id: creada.visita_id });
    aviso = resultado.ok
      ? "Solicitud creada. Avisamos por correo a los técnicos de la zona."
      : "Solicitud creada, pero no pudimos enviar el aviso a los técnicos. Puedes devolverla a pendiente para reintentarlo.";
  }

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
  redirect(`/admin/solicitudes/${creada.servicio_id}?aviso=${encodeURIComponent(aviso)}`);
}

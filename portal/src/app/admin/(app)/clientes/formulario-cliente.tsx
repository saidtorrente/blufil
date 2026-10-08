"use client";

import { useActionState } from "react";
import { BotonEnviar, Campo, Casilla, Mensaje, Seleccion, valorDe } from "../../campos";
import { actualizarCliente, crearCliente } from "./actions";

export type ClienteInicial = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  cedula_nit: string | null;
  direccion: string | null;
  ciudad: string;
  tipo_persona: string;
  fuente_adquisicion: string | null;
  estatus: string;
  tieneCuenta: boolean;
};

const TIPOS_PERSONA = [
  { valor: "natural", etiqueta: "Persona natural (cédula)" },
  { valor: "juridica", etiqueta: "Persona jurídica (NIT)" },
];

const ESTATUS = [
  { valor: "nuevo", etiqueta: "Nuevo" },
  { valor: "activo", etiqueta: "Activo" },
  { valor: "por_vencer", etiqueta: "Por vencer" },
  { valor: "vencido", etiqueta: "Vencido" },
  { valor: "inactivo", etiqueta: "Inactivo" },
];

export function FormularioCliente({ cliente, puedeEscribir = true }: { cliente?: ClienteInicial; puedeEscribir?: boolean }) {
  const editando = Boolean(cliente);
  const accion = cliente ? actualizarCliente.bind(null, cliente.id) : crearCliente;
  const [estado, formAction, pendiente] = useActionState(accion, null);
  const v = (nombre: string, inicial?: string | null) => valorDe(estado, nombre, inicial);
  const bloqueado = !puedeEscribir;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Nombre completo o razón social" nombre="nombre" valor={v("nombre", cliente?.nombre)} requerido deshabilitado={bloqueado} />
        <Seleccion
          etiqueta="Tipo de persona"
          nombre="tipo_persona"
          valor={v("tipo_persona", cliente?.tipo_persona ?? "natural")}
          opciones={TIPOS_PERSONA}
          deshabilitado={bloqueado}
        />
        <Campo
          etiqueta="Cédula o NIT"
          nombre="cedula_nit"
          valor={v("cedula_nit", cliente?.cedula_nit)}
          inputMode="numeric"
          placeholder="Solo números"
          ayuda="Necesaria para facturar en Siigo y para su acceso al portal."
          deshabilitado={bloqueado}
        />
        <Campo
          etiqueta="Correo"
          nombre="correo"
          tipo="email"
          valor={v("correo", cliente?.correo)}
          inputMode="email"
          deshabilitado={bloqueado || cliente?.tieneCuenta}
          ayuda={cliente?.tieneCuenta ? "No se puede cambiar: es el correo de su cuenta de acceso." : undefined}
        />
        <Campo etiqueta="Teléfono / WhatsApp" nombre="telefono" valor={v("telefono", cliente?.telefono)} inputMode="tel" deshabilitado={bloqueado} />
        <Campo etiqueta="Ciudad" nombre="ciudad" valor={v("ciudad", cliente?.ciudad ?? "Barranquilla")} deshabilitado={bloqueado} />
        <Campo etiqueta="Dirección de contacto" nombre="direccion" valor={v("direccion", cliente?.direccion)} deshabilitado={bloqueado} />
        <Campo
          etiqueta="¿Cómo nos conoció?"
          nombre="fuente_adquisicion"
          valor={v("fuente_adquisicion", cliente?.fuente_adquisicion)}
          placeholder="Referido, Instagram, WhatsApp…"
          deshabilitado={bloqueado}
        />
        {editando && (
          <Seleccion etiqueta="Estatus" nombre="estatus" valor={v("estatus", cliente?.estatus)} opciones={ESTATUS} deshabilitado={bloqueado} />
        )}
      </div>

      {!editando && (
        <Casilla
          nombre="crear_cuenta"
          etiqueta="Crear su cuenta de acceso al portal y enviarle el correo de confirmación"
          ayuda="Necesita correo y cédula o NIT. Su contraseña inicial será su cédula; debe confirmar su correo antes de entrar."
          marcada={v("crear_cuenta") === "on"}
        />
      )}

      <div className="flex items-center gap-4">
        {puedeEscribir && <BotonEnviar pendiente={pendiente}>{editando ? "Guardar cambios" : "Crear cliente"}</BotonEnviar>}
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

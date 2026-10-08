"use client";

import { useActionState, useState, useTransition } from "react";
import { BotonEnviar, Campo, Casilla, Mensaje, valorDe } from "../../campos";
import { actualizarTecnico, crearCuentaTecnico, crearTecnico } from "./actions";

export type TecnicoInicial = {
  id: string;
  nombre: string;
  cedula: string | null;
  correo: string | null;
  ciudad: string | null;
  zona: string | null;
  certificado: boolean;
  disponible: boolean;
  tieneCuenta: boolean;
};

export function FormularioTecnico({
  tecnico,
  puedeEscribir,
  esSuperadmin,
}: {
  tecnico?: TecnicoInicial;
  puedeEscribir: boolean;
  esSuperadmin: boolean;
}) {
  const editando = Boolean(tecnico);
  const accion = tecnico ? actualizarTecnico.bind(null, tecnico.id) : crearTecnico;
  const [estado, formAction, pendiente] = useActionState(accion, null);
  const v = (nombre: string, inicial?: string | null) => valorDe(estado, nombre, inicial);
  const bloqueado = !puedeEscribir;
  const cedulaBloqueada = bloqueado || (editando && !esSuperadmin);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Nombre completo" nombre="nombre" valor={v("nombre", tecnico?.nombre)} requerido deshabilitado={bloqueado} />
        <Campo
          etiqueta="Cédula"
          nombre="cedula"
          valor={v("cedula", tecnico?.cedula)}
          inputMode="numeric"
          placeholder="Solo números"
          deshabilitado={cedulaBloqueada}
          ayuda={
            editando && !esSuperadmin
              ? "Solo un superadmin puede cambiarla: es con la que inicia sesión."
              : "Con esta cédula inicia sesión en el panel de técnicos."
          }
        />
        <Campo
          etiqueta="Correo"
          nombre="correo"
          tipo="email"
          valor={v("correo", tecnico?.correo)}
          inputMode="email"
          deshabilitado={bloqueado || tecnico?.tieneCuenta}
          ayuda={tecnico?.tieneCuenta ? "No se puede cambiar: es el correo de su cuenta de acceso." : "Ahí le llegan los avisos de solicitudes nuevas."}
        />
        <Campo etiqueta="Ciudad" nombre="ciudad" valor={v("ciudad", tecnico?.ciudad)} placeholder="Barranquilla" deshabilitado={bloqueado} ayuda="Solo ve y recibe avisos de su ciudad." />
        <Campo etiqueta="Zona" nombre="zona" valor={v("zona", tecnico?.zona)} placeholder="Norte" deshabilitado={bloqueado} />
      </div>

      <div className="flex flex-col gap-3">
        {editando && (
          <Casilla
            nombre="disponible"
            etiqueta="Disponible para nuevos trabajos"
            ayuda="Si está apagado, no recibe avisos de solicitudes nuevas por correo."
            marcada={estado?.valores ? estado.valores.disponible === "on" : tecnico?.disponible}
            deshabilitada={bloqueado}
          />
        )}
        <Casilla
          nombre="certificado"
          etiqueta="Técnico certificado"
          ayuda={
            esSuperadmin
              ? "Solo los certificados ven y aceptan solicitudes."
              : "Solo un superadmin puede certificar a un técnico."
          }
          marcada={estado?.valores ? estado.valores.certificado === "on" : tecnico?.certificado}
          deshabilitada={bloqueado || !esSuperadmin}
        />
        {!editando && (
          <Casilla
            nombre="crear_cuenta"
            etiqueta="Crear su cuenta de acceso y enviarle el correo de confirmación"
            ayuda="Necesita correo y cédula. Su contraseña inicial será su cédula; debe confirmar su correo antes de entrar."
            marcada={v("crear_cuenta") === "on"}
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        {puedeEscribir && <BotonEnviar pendiente={pendiente}>{editando ? "Guardar cambios" : "Crear técnico"}</BotonEnviar>}
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function BotonCrearCuentaTecnico({ tecnicoId }: { tecnicoId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ texto: string; ok: boolean } | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (!window.confirm("Se creará su cuenta de acceso y se le enviará un correo de confirmación. ¿Continuar?")) return;
          setResultado(null);
          startTransition(async () => {
            const error = await crearCuentaTecnico(tecnicoId);
            setResultado(error ? { texto: error, ok: false } : { texto: "Cuenta creada y correo de confirmación enviado.", ok: true });
          });
        }}
        className="rounded-lg bg-[#1EBBEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf] disabled:opacity-60"
      >
        {pendiente ? "Creando…" : "Crear cuenta de acceso"}
      </button>
      {resultado && <p className={`text-sm ${resultado.ok ? "text-green-700" : "text-red-600"}`}>{resultado.texto}</p>}
    </div>
  );
}

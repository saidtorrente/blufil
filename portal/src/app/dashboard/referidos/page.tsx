import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha } from "../tipos";

const ETIQUETA_ESTADO_REFERIDO: Record<string, string> = {
  pendiente: "Pendiente",
  instalado_pagado: "Instalado y pagado",
  credito_liberado: "Crédito liberado",
};

const NUMERO_WHATSAPP_BLUFIL = "573133459232";

type ReferidoFila = {
  id: string;
  estado: string;
  created_at: string;
  referido: { nombre: string } | null;
};

export default async function ReferidosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, codigo_referido")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cliente) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">Todavía no encontramos un perfil de cliente asociado a tu cuenta.</p>
      </div>
    );
  }

  const { data: referidos } = await supabase
    .from("referidos")
    .select("id, estado, created_at, referido:clientes!referidos_referido_cliente_id_fkey(nombre)")
    .eq("referente_cliente_id", cliente.id)
    .order("created_at", { ascending: false })
    .returns<ReferidoFila[]>();

  const mensaje = `Hola, me recomendó un cliente Blufil con el código ${cliente.codigo_referido}. Quiero información sobre un sistema de filtración.`;
  const enlaceWhatsapp = `https://wa.me/${NUMERO_WHATSAPP_BLUFIL}?text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Referidos</h1>
        <p className="text-sm text-neutral-500">Gana beneficios recomendando Blufil.</p>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-[#eaf7fb] p-4">
            <p className="text-2xl font-semibold text-[#123C5B]">10%</p>
            <p className="mt-1 text-sm text-neutral-600">
              de descuento para la persona que refieras, en su primera instalación.
            </p>
          </div>
          <div className="rounded-lg bg-[#eaf7fb] p-4">
            <p className="text-2xl font-semibold text-[#123C5B]">$75.000</p>
            <p className="mt-1 text-sm text-neutral-600">
              de crédito para ti, hacia tu próximo mantenimiento, cuando tu referido instale y pague.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-100 px-4 py-3">
          <div>
            <p className="text-xs text-neutral-500">Tu código</p>
            <p className="text-lg font-semibold tracking-wide text-[#123C5B]">{cliente.codigo_referido}</p>
          </div>
          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-lg bg-[#1EBBEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf]"
          >
            Compartir por WhatsApp
          </a>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Dale este código a tu amigo o familiar — al mencionarlo, quedas registrado como su referente.
        </p>
      </section>

      {referidos && referidos.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-900">Tus referidos</h2>
          <div className="mt-3 flex flex-col divide-y divide-neutral-100">
            {referidos.map((referido) => (
              <div key={referido.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm text-neutral-800">{referido.referido?.nombre ?? "Referido"}</p>
                  <p className="text-xs text-neutral-400">
                    {formatoFecha.format(new Date(referido.created_at))}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {ETIQUETA_ESTADO_REFERIDO[referido.estado] ?? referido.estado}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

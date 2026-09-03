const ETIQUETA_ESTADO_REFERIDO: Record<string, string> = {
  pendiente: "Pendiente",
  instalado_pagado: "Instalado y pagado",
  credito_liberado: "Crédito liberado",
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const NUMERO_WHATSAPP_BLUFIL = "573133459232";

type ReferidoFila = {
  id: string;
  estado: string;
  created_at: string;
  referido: { nombre: string } | null;
};

export function Referidos({
  codigo,
  referidos,
}: {
  codigo: string;
  referidos: ReferidoFila[];
}) {
  const mensaje = `Hola, me recomendó un cliente Blufil con el código ${codigo}. Quiero información sobre un sistema de filtración.`;
  const enlaceWhatsapp = `https://wa.me/${NUMERO_WHATSAPP_BLUFIL}?text=${encodeURIComponent(mensaje)}`;

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-neutral-900">Mis referidos</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Comparte tu código con amigos y familiares. Cuando lo mencionen, quedas registrado como su
        referente.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[#eaf7fb] px-4 py-3">
        <div>
          <p className="text-xs text-neutral-500">Tu código</p>
          <p className="text-lg font-semibold tracking-wide text-[#123C5B]">{codigo}</p>
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

      {referidos.length > 0 && (
        <div className="mt-4 flex flex-col divide-y divide-neutral-100">
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
      )}
    </section>
  );
}

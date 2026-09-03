import { createClient } from "@/lib/supabase/server";
import { formatoFecha } from "../tipos";

const NUMERO_WHATSAPP_BLUFIL = "573133459232";

type Retoma = {
  id: string;
  equipo_marca: string | null;
  bono_aplicado: number | null;
  created_at: string;
};

export default async function RetomasPage() {
  const supabase = await createClient();

  const { data: retomas } = await supabase
    .from("retomas")
    .select("id, equipo_marca, bono_aplicado, created_at")
    .order("created_at", { ascending: false })
    .returns<Retoma[]>();

  const mensaje =
    "Hola, tengo un equipo de filtración de otra marca y quiero saber cómo funciona el programa de retoma de Blufil.";
  const enlaceWhatsapp = `https://wa.me/${NUMERO_WHATSAPP_BLUFIL}?text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Retomas</h1>
        <p className="text-sm text-neutral-500">Cambia tu equipo viejo por descuento en el nuevo.</p>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fotos/retomas.jpg"
          alt="Filtro de agua antiguo siendo reemplazado"
          className="h-40 w-full object-cover"
        />
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[#123C5B]">
            ¿Todavía tienes el filtro viejo debajo del lavaplatos?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Una de las quejas más comunes que escuchamos de clientes que vienen de otros
            proveedores es que su equipo empezó a fallar o a gotear al año o dos de instalado. Si
            tienes un purificador o filtro de cualquier marca que ya no filtra como debería — o que
            simplemente dejaste guardado — no tienes que quedarte con él ni botarlo.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Al instalar tu próximo sistema Blufil, lo recibimos como parte del proceso:{" "}
            <strong className="text-[#123C5B]">$50.000 COP de descuento inmediato</strong>, sin
            importar la marca del equipo que entregues.
          </p>
          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-[#1EBBEB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17a3cf]"
          >
            Preguntar por WhatsApp
          </a>
        </div>
      </section>

      {retomas && retomas.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-neutral-900">Tus retomas anteriores</h2>
          <div className="mt-3 flex flex-col divide-y divide-neutral-100">
            {retomas.map((retoma) => (
              <div key={retoma.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm text-neutral-800">{retoma.equipo_marca ?? "Equipo sin marca registrada"}</p>
                  <p className="text-xs text-neutral-400">
                    {formatoFecha.format(new Date(retoma.created_at))}
                  </p>
                </div>
                {retoma.bono_aplicado != null && (
                  <span className="rounded-full bg-[#eaf7fb] px-2 py-0.5 text-xs font-medium text-[#123C5B]">
                    ${retoma.bono_aplicado.toLocaleString("es-CO")} aplicado
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

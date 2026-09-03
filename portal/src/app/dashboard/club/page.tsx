import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_SISTEMA } from "../tipos";
import { NIVELES_CLUB_BLUFIL, TOPE_NIVEL_CLUB_BLUFIL } from "../club-blufil-niveles";

type SistemaConClub = {
  id: string;
  tipo: string;
  direccion: string;
  club_blufil: { conteo_mantenimientos: number; nivel_descuento: number } | null;
};

export default async function ClubBlufilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cliente) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-neutral-700">Todavía no encontramos un perfil de cliente asociado a tu cuenta.</p>
      </div>
    );
  }

  const { data: sistemas } = await supabase
    .from("sistemas_instalados")
    .select("id, tipo, direccion, club_blufil(conteo_mantenimientos, nivel_descuento)")
    .eq("cliente_id", cliente.id)
    .returns<SistemaConClub[]>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[#123C5B]">Club Blufil</h1>
        <p className="text-sm text-neutral-500">
          Cada mantenimiento que haces con nosotros sube tu nivel de descuento — hasta un tope de 45%.
        </p>
      </div>

      {!sistemas || sistemas.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-neutral-600">Todavía no tienes sistemas registrados en tu perfil.</p>
        </div>
      ) : (
        sistemas.map((sistema) => {
          const conteo = sistema.club_blufil?.conteo_mantenimientos ?? 0;
          const nivelActual = sistema.club_blufil?.nivel_descuento ?? 0;
          const enTope = conteo >= TOPE_NIVEL_CLUB_BLUFIL;
          const proximoNivel = enTope ? null : NIVELES_CLUB_BLUFIL[conteo + 1];

          return (
            <section
              key={sistema.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
            >
              <h2 className="font-semibold text-neutral-900">
                {ETIQUETA_SISTEMA[sistema.tipo] ?? sistema.tipo}
              </h2>
              <p className="text-sm text-neutral-500">{sistema.direccion}</p>

              <div className="mt-4 flex gap-1.5">
                {NIVELES_CLUB_BLUFIL.slice(1).map((_, i) => {
                  const numeroNivel = i + 1;
                  const alcanzado = conteo >= numeroNivel;
                  return (
                    <div
                      key={numeroNivel}
                      className={`h-2 flex-1 rounded-full ${alcanzado ? "bg-[#1EBBEB]" : "bg-neutral-100"}`}
                    />
                  );
                })}
              </div>

              <p className="mt-3 text-sm text-neutral-700">
                Nivel actual: <span className="font-semibold text-[#123C5B]">{nivelActual}%</span>
                {enTope ? (
                  " · Ya llegaste al tope máximo de descuento."
                ) : conteo === 0 ? (
                  <> · Tu primer mantenimiento te da acceso al Club Blufil.</>
                ) : (
                  <> · Con tu próximo mantenimiento subes a {proximoNivel}%.</>
                )}
              </p>
            </section>
          );
        })
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-neutral-900">Cómo funciona</h2>
        <p className="mt-1 text-sm text-neutral-500">
          El descuento aplica sobre el valor del servicio de mantenimiento, y sube con cada mantenimiento
          que hagas dentro de la ventana recomendada.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-400">
                <th className="py-2 font-medium">Mantenimiento #</th>
                <th className="py-2 font-medium">Descuento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {NIVELES_CLUB_BLUFIL.slice(1).map((nivel, i) => (
                <tr key={i}>
                  <td className="py-2 text-neutral-700">
                    {i + 1}
                    {i + 1 === TOPE_NIVEL_CLUB_BLUFIL ? " en adelante" : "°"}
                  </td>
                  <td className="py-2 font-medium text-[#123C5B]">{nivel}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

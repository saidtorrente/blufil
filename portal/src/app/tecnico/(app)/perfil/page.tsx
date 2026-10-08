import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormularioPerfil } from "./formulario";

export default async function PerfilTecnicoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tecnico/login");
  }

  const { data: tecnico } = await supabase
    .from("tecnicos")
    .select("nombre, correo, ciudad, zona, disponible, certificado")
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

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h1 className="text-lg font-semibold text-[#123C5B]">Mi perfil</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Esta información se usa para asignarte solicitudes y avisarte de trabajo nuevo.
      </p>
      <div className="mt-4">
        <FormularioPerfil
          nombre={tecnico.nombre}
          correo={tecnico.correo}
          ciudad={tecnico.ciudad}
          zona={tecnico.zona}
          disponible={tecnico.disponible}
          certificado={tecnico.certificado}
        />
      </div>
    </div>
  );
}

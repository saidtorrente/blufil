"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButtonAdmin() {
  const router = useRouter();
  const supabase = createClient();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
    >
      Cerrar sesión
    </button>
  );
}

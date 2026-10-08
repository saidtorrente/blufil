import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_NIVEL, esSuperadmin, obtenerAdmin } from "../admin";
import { AdminNav } from "./admin-nav";
import { LogoutButtonAdmin } from "./logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const admin = await obtenerAdmin(supabase);

  // Con sesión pero sin ser admin (p. ej. un cliente o un técnico que llegó
  // aquí por URL): no se muestra nada del panel. Los datos igual están
  // protegidos por RLS; esto es solo la cara amable.
  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f9fb] px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <Image
            src="/logo-blufil.png"
            alt="Blufil"
            width={140}
            height={40}
            className="mx-auto mb-6 h-auto w-36"
          />
          <h1 className="text-lg font-semibold text-[#123C5B]">Sin acceso a administración</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Esta cuenta no tiene permisos de administración. Si crees que es un error, escríbele al
            superadmin de Blufil.
          </p>
          <div className="mt-5 flex flex-col items-center gap-3">
            <Link href="/dashboard" className="text-sm text-[#1a8fac] underline underline-offset-2">
              Ir al portal de cliente
            </Link>
            <LogoutButtonAdmin />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f9fb]">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <Image src="/logo-blufil.png" alt="Blufil" width={110} height={32} className="h-auto w-28" />
          <span className="text-xs font-medium text-neutral-400">· Administración</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-neutral-600 sm:block">
            {admin.nombre}{" "}
            <span className="rounded-full bg-[#eaf7fb] px-2 py-0.5 text-xs font-medium text-[#123C5B]">
              {ETIQUETA_NIVEL[admin.nivel]}
            </span>
          </p>
          <LogoutButtonAdmin />
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row md:gap-6 md:px-4 md:py-8">
        <AdminNav esSuperadmin={esSuperadmin(admin)} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}

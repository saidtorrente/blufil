import Image from "next/image";
import Link from "next/link";
import { LogoutButtonTecnico } from "../logout-button";

export default function TecnicoAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f9fb]">
      <header className="flex flex-col gap-2 border-b border-black/5 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/tecnico/dashboard" className="flex items-center gap-2">
          <Image src="/logo-blufil.png" alt="Blufil" width={110} height={32} className="h-auto w-28" />
          <span className="text-xs font-medium text-neutral-400">· Técnicos</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/tecnico/cambiar-clave"
            className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
          >
            Cambiar contraseña
          </Link>
          <LogoutButtonTecnico />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}

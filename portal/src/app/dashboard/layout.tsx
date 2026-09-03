import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { NavTabs } from "./nav-tabs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f9fb]">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4">
        <Image src="/logo-blufil.png" alt="Blufil" width={110} height={32} className="h-auto w-28" />
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/cambiar-clave"
            className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
          >
            Cambiar contraseña
          </Link>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl flex-col md:flex-row md:gap-6 md:px-4 md:py-8">
        <NavTabs />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}

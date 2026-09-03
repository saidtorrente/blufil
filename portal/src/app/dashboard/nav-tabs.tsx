"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/dashboard", etiqueta: "Resumen" },
  { href: "/dashboard/equipos", etiqueta: "Mis equipos" },
  { href: "/dashboard/club", etiqueta: "Club Blufil" },
  { href: "/dashboard/referidos", etiqueta: "Referidos" },
  { href: "/dashboard/retomas", etiqueta: "Retomas" },
  { href: "/dashboard/facturas", etiqueta: "Facturas" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 py-2 md:w-48 md:flex-shrink-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:py-0">
      {PESTANAS.map((pestana) => {
        const activa = pestana.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(pestana.href);
        return (
          <Link
            key={pestana.href}
            href={pestana.href}
            className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              activa ? "bg-[#123C5B] text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {pestana.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}

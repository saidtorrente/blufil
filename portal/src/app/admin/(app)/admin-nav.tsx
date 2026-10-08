"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/admin", etiqueta: "Tablero" },
  { href: "/admin/solicitudes", etiqueta: "Solicitudes" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 py-2 md:w-48 md:flex-shrink-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:py-0">
      {SECCIONES.map((seccion) => {
        const activa = seccion.href === "/admin" ? pathname === "/admin" : pathname.startsWith(seccion.href);
        return (
          <Link
            key={seccion.href}
            href={seccion.href}
            className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              activa ? "bg-[#123C5B] text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {seccion.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}

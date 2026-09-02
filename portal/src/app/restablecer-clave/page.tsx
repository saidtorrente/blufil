"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RestablecerClavePage() {
  const supabase = createClient();
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (nueva.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: nueva });
    setCargando(false);

    if (error) {
      setError("El enlace venció o ya se usó. Solicita uno nuevo desde \"Recuperar contraseña\".");
      return;
    }
    setExito(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f9fb] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <Image
          src="/logo-blufil.png"
          alt="Blufil"
          width={140}
          height={40}
          className="mx-auto mb-8 h-auto w-36"
          priority
        />

        <h1 className="text-lg font-semibold text-[#123C5B]">Nueva contraseña</h1>

        {exito ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-green-700">Tu contraseña se actualizó correctamente.</p>
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#123C5B] py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#0d2c44]"
            >
              Ir al portal de cliente
            </Link>
            <Link
              href="/tecnico/dashboard"
              className="rounded-lg border border-neutral-300 py-2.5 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Ir al panel de técnicos
            </Link>
          </div>
        ) : (
          <form onSubmit={guardar} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Nueva contraseña
              <input
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Confirmar contraseña
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={cargando}
              className="mt-2 rounded-lg bg-[#123C5B] py-2.5 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
            >
              {cargando ? "Guardando…" : "Guardar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CambiarClavePage() {
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
      setError("No pudimos actualizar tu contraseña. Intenta de nuevo.");
      return;
    }
    setExito(true);
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h1 className="text-lg font-semibold text-[#123C5B]">Cambiar contraseña</h1>

      {exito ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-green-700">Tu contraseña se actualizó correctamente.</p>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#123C5B] py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#0d2c44]"
          >
            Volver a mi portal
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
            className="rounded-lg bg-[#123C5B] py-2.5 text-sm font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
          >
            {cargando ? "Guardando…" : "Guardar"}
          </button>
        </form>
      )}
    </div>
  );
}

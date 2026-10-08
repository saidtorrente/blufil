"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function ingresar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password });
    if (error) {
      setCargando(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function recuperar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);

    // Se inicia desde el navegador a propósito: el flujo PKCE guarda un
    // verificador en una cookie de este navegador, y /auth/recuperar lo
    // necesita para canjear el enlace del correo.
    await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/auth/recuperar`,
    });

    setCargando(false);
    // Respuesta genérica: no revela si el correo es de un administrador.
    setAviso("Si ese correo es de un administrador, te enviamos las instrucciones para crear tu contraseña.");
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

        <div>
          <h1 className="text-lg font-semibold text-[#123C5B]">Administración</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {modoRecuperar
              ? "Escribe tu correo y te enviamos un enlace para crear o cambiar tu contraseña."
              : "Acceso para el equipo de Blufil."}
          </p>
        </div>

        <form onSubmit={modoRecuperar ? recuperar : ingresar} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-neutral-700">
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
            />
          </label>

          {!modoRecuperar && (
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
              />
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {aviso && <p className="text-sm text-green-700">{aviso}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 rounded-lg bg-[#123C5B] py-2.5 font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
          >
            {cargando ? "Un momento…" : modoRecuperar ? "Enviar enlace" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setModoRecuperar((v) => !v);
              setError(null);
              setAviso(null);
            }}
            className="text-[#1a8fac] underline underline-offset-2"
          >
            {modoRecuperar ? "Volver a ingresar" : "Olvidé mi contraseña / crear contraseña"}
          </button>
        </p>
      </div>
    </main>
  );
}

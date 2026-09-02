"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { iniciarSesionTecnico } from "./actions";

export default function LoginTecnicoPage() {
  return (
    <Suspense fallback={null}>
      <LoginTecnicoForm />
    </Suspense>
  );
}

function LoginTecnicoForm() {
  const searchParams = useSearchParams();
  const [error, formAction, pending] = useActionState(iniciarSesionTecnico, null);

  const mensajeConfirmacion =
    searchParams.get("error") === "confirmacion"
      ? "El enlace de confirmación venció o ya se usó. Contáctanos si necesitas uno nuevo."
      : null;

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
          <h1 className="text-lg font-semibold text-[#123C5B]">Panel de técnicos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Usa tu número de cédula y tu contraseña.
          </p>
        </div>

        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-neutral-700">
            Número de cédula
            <input
              name="cedula"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              required
              placeholder="1002003004"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-neutral-700">
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
            />
          </label>
          {(error || mensajeConfirmacion) && (
            <p className="text-sm text-red-600">{error ?? mensajeConfirmacion}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-[#123C5B] py-2.5 font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
          >
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/recuperar" className="text-[#1a8fac] underline underline-offset-2">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </main>
  );
}

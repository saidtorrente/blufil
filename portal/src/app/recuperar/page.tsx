"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { solicitarRecuperacion } from "./actions";

export default function RecuperarClavePage() {
  const [mensaje, formAction, pending] = useActionState(solicitarRecuperacion, null);

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
          <h1 className="text-lg font-semibold text-[#123C5B]">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ingresa tu número de cédula y te enviamos instrucciones a tu correo.
          </p>
        </div>

        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-neutral-700">
            Número de cédula
            <input
              name="cedula"
              type="text"
              inputMode="numeric"
              required
              placeholder="1002003004"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-[#1EBBEB] focus:ring-1 focus:ring-[#1EBBEB]"
            />
          </label>
          {mensaje && <p className="text-sm text-neutral-600">{mensaje}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-[#123C5B] py-2.5 font-medium text-white transition hover:bg-[#0d2c44] disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviar instrucciones"}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-xs text-neutral-400">
          <Link href="/login" className="underline underline-offset-2 hover:text-neutral-600">
            Soy cliente
          </Link>
          <Link href="/tecnico/login" className="underline underline-offset-2 hover:text-neutral-600">
            Soy técnico
          </Link>
        </div>
      </div>
    </main>
  );
}

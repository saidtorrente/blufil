"use server";

export async function solicitarRecuperacion(
  _prevState: string | null,
  formData: FormData,
): Promise<string> {
  const cedula = String(formData.get("cedula") ?? "").trim();

  if (!cedula) {
    return "Ingresa tu número de cédula.";
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recuperar-clave`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula }),
    cache: "no-store",
  });

  return "Si existe una cuenta con esa cédula, te enviamos un correo con instrucciones para restablecer tu contraseña.";
}

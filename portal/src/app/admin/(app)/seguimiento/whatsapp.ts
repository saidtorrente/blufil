// WhatsApp «click to chat»: abre la conversación con el mensaje ya escrito.
// Mientras no exista la API oficial, el mensaje lo envía una persona.
export function enlaceWhatsApp(telefono: string | null, mensaje: string): string | null {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10 && digitos.startsWith("3")) digitos = `57${digitos}`; // celular colombiano
  if (digitos.length < 11 || digitos.length > 15) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

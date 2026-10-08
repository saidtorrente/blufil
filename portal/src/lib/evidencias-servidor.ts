import type { SupabaseClient } from "@supabase/supabase-js";

// Devuelve el enlace temporal de cada evidencia (ruta -> URL). Las evidencias
// nuevas viven en Cloudflare R2 (rutas `r2:<servicio>/<archivo>`) y las firma la
// Edge Function `evidencias-r2`, que verifica que el usuario pueda verlas; las
// anteriores siguen en el bucket `servicios-fotos` de Supabase.
export async function firmarEvidencias(supabase: SupabaseClient, rutas: string[]): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  const unicas = [...new Set(rutas)];
  const enR2 = unicas.filter((r) => r.startsWith("r2:"));
  const enSupabase = unicas.filter((r) => !r.startsWith("r2:"));

  if (enSupabase.length > 0) {
    const { data } = await supabase.storage.from("servicios-fotos").createSignedUrls(enSupabase, 3600);
    data?.forEach((f) => {
      if (f.signedUrl && f.path) urls[f.path] = f.signedUrl;
    });
  }

  if (enR2.length > 0) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      for (let i = 0; i < enR2.length; i += 100) {
        const respuesta = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/evidencias-r2`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ accion: "ver", rutas: enR2.slice(i, i + 100) }),
          cache: "no-store",
        }).catch(() => null);
        if (!respuesta?.ok) continue;
        const cuerpo = (await respuesta.json().catch(() => ({}))) as { urls?: Record<string, string> };
        Object.assign(urls, cuerpo.urls ?? {});
      }
    }
  }

  return urls;
}

# Playbook: Alcance de proyecto + estudio de mercado para un negocio nuevo

Metodología reutilizable para arrancar cualquier proyecto de negocio nuevo (no solo Blufil): cómo definir el alcance, qué inputs pedir, y cómo estructurar un estudio de mercado con evidencia real en lugar de suposiciones.

## Fase 1 — Definir alcance y workflow

Antes de tocar código o investigación, aclarar con el dueño del negocio:

1. **Qué es el negocio** — producto/servicio propio, marca corporativa, e-commerce, o combinación.
2. **Alcance funcional** — qué debe tener la primera versión (sitio, app, tienda).
3. **Fases/roadmap** — MVP informativo primero vs. todo de una vez. Por defecto: MVP primero, features pesadas (ej. e-commerce/pagos) después.
4. **Stack técnico** — reusar patrones ya probados en otros proyectos si aplica (ej. Node.js + Supabase + Hostinger), o esperar a conocer el volumen esperado antes de decidir.
5. **Workflow de desarrollo** — ramas, despliegues, quién aprueba qué.

No asumir el rubro del negocio — preguntar directamente si no es obvio del contexto (dominio, archivos existentes, etc.).

## Fase 2 — Recibir y estructurar el plan de negocios

Pedir el borrador del plan de negocios (aunque esté incompleto). De ahí extraer, como mínimo:

- Catálogo de productos/servicios y sus características diferenciadoras.
- Mercado objetivo (geografía, demografía, psicografía).
- Propuesta de valor y posicionamiento declarados.
- Competidores directos/indirectos ya identificados por el negocio.
- Qué falta (precios, datos financieros, estructura legal) — no inventar cifras, marcarlas como pendientes.

Este documento es el input que determina qué investigar y cómo (rubro local/físico vs. digital/global cambia las fuentes a usar en la Fase 3).

## Fase 3 — Estudio de mercado con dos fuentes independientes

La combinación de fuentes es lo que le da peso profesional al estudio — no basta con una sola.

### 3.1 Fuente estructurada: Apify (scraping a escala)

Elegir actores según el tipo de negocio:

| Objetivo | Actor / enfoque |
|---|---|
| Competidores **locales** con presencia física (instaladores, tiendas, servicios) | Google Maps Scraper + reseñas (ej. `labrat011/google-maps-scraper`, `powerai/google-map-reviews-scraper`) — busca por categoría + ciudad |
| Voz del cliente sobre **productos** vendidos en marketplaces globales | Amazon Reviews Scraper (ej. `intelscrape/amazon-product-review-scraper`) — top productos por # de reseñas de otros vendedores |
| Voz del cliente en mercados **LatAm/locales** | Mercado Libre Scraper (ej. `sourabhbgp/mercadolibre-scraper`) — más relevante que Amazon si el negocio opera en Colombia/LatAm |
| Qué está anunciando la competencia | Facebook/Instagram Ads Library Scraper (ej. `apify/facebook-ads-scraper`) — copy, ofertas, antigüedad del anuncio (señal de que funciona) |
| Tendencias de búsqueda / SEO / qué rankea | Google Search Results (SERP) Scraper (ej. `apidojo/google-search-scraper`) |

Antes de correr a escala: estimar el costo (los actores cobran por resultado, usualmente $0.0004–$0.015 USD por ítem) y confirmarlo con el usuario.

### 3.2 Fuente cualitativa: WebSearch/WebFetch + skills

- `marketing:competitive-brief` — posicionamiento y mensajes de cada competidor, gaps de mercado.
- `sales:account-research` — contexto de mercado/industria más amplio.
- Útil para contexto que no está estructurado en datasets (noticias, reportes de industria, tendencias regulatorias).

## Fase 4 — Síntesis cruzada

Cruzar lo que los competidores **dicen de sí mismos** (Fase 3.2) contra lo que los clientes **realmente reclaman** en reseñas reales (Fase 3.1). Las oportunidades más claras suelen estar en esa brecha: promesas que no se cumplen, quejas que nadie está resolviendo.

## Fase 5 — Buyer personas basados en evidencia

Construir 2-4 perfiles usando datos reales de ambas fuentes (comportamiento/demografía de mercado + lenguaje y necesidades textuales de reseñas), no supuestos genéricos.

## Fase 6 — Entregable

Reporte profesional consolidado, publicado como Artifact (no solo texto plano):

- Resumen ejecutivo
- Panorama de mercado y tendencias
- Análisis competitivo (con fuentes citadas)
- Pain points con evidencia (citas de reseñas reales)
- Mapeo dolor → solución/diferenciador del negocio
- Buyer personas
- Recomendaciones accionables

## Fase 7 — Retroalimentar el plan de negocios

Los hallazgos del estudio deben usarse para completar/ajustar secciones del plan de negocios original (mercado objetivo, propuesta de valor, diferenciación, estrategia de contenidos) — no quedan como un documento aislado.

# Plan de Investigación de Mercado — Blufil

Estado: **borrador para aprobación** — nada de esto se ha ejecutado todavía. Ningún scraping pago corre hasta que se confirme este plan.

## 0. Objetivo

Generar el estudio de mercado y de competencia para Blufil (filtración/tratamiento de agua residencial), con evidencia real de clientes y competidores, para completar las secciones 4 (Análisis del Mercado) y 5 (Estrategia de Marketing) del plan de negocios, e identificar pain points, diferenciadores y buyer personas.

## 1. Alcance: dos mercados

### Mercado A — Local/piloto
Barranquilla, Soledad, Puerto Colombia (según el plan de negocios: mercado de lanzamiento).

### Mercado B — Nacional
Toda Colombia (según el plan de negocios: "expandirse progresivamente hacia otras ciudades de Colombia" — objetivo 1.1). Sirve para dimensionar la oportunidad de expansión y ver si los pain points/competencia cambian por región.

Para el Mercado B, cubrir búsqueda por **ciudad** en Google Maps sería carísimo si se hacen las 32 capitales. Propongo cubrir las 8 ciudades con mayor población/mercado residencial:

Bogotá, Medellín, Cali, Barranquilla (ya incluida en A), Cartagena, Bucaramanga, Pereira, Cúcuta.

*(Si prefieres otro set de ciudades o cobertura total, dímelo antes de ejecutar.)*

## 2. Fuentes de datos por mercado

| # | Fuente | Qué extrae | Mercado A (local) | Mercado B (nacional) |
|---|---|---|---|---|
| 1 | Google Maps Scraper (`labrat011/google-maps-scraper`) | Negocios de filtración/instalación + su rating | Barranquilla, Soledad, Puerto Colombia | 8 ciudades principales |
| 2 | Google Maps Reviews (mismo actor o `powerai/google-map-reviews-scraper`) | Reseñas de esos negocios (quejas de servicio/instalación) | ~20-30 reseñas por negocio | ~15-20 reseñas por negocio |
| 3 | Mercado Libre Scraper (`karamelo/mercadolibre-scraper-espanol-castellano`) | Solo catálogo de la competencia: productos, precios en pesos, vendedores (**sin reseñas**) | N/A — Mercado Libre ya es nacional por naturaleza, cubre ambos mercados en una sola pasada | ✔ |
| 4 | Amazon Reviews Scraper (`igview-owner/amazon-review-scraper`) | Única fuente de reseñas de producto: experiencia real de uso (instalación, fugas, durabilidad, servicio) de los productos más reseñados de otros vendedores | N/A — es una fuente global de producto, no depende de ciudad, aplica igual a ambos mercados | ✔ |
| 5 | Google Search Results / SERP (`apidojo/google-search-scraper`) | Qué busca la gente, quién rankea, tendencias | Queries con "Barranquilla" | Queries sin restricción geográfica ("Colombia" / genéricas) |
| 6 | Facebook/Instagram Ads Library (`apify/facebook-ads-scraper`) | Anuncios activos de competidores, copy, ofertas, antigüedad del anuncio | Filtrado por competidores locales identificados en #1 | Filtrado por keyword a nivel Colombia |

**Mercado Libre solo para catálogo/precios, Amazon como única fuente de reseñas de producto.** Mercado Libre queda para ver qué precios y vendedores existen ya en Colombia (sin extraer reseñas). Toda la "voz del cliente" a nivel de experiencia de producto sale de Amazon. Las reseñas de servicio/instalación (quejas sobre el proveedor, no sobre el producto en sí) siguen saliendo de Google Maps (fuente #2).

## 3. Queries / keywords a usar

**Español (Google Maps, Mercado Libre, SERP, Ads Library):**
- "filtros de agua para el hogar"
- "sistema de ósmosis inversa"
- "ultrafiltración de agua residencial"
- "purificador de agua para casa"
- "instalación de filtros de agua"
- "mantenimiento filtros de agua"

Combinadas con ubicación donde aplique (Mercado A: + ciudad; Mercado B: sin restricción o + cada una de las 8 ciudades para Maps).

**Inglés (Amazon — búsqueda de productos equivalentes, top por # de reseñas):**
- "reverse osmosis water filtration system"
- "under sink ultrafiltration water system"
- "sediment carbon water filter whole house"

## 4. Estimado de costo (Apify, tarifa BRONZE)

| Fuente | Volumen estimado | Costo aprox. |
|---|---|---|
| Google Maps — negocios (A+B) | ~350 lugares | ~$0.28 |
| Google Maps — reseñas (A+B) | ~5,000 reseñas | ~$2.00 |
| Mercado Libre — solo catálogo/precios (sin reseñas) | ~15 productos | ~$0.05 |
| Amazon — reseñas por ASIN (top 5 por categoría x 3 categorías) | ~15 productos, ~750 reseñas | ~$3.75 |
| Google SERP | ~20 queries | ~$0.05 |
| Facebook Ads Library | ~100 anuncios | ~$0.50 |
| **Total aproximado** | | **~$6-7 USD** |

Es un estimado — el costo real depende de cuántos resultados realmente devuelva cada búsqueda. Si algo se dispara muy por encima de esto, pauso y confirmo contigo antes de seguir.

## 5. Secuencia de ejecución

1. Google Maps — negocios competidores (Mercado A, luego B).
2. Google Maps — reseñas de esos negocios.
3. Mercado Libre — solo catálogo/precios de competidores (sin reseñas, cubre A y B a la vez).
4. Amazon — top productos por categoría + reseñas (única fuente de experiencia de uso de producto).
5. Google SERP — tendencias de búsqueda.
6. Facebook Ads Library — anuncios de competidores encontrados en el paso 1 y por keyword.
7. Análisis: extracción de pain points de producto (reseñas de Amazon) + pain points de servicio (reseñas de Maps) vs. lo que promete cada competidor (paso 1 descripciones + paso 6 anuncios).
8. Mapeo dolor → solución/diferenciador de Blufil.
9. Buyer personas (con evidencia local vs. nacional si hay diferencias).
10. Informe final consolidado, publicado como Artifact.

## 6. Lo que necesito que confirmes antes de ejecutar

- [ ] ¿Las 8 ciudades propuestas para el Mercado B están bien, o quieres ajustar la lista?
- [ ] ¿Presupuesto aproximado de ~$6-7 USD en Apify está aprobado para correr todo el plan?

Una vez confirmes, empiezo a ejecutar en el orden de la sección 5.

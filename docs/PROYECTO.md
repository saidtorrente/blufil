# Blufil — Contexto del proyecto

Documento vivo. Se actualiza a medida que avanza el proyecto para que cualquier persona (o sesión de Claude) que retome el trabajo tenga el contexto completo sin repetir investigación ya hecha.

**Última actualización:** 2026-08-31

---

## 1. Qué es Blufil

Empresa de filtración y tratamiento de agua potable con sede en Barranquilla, Colombia.

**Origen real (importante):** Blufil es el relanzamiento/rebrand de un negocio ya operando, **"Innovacenter Filtros Americanos"** — mismo WhatsApp Business, mismo equipo técnico, misma cartera de clientes activa desde al menos 2023. No es un negocio desde cero: hereda operación, clientes recurrentes y también reputación (ver sección 5).

**Dos mercados (decisión tomada 2026-08-29):**
1. **Residencial** — mercado piloto: Barranquilla, Soledad, Puerto Colombia. Portafolio: Doble Filtración, Ultrafiltración, Ósmosis Inversa. Expansión planeada a toda Colombia.
2. **Industrial/B2B** — filtración industrial a la medida + planta desalinizadora móvil. Mercado distinto (otro comprador, otro ciclo de venta, otro rango de precio).

## 2. Identidad de marca

- Logo: [`assets/logo-blufil.png`](../assets/logo-blufil.png) — wordmark negro + gota en degradado azul marino profundo (#123C5B) a cian agua (#1EBBEB). Recoloreado el 2026-09-01: versión original tenía morado (no encajaba con pureza/limpieza/profesionalismo); un segundo intento con teal se veía verde y también se descartó. Azul marino es la versión final confirmada. Ya aplicado en `index.html` (página "en construcción", fondo claro porque el wordmark es negro), en el encabezado del estudio de mercado y en el [Manual de Marca](manual-marca/manual-marca-blufil.html).
- Dominios: blufil.com (con hosting activo en Hostinger, Node.js), blufil.co (registrado, sin hosting aún). Ver memoria `reference_hostinger_mcp.md` para inventario completo de hosting/DNS.
- Email de contacto: hola@blufil.com
- Manual de marca completo (historia, dolor→solución, paleta, tipografía, voz y tono, pilares de mensaje): [`docs/manual-marca/manual-marca-blufil.html`](manual-marca/manual-marca-blufil.html), publicado como Artifact: https://claude.ai/code/artifact/b292286d-9cff-4ea6-b1f2-2376d6a53266
- Variantes de logo generadas (2026-09-01, todas derivadas del archivo maestro, no rehechas a mano): [`assets/logo-blufil-transparent.png`](../assets/logo-blufil-transparent.png) (lockup completo, fondo transparente), [`assets/logo-blufil-icon.png`](../assets/logo-blufil-icon.png) (solo la gota, para favicon/ícono de app/avatar), [`assets/logo-blufil-reverso.png`](../assets/logo-blufil-reverso.png) (wordmark blanco para fondos oscuros — resuelve el pendiente que tenía el manual), y `assets/favicon.ico` + `assets/favicon-*.png` + `assets/apple-touch-icon.png` (listos para enlazar en el `<head>` del sitio).

## 3. Portafolio y precios reales (no estimados — de transacciones reales por WhatsApp)

| Producto/servicio | Precio real cobrado |
|---|---|
| Doble filtración sencilla | $350.000 COP |
| Sistema de ultrafiltración | $450.000 COP (incluye instalación + 1 año garantía) |
| Sistema de ósmosis inversa | $1.650.000 COP |
| Purificador de ozono | $270.000 COP (requiere filtro de sedimentos adicional para ser efectivo) |
| Dispensador sin botellón + doble filtración (nuevo) | $1.090.000 COP |
| Mantenimiento ultrafiltración (básico) | $170.000 – $190.000 COP |
| Mantenimiento con cambio de membrana UV/adaptador | $210.000 – $220.000 COP |
| Cambio de repuesto individual (pluma, filtro suelto) | $45.000 – $155.000 COP |
| Reinstalación por mudanza | $60.000 COP |

**Productos nuevos en evaluación (expansión industrial/B2B):**
- **Filtración industrial a la medida** — sin precio de lista, se cotiza según caudal (5-300+ GPM). Referencia de guía: purimanantial.com (Guatemala).
- **Planta desalinizadora móvil RO** — modelo SPF-SW-0.5T (500 L/h), ficha técnica real recibida (membranas Huitong SW-4040, bomba 2507 dúplex, control PLC). Precio de mercado estimado: **$9.000–$11.000 USD** (central ~$10.000 USD), antes de flete/nacionalización/instalación. Proveedor de referencia (Shandong Pingfanghuan / Shandong Shuipingfang, Alibaba) es nuevo con solo 4 pedidos — recomendado cotizar con 2-3 proveedores adicionales de más trayectoria antes de comprometer la línea.

## 4. Estudio de mercado

Reporte completo publicado como Artifact: **[Estudio de Mercado Blufil](https://claude.ai/code/artifact/c7184542-f75b-4fca-9810-be1cb25370ea)**
Fuente/plan original: [`docs/estudio-mercado/plan-investigacion.md`](estudio-mercado/plan-investigacion.md)
Metodología reutilizable para futuros proyectos: [`docs/playbooks/estrategia-lanzamiento-negocio.md`](playbooks/estrategia-lanzamiento-negocio.md)

Cubre 6 fuentes cruzadas: Google Maps (86 negocios competidores, local + nacional), Mercado Libre Colombia (~300 productos/precios), Amazon US (11 productos, 88 reseñas — pain points reales de producto), Google Search (108 resultados — qué busca el consumidor), Meta Ad Library (19 anuncios activos de competencia), Alibaba (121 productos comparables para la línea industrial), y 10 conversaciones reales de WhatsApp Business de Blufil (anonimizadas).

### Hallazgos clave

1. **Blufil = Filtros Americanos.** La marca actual ya tiene reputación documentada en Google Maps: 3.4★, reseña "estoy llamando y no contestan". El rebrand a Blufil es la oportunidad de resolverlo, no solo un cambio estético.
2. **Ecotrade** es el único competidor con presencia dominante nacional (Maps, Mercado Libre, SEO y publicidad activa simultáneamente) — referencia a vigilar en el mercado nacional, no amenaza inmediata en el piloto local.
3. **El hallazgo con más evidencia cruzada de todo el estudio:** el técnico/agente identificado por nombre propio genera lealtad y reseñas espontáneas — confirmado en Amazon US (reseñas de dispensadores e iSpring: "Nick", "Matt", "Julius"), en Google Maps Colombia ("el señor Julio", "don Luis") y en la operación real de Blufil (el personal ya se identifica por nombre en WhatsApp). Está pasando orgánicamente; falta formalizarlo como política.
4. **Pain points confirmados con evidencia propia, no solo de competencia:** técnico que no llega a la hora acordada (le pasó a Blufil, no solo a competidores) y fuga post-instalación en conexión de filtro (cliente real en Santa Marta).
5. **Motivador de compra #1 en todas las fuentes:** dejar de comprar botellones/agua embotellada.
6. **Descuentos negociados caso por caso** en el chat ("¿cuál sería el último precio?") — riesgo de erosión de margen inconsistente, sin política escrita.
7. Meta Ads (Facebook + Instagram) ya es el canal de adquisición real y funcionando — el primer mensaje de casi todo lead es solo "¿valor?", lo que sugiere anticipar precio en el copy del anuncio.
8. Envío nacional vía transportadora + autoinstalación guiada por video ya se ofrece de forma informal — es la base operativa para escalar a mercado nacional sin desplazar técnicos a cada ciudad desde el día uno.
9. **Parque Industrial Malambo (PIMSA)**, Atlántico — mismo departamento del mercado piloto — lead institucional potencial para la línea de filtración industrial, sin necesidad de expandirse geográficamente.
10. Evidencia real de LTV: un cliente de la muestra mantiene relación con Blufil desde 2023 (instalación → mantenimiento → reinstalación por mudanza → nuevo servicio en 2026), validando el modelo de ingresos recurrentes del plan de negocios.

## 5. Lista de mejoras a implementar (pendiente de cruzar con estrategias propias del usuario)

**Servicio y operación**
- Técnico identificado por nombre desde la primera cotización (formalizar lo que ya pasa orgánicamente)
- SLA de respuesta y cumplimiento de citas visible y comprometido
- Garantía extendida en conexiones/carcasa, no solo en filtro o membrana
- Diagnóstico obligatorio antes de cotizar (usar siempre las preguntas de calificación ya definidas)
- Política de descuentos escrita (ancla de precio de lista + reglas claras de cuándo aplica descuento + registro de cada descuento otorgado)

**Producto**
- Confirmar y comunicar que los repuestos son de medida estándar, no propietaria
- Garantía sobre compresor/enfriamiento en la línea de dispensadores

**Marketing y ventas**
- Anticipar precio o rango en el copy de los anuncios de Meta
- "Deja de comprar botellón" como mensaje central de campaña
- Ficha comparativa simple de los 3 sistemas residenciales (dimensiones, diferencias) para reducir reexplicación repetida a cada lead

**Marca**
- Resolver activamente la reputación heredada de "Filtros Americanos" como parte del relanzamiento

**Expansión**
- Envío nacional + autoinstalación guiada por video como vía formal de expansión
- Cotizar con 2-3 proveedores adicionales de desalinización antes de comprometer esa línea
- PIMSA como primer lead institucional para filtración industrial

## 6. Programas de fidelización y crecimiento (propuestos 2026-08-31, pendientes de aprobación final)

### 6.1 Club Blufil — fidelización escalonada por mantenimiento

Anclas dadas por el usuario: 3° mantenimiento = 15%, 6° = 45%. Escala interpolada:

| Mantenimiento # | Descuento sobre el servicio |
|---|---|
| 1° | 0% |
| 2° | 5% |
| 3° | 15% |
| 4° | 25% |
| 5° | 35% |
| 6° | 45% |
| 7° en adelante | 45% fijo (tope recomendado) |

Decisiones a confirmar con el usuario:
- El descuento aplica sobre mano de obra/servicio, no sobre repuestos (costo fijo real).
- Tope en 45% para proteger margen; alternativa post-6° sugerida: "cada 2 mantenimientos adicionales, 1 repuesto gratis" en vez de seguir subiendo el %.
- Requisito de racha: mantenimiento dentro de la ventana recomendada (6-12 meses) para que cuente — si vence, se reinicia el conteo.
- Reemplaza directamente el riesgo de "descuento negociado caso por caso" identificado en la sección 4 de este documento.

### 6.2 Programa de referidos

- Referido (cliente nuevo): 10% de descuento en su primera instalación.
- Referente (cliente actual): $75.000 COP de crédito hacia su próximo mantenimiento, liberado solo cuando el referido completa instalación y pago (evita fraude).
- Sin límite de referidos. Se registra en el CRM (quién refirió a quién).

### 6.3 Programa de retoma

- Cliente entrega filtro/purificador viejo o dañado, de cualquier marca, al instalar el nuevo sistema Blufil → $50.000 COP de descuento inmediato.
- Recomendado limitar a Ultrafiltración y Ósmosis Inversa (en Doble Filtración, $350.000, el bono representa 14% — considerar bajarlo a $25.000 ahí si se incluye).
- Efecto estratégico: reduce la fricción de cambio para clientes de la competencia con equipos fallando (fugas/fallas a 1-2 años confirmadas como queja común en el estudio). Ángulo de marketing: sostenibilidad/reciclaje.

### 6.4 Trabaja con Nosotros — red de técnicos para expansión nacional

- Perfil: técnicos/plomeros independientes en ciudades con demanda identificada en el estudio pero sin competidor dominante.
- Proceso: postulación → capacitación corta → certificación "Técnico Blufil".
- Pago por servicio completado, tarifas iguales a las vigentes ($45.000–$155.000 según complejidad).
- Control de calidad: foto de instalación terminada + identificación por nombre propio ante el cliente (conecta con el hallazgo #3 de la sección 4).
- Formaliza y mejora la vía de expansión ya usada informalmente (envío + autoinstalación por video), reduciendo el riesgo de fugas por instalación DIY.

## 7. Stack técnico y accesos

- Hosting: Hostinger (Node.js para blufil.com). Ver memoria `reference_hostinger_mcp.md` para tokens/inventario completo — no repetir aquí por seguridad.
- Investigación de mercado: Apify (actores documentados en el pie del reporte de estudio de mercado).
- Repositorio: `/Users/said/Blufil` (git, rama `main`).

## 6.5 Maqueta de la web (landing de conversión)

Maqueta funcional del futuro sitio público, aplicando principios de Alex Hormozi (oferta apilada, garantía fuerte que ataca el miedo real, reducción de fricción) sobre los hallazgos reales del estudio de mercado: [`docs/sitio-web/landing-blufil-mockup.html`](sitio-web/landing-blufil-mockup.html), publicada como Artifact: https://claude.ai/code/artifact/99437a04-1fe4-4482-b37b-4c4d7ff57187

Estructura: Hero (promesa + CTA) → Problema/Solución (dolor real → política Blufil, sección 4) → Cómo funciona (4 pasos) → Sistemas con precio y value stack → Garantía ("si no llegamos a la hora acordada, tu próximo mantenimiento es gratis" — convierte el hallazgo #4 de la sección 4 en la garantía central) → Prueba social (testimonios placeholder, claramente marcados como ejemplo — no reseñas fabricadas presentadas como reales) → Caso real anonimizado (cliente desde 2023) → Programas → FAQ (objeciones) → CTA final + WhatsApp flotante. Animaciones de agua: vaso llenándose en el hero, banda de olas animada, divisores SVG, scroll-reveal — todo CSS/SVG ligero, sin librerías pesadas. Imágenes son ilustraciones genéricas propias (no fotos), marcadas para reemplazar por contenido real.

## 6.6 Versión de producción, lista para subir

Bundle estático auto-contenido en [`site/`](../site/) (`site/index.html` + `site/assets/`, 132KB en total) — misma maqueta de la sección 6.5, pero con imágenes por ruta relativa (no base64), `<head>` completo (meta description, Open Graph, canonical, favicon reales) y estructura de documento completa.

**Verificado contra el hosting real (2026-09-01):** `blufil.com` en Hostinger solo tiene `index.html` (2059 bytes) en `public_html` — la página "en construcción" actual está viva pero su `assets/logo-blufil.png` nunca se subió (el logo está roto en producción ahora mismo, sin que se haya notado).

**Pendiente antes de publicar (no se sube solo, requiere confirmación explícita):**
- [ ] Número real de WhatsApp — el CTA usa un placeholder (`57XXXXXXXXXX`) en 3 lugares (botón flotante, hero, CTA final)
- [ ] Confirmar si se reemplaza ya la página "en construcción" o se espera
- [ ] Testimonios y fotos reales (hoy son placeholders marcados explícitamente como ejemplo)
- [ ] Aprobar el despliegue — subir sobrescribe el contenido actual de `blufil.com` y no es reversible desde Hostinger

**Estado (2026-09-02):** primera versión ya está publicada y en vivo en blufil.com (desplegada con `hosting_deployStaticWebsite`, tras varios intentos por un error 500 transitorio en el endpoint de credenciales de subida de Hostinger — terminó funcionando).

### Carpeta para fotos reales (galería)
El usuario va a colocar fotos reales de servicios ya realizados en [`assets/galeria/`](../assets/galeria/) (creada, vacía). Cualquier jpg/png ahí se puede incorporar a la sección "Galería" del sitio (hoy son 5 casillas placeholder tipo mosaico, honestamente marcadas "Foto real próximamente"). Pendiente decirle al usuario qué fotos concretas conviene priorizar (instalación en proceso, sistema terminado, técnico en sitio, antes/después de un mantenimiento).

### Foto real usada en "Trabaja con Nosotros"
`assets/tecnico-instalacion.jpg` — foto de stock gratuita de Unsplash (Licencia Unsplash: uso comercial permitido, no requiere atribución obligatoria; se dejó crédito visible de todos modos). Autor: Timur Shakerzianov. Fuente: https://unsplash.com/es/fotos/un-hombre-trabajando-en-una-tuberia-en-un-gabinete-wzIjLL4KB-4 — es un placeholder de mejor calidad que la ilustración anterior, pero sigue siendo de stock, no de Blufil; reemplazar cuando haya fotos reales de técnicos Blufil.

### Sección nueva: Trabaja con Nosotros (inscripción de técnicos)
Se agregó al sitio la sección `#tecnicos` — formalización del programa 6.4. Proceso en 3 pasos (Postúlate → Capacitación corta → Certificación) + un mini-formulario (nombre, ciudad, WhatsApp) que arma un mensaje y abre WhatsApp directo — sin backend, no guarda datos, funcional desde ya. Cuando exista el backend (Supabase, fase 3 del plan de desarrollo) se puede reemplazar por un formulario real que guarde la postulación.

## 7.1 Plan de desarrollo

Roadmap completo por fases: [`docs/PLAN-DESARROLLO.md`](PLAN-DESARROLLO.md) — organiza sitio público, backend/CRM, portal de cliente, programas de fidelización, catálogo industrial, e-commerce y expansión nacional en secuencia, con dependencias y preguntas abiertas.

## 8. Requisitos funcionales para el sitio web (pendiente de desarrollo)

Registrado 2026-08-31, para cuando arranquemos el desarrollo del sitio real (hoy solo existe la página "en construcción").

### 8.1 Portal de cliente con historial de servicio

- Al finalizar cada mantenimiento/servicio, se genera un **reporte** que incluye:
  - Fotos tomadas por el técnico durante el servicio (ya es una práctica real — ver control de calidad del programa "Trabaja con Nosotros", sección 6.4).
  - Información del estado del cliente en el **Club Blufil** (mantenimiento # actual, nivel de descuento vigente, próxima fecha recomendada).
- Ese reporte debe quedar **registrado en la web**, no solo enviado por WhatsApp — el cliente debe poder consultar su historial completo de servicios en cualquier momento iniciando sesión con su usuario.
- Implica que el sitio necesita: autenticación de clientes (cuentas/login), una base de datos de historial de servicio por cliente (fotos + fecha + técnico + tipo de servicio + estado del Club Blufil), y almacenamiento de imágenes.
- Se conecta directamente con el CRM que ya está contemplado en el plan de negocios (sección 5.9 del plan: historial de conversaciones, próximo mantenimiento, etc.) — este portal es, en la práctica, la cara visible de ese CRM para el cliente.

## 9. Pendientes / decisiones abiertas

- [ ] Definir estructura legal, accionistas y datos financieros reales (el plan de negocios los marca explícitamente como "por definir")
- [ ] Confirmar diseño/UX del sitio real (hoy solo existe la página "en construcción")
- [ ] Implementar portal de cliente con historial de servicio y reportes de mantenimiento (ver sección 8.1) cuando arranque el desarrollo del sitio
- [ ] Aprobar montos definitivos de los 4 programas de la sección 6 (fidelización, referidos, retoma, técnicos)
- [ ] Decidir si se compromete la línea de desalinización y con qué proveedor

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Estudiantes de UNIMINUTO Virtual que necesitan ejercitar, de forma práctica y recurrente, las 6 competencias académicas transversales de la iniciativa VirtuXperience (ComunicArte, NeuroMath, Voxcivitas, Gerencia+, ActivaTuIdea, LatidoSocial). Llegan buscando una alternativa a la conceptualización teórica: quieren aplicar la competencia en un escenario simulado, recibir retroalimentación y avanzar a su propio ritmo.

## Product Purpose

VirtuXperience Hub es un ecosistema virtual inmersivo (WebXR/3D) que lleva al estudiante, en primera persona, a seis islas — una por línea transversal — cada una con su propio minijuego educativo. Completar el primer reto de una isla desbloquea la insignia que da paso a la siguiente, formando una ruta de progresión obligatoria. Éxito = el estudiante entiende, en la landing, qué es cada línea y por qué le sirve, y avanza de isla en isla completando retos y ganando insignias, no solo consume contenido pasivo.

## Positioning

A diferencia del micrositio institucional actual de VirtuXperience (contenido estático, tarjetas informativas con "Conoce más"), este ecosistema convierte cada línea transversal en un mundo 3D jugable con mecánica de progresión real (insignias que desbloquean la siguiente isla) y tecnología WebXR — aprendizaje experiencial de verdad, no una promesa de "aprendizaje experiencial" sobre una página de folleto.

## Operating Context

- Se accede desde un navegador (desktop o móvil) vía HTTPS; no requiere instalar nada ni crear cuenta.
- El estudiante entra primero a una landing page (paleta y tipografía Lato reales de VirtuXperience de UNIMINUTO, con un diseño propio construido sobre ese lenguaje de marca) y desde ahí elige una isla.
- Dentro de cada isla: navegación en primera persona (WASD + mouse, o táctil/WebXR en celular con ARCore/ARKit), un personaje guía, y un minijuego con retroalimentación inmediata.
- El progreso (insignias desbloqueadas) persiste en `localStorage` del navegador — no hay cuenta ni sincronización entre dispositivos.

## Capabilities and Constraints

- 100% cliente web estático: sin backend, sin base de datos, sin servicios externos de terceros. Build con Vite + TypeScript estricto; motor 3D Babylon.js 8; reconocimiento de escritura a mano (minijuego NeuroMath) con un modelo TensorFlow.js entrenado en el propio navegador.
- Texturas, cielo y audio son 100% procedurales (generados por código): el proyecto no incluye imágenes, modelos 3D ni archivos de audio externos.
- RA (WebXR `immersive-ar`) es una capa experimental opcional, limitada a dispositivos con ARCore/ARKit certificado; la app es completamente funcional sin ella.
- **No es el sitio oficial de UNIMINUTO**: es un proyecto técnico independiente que toma la identidad visual real de VirtuXperience (colores, tipografía) pero con una composición propia y sin autoridad institucional — la landing debe mantener esa aclaración visible pero discreta (no un banner dominante), y nunca mostrar como propios datos institucionales reales que no lo son (certificaciones, logos de organizaciones aliadas, avisos legales, fotografías de personas reales de UNIMINUTO).
- El mecanismo de progresión (las 6 líneas transversales como selector de islas, con número de orden, estado bloqueada/desbloqueada, contador de insignias `X/2`, acción "Entrar"/"Bloqueada") es una decisión de producto ya tomada y no está en discusión: el trabajo visual puede reexpresar su forma (p. ej. de tarjetas a un índice), pero no eliminar ninguna de esas señales de estado.

## Brand Commitments

- Nombre del proyecto: **VirtuXperience Hub**. Nombre de la iniciativa que inspira su identidad visual: **VirtuXperience**, de UNIMINUTO Virtual.
- Paleta tomada por muestreo de píxeles de la landing real (`uniminuto.edu/virtuxperience-home`): azul marino `#0e1a3d`/`#162644`, dorado `#ffd300`, acento teal/cian `#55e5f5`, azul `#004683` (encabezados y CTAs secundarios), y un color exacto por línea transversal (ComunicArte `#6abccc`, NeuroMath `#f54f17`, Voxcivitas `#eee61c`, Gerencia+ `#3887d1`, ActivaTuIdea `#f84f44`, LatidoSocial `#639a44`).
- Tipografía Lato (la misma de la página real), vía Google Fonts.
- Nombres y frases de cada línea transversal son los reales de la página de UNIMINUTO, no inventados.
- La fotografía real de una estudiante en el hero de UNIMINUTO no se reutiliza (es de una persona real); el hero usa en su lugar una captura real del propio juego (`public/landing-preview.jpg`). El footer institucional real (certificaciones, logos de aliados, avisos legales de UNIMINUTO) tampoco se reproduce con esos datos; se mantiene el mismo lenguaje de marca con contenido propio de este proyecto.

## Evidence on Hand

- `docs/CONTEXTO-PEDAGOGICO.md`: documento pedagógico/estratégico oficial de la iniciativa VirtuXperience (objetivos, enfoque DUA, arquitectura del ecosistema, sistema de insignias).
- `docs/evidencias/*.png`: capturas reales de la aplicación funcionando (landing, islas, minijuegos, panel de insignias).
- `public/landing-preview.jpg`: captura real de una isla del juego, usada en la landing en lugar de un video promocional (no existe un video real de este proyecto).
- No hay testimonios, casos de estudio, cifras de uso ni prensa — no deben inventarse.

## Product Principles

1. La progresión es la mecánica, no un adorno: cada isla bloqueada debe comunicar con claridad qué falta para desbloquearla, sin fricción ni ambigüedad.
2. Fidelidad de marca sin impersonación: se usa la paleta, tipografía y contenido reales de VirtuXperience/UNIMINUTO con precisión, pero nunca a costa de presentar como propios datos, fotografías o credenciales institucionales que no son de este proyecto.
3. Cero dependencias externas de contenido: toda textura, sonido e imagen generada en runtime o capturada del propio juego — ninguna foto de stock, ningún activo de terceros.
4. El estudiante real es el lector objetivo: la landing persuade y orienta como lo haría una página institucional real, no como una demo técnica que se explica a sí misma.

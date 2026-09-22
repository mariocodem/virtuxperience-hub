# VirtuXperience Hub — Prueba Técnica

> Ecosistema virtual inmersivo (WebXR/3D) para UNIMINUTO Virtual: un hub navegable en primera persona desde el que se accede a 6 minijuegos educativos, cada uno alineado a una línea transversal de competencias.

**Demo en vivo (si el evaluador la solicita):** ejecutar en local siguiendo la sección [Instalación y ejecución](#instalación-y-ejecución). El proyecto no requiere backend ni cuenta externa.

---

## Tabla de contenido

- [Descripción del proyecto](#descripción-del-proyecto)
- [Tecnologías y herramientas utilizadas](#tecnologías-y-herramientas-utilizadas)
- [Requisitos técnicos](#requisitos-técnicos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Arquitectura de la solución](#arquitectura-de-la-solución)
- [Funcionalidades desarrolladas](#funcionalidades-desarrolladas)
- [Controles](#controles)
- [Evidencias de la solución](#evidencias-de-la-solución)
- [Decisiones técnicas y alcance](#decisiones-técnicas-y-alcance)
- [Información para la evaluación](#información-para-la-evaluación)

---

## Descripción del proyecto

**VirtuXperience Hub** es la implementación técnica de la iniciativa VirtuXperience de UNIMINUTO Virtual (ver contexto pedagógico completo en [`docs/CONTEXTO-PEDAGOGICO.md`](docs/CONTEXTO-PEDAGOGICO.md)).

La aplicación es un **cliente web 3D** construido con [Babylon.js](https://www.babylonjs.com/) que renderiza una plaza central desde la que el usuario, en primera persona, puede caminar hacia 6 portales luminosos. Cada portal representa una línea transversal de competencias y, al entrar en su radio, abre un **minijuego educativo independiente** con su propia interfaz, lógica y sistema de retroalimentación.

El proyecto también incluye una capa experimental de **realidad aumentada vía WebXR** (`immersive-ar`) para dispositivos con soporte ARCore/ARKit, que permite colocar el hub sobre una superficie real detectada por la cámara del celular.

---

## Tecnologías y herramientas utilizadas

| Categoría | Herramienta | Uso en el proyecto |
| --- | --- | --- |
| Lenguaje | TypeScript 5 (`strict` mode) | Todo el código fuente |
| Motor 3D | [Babylon.js](https://www.babylonjs.com/) 8 (`core`, `gui`, `loaders`, `materials`) | Escena 3D, cámara, colisiones, materiales PBR, sombras con PCF, `ReflectionProbe` para luz ambiente, pipeline de post-proceso (bloom, tone mapping ACES, viñeta), glow layer, sistemas de partículas |
| Audio | Web Audio API | Ambiente, pasos y efectos sintetizados por código (sin archivos de sonido) |
| Gráficos procedurales | Canvas 2D + GLSL propio | Texturas de césped/adoquín/piedra con mapas de normales y shader de cielo de atardecer (sin imágenes externas) |
| Machine Learning en navegador | [TensorFlow.js](https://www.tensorflow.org/js) 4 | Red neuronal entrenada en el propio cliente para reconocer dígitos dibujados a mano (minijuego NeuroMath) |
| Build tool / dev server | [Vite](https://vitejs.dev/) 6 | Bundling, HMR, servidor de desarrollo |
| HTTPS local | `@vitejs/plugin-basic-ssl` | Certificado autofirmado para servir por HTTPS, requisito de WebXR/`getUserMedia` como *secure context* |
| Realidad aumentada | WebXR Device API (`immersive-ar`, `hit-test`, `dom-overlay`) | Sesión de RA opcional en dispositivos compatibles |
| Persistencia | `localStorage` del navegador | Sistema de insignias (logros desbloqueados por el usuario) |
| Testing manual | [Playwright](https://playwright.dev/) (herramienta de apoyo, no es dependencia de producción) | Verificación automatizada end-to-end durante el desarrollo (capturas de pantalla, chequeo de consola sin errores) |

No hay backend, base de datos ni servicios externos: la aplicación es 100% estática y corre por completo en el navegador del usuario. Tampoco incluye imágenes, modelos 3D ni audio: texturas, cielo y sonido se generan por código al iniciar.

---

## Requisitos técnicos

- **Node.js** 18 o superior (recomendado 20+).
- **npm** 9 o superior.
- Navegador moderno con soporte WebGL2: Chrome, Edge o Firefox actualizados.
- Para probar la realidad aumentada (opcional, no bloquea el resto de la app): un dispositivo Android con ARCore certificado y Chrome actualizado.

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone <URL-del-repositorio>
cd Proyecto-inmersivo

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo (HTTPS autofirmado)
npm run dev
```

Esto expone la aplicación en:

- `https://localhost:5173/` — para probar desde el mismo equipo.
- `https://<IP-de-tu-red-local>:5173/` — para probar desde un celular conectado a la misma red Wi-Fi (necesario para probar la cámara/RA).

> El primer acceso mostrará una advertencia de "certificado no confiable" porque el HTTPS es autofirmado (necesario para que el navegador habilite `navigator.xr` y `getUserMedia`). Es seguro continuar ("Avanzado" → "Continuar de todos modos").

**Otros scripts disponibles:**

```bash
npm run build     # Compila TypeScript y genera el bundle de producción en dist/
npm run preview   # Sirve el build de producción localmente para verificarlo
```

No se requiere ninguna variable de entorno ni archivo `.env`: el proyecto no consume APIs externas.

---

## Estructura del proyecto

```text
Proyecto-inmersivo/
├── index.html                  # Punto de entrada HTML (canvas + contenedor de UI)
├── vite.config.ts              # Configuración de Vite + plugin de HTTPS local
├── tsconfig.json               # Configuración de TypeScript en modo estricto
├── docs/
│   ├── CONTEXTO-PEDAGOGICO.md  # Descripción pedagógica/estratégica de VirtuXperience
│   └── evidencias/             # Capturas de pantalla de la solución funcionando
└── src/
    ├── main.ts                 # Bootstrap: orquesta escena, jugador, HUD, zonas y XR
    ├── style.css                # Estilos globales de la UI (HTML overlay sobre el canvas)
    ├── core/
    │   └── Game.ts              # Motor Babylon.js: Engine + Scene + loop de render
    ├── scene/
    │   ├── Hub.ts                # Construye terreno, plaza, caminos, monumento central y muros
    │   ├── Environment.ts        # Luces, sombras, reflejos del cielo, niebla, glow y post-proceso
    │   ├── Sky.ts                # Shader de cielo de atardecer (gradiente, sol, estrellas)
    │   ├── Scenery.ts            # Bosque, farolas, bancas, colinas lejanas y luciérnagas (instanciados)
    │   ├── ProceduralTextures.ts # Texturas y mapas de normales generados con Canvas 2D
    │   ├── PlayerController.ts   # Movimiento WASD + mouse look, pasos y balanceo de cabeza
    │   ├── ZoneManager.ts        # Detección de proximidad del jugador a cada zona
    │   ├── ZonePortal.ts         # Portal luminoso de cada zona (baliza, aros, chispas)
    │   ├── Character.ts          # Personajes humanoides: miran al jugador, saludan y hablan
    │   └── zones.config.ts       # Definición declarativa de las 6 zonas (posición, color, minijuego, saludo)
    ├── minigames/                # Un subdirectorio por línea transversal (ver detalle abajo)
    │   ├── neuromath/
    │   ├── comunicarte/
    │   ├── voxcivitas/
    │   ├── gerencia/
    │   ├── activatuidea/
    │   └── latidosocial/
    ├── systems/
    │   ├── AudioSystem.ts        # Audio procedural (Web Audio): ambiente, pasos, proximidad y efectos
    │   ├── BadgeSystem.ts        # Insignias de logro persistidas en localStorage
    │   └── NarrativeSystem.ts    # Punto de extensión para eventos narrativos
    ├── ui/                       # HUD y paneles HTML/CSS de cada minijuego
    ├── xr/
    │   └── setupXR.ts            # Sesión WebXR immersive-ar, hit-test y colocación por RA
    └── types/
        └── zone.ts               # Contratos TypeScript compartidos (ZoneDefinition, contexto de entrada)
```

Cada minijuego sigue el mismo patrón de dos archivos:

- `register<Nombre>.ts`: registra el *handler* del minijuego contra su zona en `zones.config.ts`.
- `<Nombre>Game.ts`: la lógica del minijuego (preguntas, puntaje, tiempo, integración con su HUD).

---

## Arquitectura de la solución

```text
                 ┌─────────────────────────┐
                 │        main.ts          │  bootstrap
                 └────────────┬────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                      │
        ▼                     ▼                      ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  core/Game     │   │  scene/Hub +     │   │  xr/setupXR       │
│  (Engine/Scene │   │  PlayerController│   │  (WebXR immersive-│
│  + render loop)│   │  + ZoneManager   │   │  ar, hit-test)     │
└───────────────┘   └────────┬─────────┘   └──────────────────┘
                              │ proximidad + tecla E
                              ▼
                    ┌───────────────────┐
                    │  zones.config.ts   │  6 ZoneDefinition
                    │  (id, color, ángulo│
                    │  minigameSceneId)  │
                    └─────────┬─────────┘
                              ▼
                 ┌────────────────────────┐
                 │ minigames/<zona>Game.ts │  lógica + puntaje
                 └───────────┬────────────┘
                              ▼
                 ┌────────────────────────┐
                 │  ui/<Zona>HUD.ts        │  overlay HTML/CSS
                 └───────────┬────────────┘
                              ▼
                 ┌────────────────────────┐
                 │ systems/BadgeSystem     │  localStorage
                 └────────────────────────┘
```

**Principios de diseño:**

- **Escena única, minijuegos desacoplados**: no hay recarga de página ni cambio de escena Babylon.js al entrar a un minijuego. `ZoneManager` congela el movimiento del jugador (`freezeMovement`) y el minijuego monta su propio overlay HTML sobre `ui-root`, con un `onExit` para devolver el control al hub.
- **Configuración declarativa de zonas**: agregar una nueva línea transversal es agregar una entrada a `zones.config.ts` y registrar su handler; el hub, el HUD de proximidad y la detección de colisión no requieren cambios.
- **UI como overlay HTML, no como GUI 3D**: cada minijuego (`ui/*HUD.ts`) es una capa DOM independiente del canvas de Babylon.js, lo que permite estilos CSS normales, mejor accesibilidad y reutilización del mismo patrón en los 6 minijuegos.
- **Compatibilidad dual escritorio/XR**: `ZoneManager.update()` recibe la posición del jugador desde `PlayerController` (modo escritorio, WASD + pointer lock) o desde la cámara WebXR (`arCamera.globalPosition`, modo RA), sin duplicar la lógica de detección de zonas.
- **ML embebido sin backend**: el reconocimiento de escritura de NeuroMath entrena un modelo pequeño con TensorFlow.js directamente en el navegador al cargar la app (`digitModel.ts`), sin llamadas a un servicio externo de inferencia.

---

## Funcionalidades desarrolladas

### Hub central
- Navegación en primera persona (WASD + mouse look con pointer lock).
- Parque al atardecer: plaza empedrada con un monumento hexagonal (una banda luminosa por línea transversal), 6 caminos de losas hacia los portales, bancas, farolas, bosque y colinas en el horizonte.
- Cada portal es una baliza con haz de luz, aros giratorios y chispas, en el color de su zona, con un personaje a su lado.
- Detección de proximidad con aviso en pantalla ("Presiona E para entrar") y entrada por tecla `E`.

### Realismo visual
- **Materiales PBR** con texturas y mapas de normales procedurales (césped, adoquín, piedra) en vez de colores planos.
- **Iluminación coherente con el cielo**: el sol del shader de atardecer y la luz direccional apuntan al mismo lado; el cielo se captura en un `ReflectionProbe` que aporta luz ambiente y reflejos a los materiales PBR.
- **Sombras** dinámicas (PCF) de árboles, farolas, bancas, monumento y personajes.
- **Perspectiva atmosférica**: niebla exponencial del color del horizonte y dos capas de colinas que se funden con ella.
- **Post-proceso**: bloom, tone mapping ACES, viñeta, grano y FXAA.
- **Vida ambiental**: luciérnagas (partículas) y farolas que brillan con el `GlowLayer`.
- **Personajes humanoides** (piernas, torso, brazos, cabeza, ojos y cabello) que respiran, giran el cuerpo y la cabeza hacia el jugador, saludan al acercarse y muestran un globo de diálogo propio de su línea transversal.

### Inmersión
- **Sonido procedural** (Web Audio, sin archivos): viento, grillos y un colchón grave de fondo; pasos distintos sobre piedra y pasto; un zumbido que se intensifica al acercarse a un portal (cada zona tiene su nota); y efectos para entrar/salir de una zona, acierto, error e insignia. Se silencia con `M` o con el botón 🔊 (la preferencia se guarda).
- **Andar con peso**: cada paso suena y produce un leve cabeceo y balanceo de la cámara.
- **Transición al cruzar un portal**: destello del color de la zona y un breve "tirón" del campo de visión.
- **Aviso al desbloquear una insignia**, con sonido, sin tener que abrir el panel.

### Los 6 minijuegos

| Zona | Minijuego | Mecánica |
| --- | --- | --- |
| **Comunicarte** | Ordena la frase | El jugador reconstruye 5 frases haciendo clic en las palabras en el orden correcto, contrarreloj. |
| **NeuroMath** | Dibuja la respuesta | El jugador resuelve 5 operaciones matemáticas **dibujando el dígito de la respuesta a mano** sobre un canvas; un modelo de TensorFlow.js entrenado en el navegador reconoce el número dibujado. |
| **VoxCivitas** | Dilemas ciudadanos | 5 dilemas de convivencia y ciudadanía con dos opciones cada uno; el jugador elige y recibe retroalimentación justificando la respuesta correcta. |
| **Gerencia+** | Reparto de recursos | El jugador distribuye un presupuesto limitado (horas, dinero, etc.) entre iniciativas con distinto valor y tope, maximizando el resultado del escenario. |
| **Activa tu idea** | Reto de innovación | Ante un problema real del campus, el jugador elige entre 4 posibles soluciones cuál ataca la causa raíz del problema. |
| **Latido Social** | Emparejar necesidad-acción | El jugador conecta una necesidad social con la acción comunitaria que mejor la resuelve. |

Todos los minijuegos comparten: barra de progreso por pregunta, temporizador, pantalla de resultados al finalizar y desbloqueo de una **insignia** (`BadgeSystem`) persistida en `localStorage` la primera vez que se completan.

### Panel de insignias
- Botón "🏅 Insignias" visible en la esquina superior derecha del hub (clic o tecla `B`) que abre un panel con el catálogo completo de 12 insignias (dos por línea transversal: primera ronda completada y ronda perfecta).
- Cada insignia muestra su estado — desbloqueada (🏅) o bloqueada (🔒) — junto a su nombre y descripción, con un contador de progreso (`X / 12 desbloqueadas`).
- El estado se lee directamente de `localStorage`, por lo que persiste entre sesiones del navegador.

### Realidad aumentada (WebXR, experimental)
- Botón de entrada a sesión `immersive-ar` cuando el navegador/dispositivo lo soporta.
- `hit-test` contra superficies reales para colocar el hub completo sobre el suelo detectado por la cámara.
- `dom-overlay` para mostrar la UI del hub encima del feed de la cámara durante la sesión de RA.
- Manejo de error visible en pantalla (`showXRError`) cuando el dispositivo no certifica ARCore/ARKit, en vez de fallar en silencio.

> **Nota de alcance:** esta función depende de que el hardware del dispositivo tenga ARCore/ARKit certificado. En equipos sin esa certificación (verificado incluso contra la [demo oficial de WebXR](https://immersive-web.github.io/webxr-samples/immersive-ar-session.html), que también falla en esos dispositivos), el navegador rechaza la sesión con `NotSupportedError`. Es una limitación de hardware, no del código. La app sigue siendo completamente funcional en modo escritorio/móvil sin RA.

---

## Controles

| Acción | Control |
| --- | --- |
| Moverse | `W` `A` `S` `D` |
| Mirar alrededor | Mouse (clic sobre el canvas activa el *pointer lock*) |
| Entrar a una zona / minijuego | `E` (estando dentro del radio de una zona) |
| Responder / dibujar en un minijuego | Clic o touch, según el minijuego |
| Ver insignias obtenidas | `B` o clic en el botón "🏅 Insignias" |
| Silenciar / activar el sonido | `M` o clic en el botón 🔊 |
| Entrar a RA (si el dispositivo lo soporta) | Botón de RA en pantalla |

---

## Evidencias de la solución

Capturas tomadas directamente sobre la aplicación corriendo en local (`docs/evidencias/`):

| Captura | Descripción |
| --- | --- |
| ![Hub central](docs/evidencias/hub-general.png?v=0676aa5) | Hub central con los portales de las 6 zonas visibles (Latido Social, Comunicarte y NeuroMath en cuadro). |
| ![Portal y personaje](docs/evidencias/hub-portal-npc.png?v=0676aa5) | Portal de Comunicarte con su personaje saludando y su globo de diálogo, al atardecer. |
| ![NeuroMath](docs/evidencias/neuromath-drawing.png?v=0676aa5) | Zona de NeuroMath cargando el modelo de reconocimiento de escritura antes de iniciar. |
| ![Comunicarte](docs/evidencias/comunicarte-oracion.png?v=0676aa5) | Minijuego de Comunicarte: reconstrucción de una frase por palabras. |
| ![Panel de insignias](docs/evidencias/insignias.png?v=0676aa5) | Panel de insignias mostrando el progreso (2/12) con estados bloqueado/desbloqueado. |
| ![VoxCivitas](docs/evidencias/voxcivitas-dilema.png?v=0676aa5) | Minijuego de VoxCivitas: dilema ciudadano con dos opciones. |
| ![Gerencia+](docs/evidencias/gerencia-recursos.png?v=0676aa5) | Minijuego de Gerencia+: reparto de horas entre iniciativas con presupuesto limitado. |

---

## Decisiones técnicas y alcance

- **Sin backend por diseño**: la prueba se centró en demostrar la experiencia inmersiva y la lógica de los minijuegos en el cliente. El `BadgeSystem` usa `localStorage` en vez de una base de datos porque no había un requisito de persistencia multiusuario/multisesión.
- **RA con cámara real limitada al hardware disponible**: se evaluó una alternativa de *passthrough* de cámara vía `getUserMedia` combinada con seguimiento de manos (TensorFlow.js `hand-pose-detection`) para permitir dibujar con la mano en NeuroMath usando la cámara del computador. Se implementó y se probó, pero el modelo de detección de manos devolvía resultados numéricamente inválidos (`NaN`) en el hardware de prueba disponible incluso tras varios intentos de corrección (backend CPU, ajustes de precisión de texturas WebGL). Ante esa inestabilidad, se decidió **revertir esa función** y mantener el dibujo por mouse/touch, que es estable y no depende de la cámara. El código de RA con `hit-test` (sección anterior) sí se mantiene porque no presentó ese problema y funciona en dispositivos con ARCore/ARKit certificado.
- **Cero assets externos**: las texturas se dibujan con Canvas 2D, el cielo es un shader y el audio se sintetiza con Web Audio. Así se conserva la ejecución 100 % estática y sin descargas; el costo es ~0,5 s extra de arranque para generar las texturas. Si más adelante se quiere un acabado fotográfico, basta con sustituir `ProceduralTextures.ts` por texturas/HDRI reales sin tocar el resto.
- **Realismo y RA**: el terreno de 460 m, las colinas, el bosque exterior, el cielo, las luciérnagas y el post-proceso solo existen en modo escritorio. En RA el hub se reduce ~25× para colocarse sobre una superficie real y esos elementos taparían la cámara, así que se apagan al entrar a la sesión (`Environment.setOutdoorEnabled`).
- **Sin rebote vertical real de la cámara**: la cámara usa gravedad y colisiones de Babylon, que corrigen cualquier cambio de altura; el balanceo al caminar se simula con cabeceos de pitch/roll aplicados de forma incremental (`PlayerController.updateWalk`).
- **TypeScript en modo `strict`** con `noUnusedLocals`/`noUnusedParameters` activados, para mantener el código sin variables u parámetros muertos.

---

## Información para la evaluación

- **Punto de entrada para revisar código**: [`src/main.ts`](src/main.ts) orquesta toda la aplicación; desde ahí es fácil rastrear cada subsistema.
- **Para revisar un minijuego específico**: abrir `src/minigames/<zona>/` — cada uno es autocontenido y sigue el mismo contrato (`ZoneEnterContext`) definido en [`src/types/zone.ts`](src/types/zone.ts).
- **Verificación de tipos**: `npx tsc --noEmit` (sin errores).
- **Build de producción**: `npm run build` (genera `dist/` sin errores; advertencia de tamaño de chunk esperada por el peso de Babylon.js + TensorFlow.js, no es un error).
- **No se requieren credenciales, tokens ni cuentas de terceros** para instalar, ejecutar o evaluar el proyecto.

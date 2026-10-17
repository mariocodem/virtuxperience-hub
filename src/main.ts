import "./style.css";
import "./minigames/neuromath/registerNeuroMath";
import "./minigames/comunicarte/registerComunicarte";
import "./minigames/activatuidea/registerActivaTuIdea";
import "./minigames/gerencia/registerGerencia";
import "./minigames/voxcivitas/registerVoxCivitas";
import "./minigames/latidosocial/registerLatidoSocial";
import { Game } from "./core/Game";
import { buildIsland, isSandAt } from "./scene/Island";
import { PlayerController } from "./scene/PlayerController";
import { AR_SCALE, setupXR } from "./xr/setupXR";
import { HUD } from "./ui/HUD";
import { ZonePanel } from "./ui/ZonePanel";
import { BadgePanel } from "./ui/BadgePanel";
import { ZONE_TRIGGER_RADIUS } from "./scene/zones.config";
import type { ZoneDefinition, ZoneEnterContext } from "./types/zone";
import type { WebXRCamera } from "@babylonjs/core";
import { getDigitModel } from "./minigames/neuromath/digitModel";
import { AudioSystem } from "./systems/AudioSystem";
import { BadgeSystem } from "./systems/BadgeSystem";
import { showBadgeToast } from "./ui/BadgeToast";
import { playZoneTransition } from "./ui/ZoneTransition";
import { LandingPage, isIslandUnlocked } from "./landing/LandingPage";

/**
 * Ciclo de vida de la app: arranca en la landing page (mapa de islas). Al elegir una isla desbloqueada
 * se construye una Scene de Babylon.js nueva sobre un único Engine persistente (ver Game.resetScene);
 * al volver al mapa, esa escena se descarta por completo. Así cada visita a una isla parte de un estado
 * limpio, sin que efectos (partículas, shaders animados, listeners) de una isla se arrastren a la
 * siguiente, pero sin recrear el contexto WebGL en cada entrada/salida.
 */
async function bootstrap(): Promise<void> {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;
  const landingRoot = document.getElementById("landing-root") as HTMLElement;

  // Entrena/carga el modelo de reconocimiento de escritura en segundo plano, antes de que haga falta.
  getDigitModel().catch((error) => console.error("No se pudo preparar el modelo de NeuroMath:", error));

  // UI persistente: vive durante toda la sesión, se reutiliza en cada isla (no se reconstruye).
  const hud = new HUD(uiRoot);
  const zonePanel = new ZonePanel(uiRoot);
  const badgePanel = new BadgePanel(uiRoot);
  const landingPage = new LandingPage(landingRoot);

  // El botón de insignias delega en la isla activa (si hay una); fuera de una isla, no hace nada.
  let onBadgeToggle: () => void = () => undefined;
  hud.onBadgeButtonClick(() => onBadgeToggle());
  hud.onAudioButtonClick(() => AudioSystem.toggleMute());
  hud.setAudioMuted(AudioSystem.isMuted);
  AudioSystem.onMuteChange((muted) => hud.setAudioMuted(muted));

  // El audio solo puede arrancar tras un gesto del usuario: un clic en la landing también sirve.
  const unlockAudio = (): void => AudioSystem.unlock();
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  BadgeSystem.onUnlock((badge) => {
    AudioSystem.play("badge");
    showBadgeToast(uiRoot, badge);
  });

  // El Engine se crea una sola vez (al entrar a la primera isla) y se reutiliza siempre: solo su Scene
  // se descarta y recrea en cada entrada/salida (ver Game.resetScene).
  let game: Game | undefined;
  let activeIsland: { abort: AbortController } | undefined;

  function showLanding(): void {
    canvas.style.display = "none";
    uiRoot.style.display = "none";
    landingPage.show();
  }

  function showIslandView(): void {
    landingPage.hide();
    canvas.style.display = "block";
    uiRoot.style.display = "block";
  }

  function exitToLanding(): void {
    if (!activeIsland) return;
    activeIsland.abort.abort();
    activeIsland = undefined;
    onBadgeToggle = () => undefined;
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__virtux;
    // Libera de inmediato la isla actual y detiene el render loop: la escena vacía resultante no tiene
    // cámara, y renderizarla sin querer en cada frame mientras se ve la landing page fallaría.
    game?.resetScene();
    game?.pause();
    showLanding();
  }

  hud.onMapButtonClick(() => exitToLanding());

  // Red de seguridad final: si algo falla de forma asíncrona (fuera de cualquier try/catch propio, p. ej.
  // un resto de limpieza interna de Babylon al descartar una escena) mientras hay una isla activa, que no
  // quede una pantalla congelada: se vuelve al mapa.
  window.addEventListener("error", (event) => {
    if (!activeIsland) return;
    console.warn("Error inesperado dentro de una isla, se vuelve al mapa:", event.error ?? event.message);
    exitToLanding();
  });

  async function enterIsland(zone: ZoneDefinition, index: number): Promise<void> {
    if (activeIsland) return;
    showIslandView();

    const reused = !!game;
    if (!game) {
      game = new Game(canvas);
    } else {
      game.resetScene();
    }
    // Alias estable: TypeScript no puede garantizar que `game` (variable mutable capturada por los
    // closures de más abajo) siga definida más adelante, aunque aquí ya sepamos que sí lo está.
    const activeGame = game;
    const scene = activeGame.scene;

    // Al reutilizar el motor, algo de la limpieza de la isla anterior (shaders, texturas) puede terminar
    // de forma asíncrona; un frame de margen antes de construir la nueva evita pisarse con ese resto.
    if (reused) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const controller = new AbortController();
    const { signal } = controller;
    activeIsland = { abort: controller };

    // Red de seguridad: si algo de Babylon falla al construir la isla (p. ej. un resto asíncrono de la
    // anterior que de verdad choque), que el jugador vuelva al mapa en vez de quedarse en pantalla negra.
    try {
      const { islandRoot, environment, zoneManager, spawnPosition, spawnYaw } = buildIsland(scene, zone, index);
      const player = new PlayerController(scene, canvas, (x, z) => (isSandAt(x, z) ? "stone" : "grass"));
      player.camera.position.copyFrom(spawnPosition);
      player.camera.rotation.y = spawnYaw;
      environment.setupPostProcessing(player.camera);

      // Gancho solo para desarrollo: permite a los scripts de Playwright colocar la cámara y leer la escena.
      if (import.meta.env.DEV) {
        (window as unknown as Record<string, unknown>).__virtux = {
          game: activeGame,
          player,
          zoneManager,
          environment,
          badges: BadgeSystem,
          audio: AudioSystem,
          landingPage,
        };
      }

      let arCamera: WebXRCamera | undefined;

      document.addEventListener("pointerlockchange", () => hud.setPointerLocked(document.pointerLockElement === canvas), { signal });

      zoneManager.onRangeChange((z, inRange) => {
        if (inRange) hud.showZonePrompt(z.name);
        else hud.hideZonePrompt();
      });

      function attemptEnterZone(): void {
        if (zonePanel.isOpen()) return;
        const z = zoneManager.getZoneInRange();
        if (!z) return;

        hud.hideZonePrompt();
        AudioSystem.play("enter");
        zoneManager.setGreetingsHidden(true);
        playZoneTransition(uiRoot, z.color);
        player.punchFov();

        const ctx: ZoneEnterContext = {
          scene,
          camera: player.camera,
          canvas,
          uiRoot,
          freezeMovement: (frozen) => player.setMovementFrozen(frozen),
          onExit: () => {
            AudioSystem.play("exit");
            zoneManager.setGreetingsHidden(false);
            if (zoneManager.getZoneInRange()?.id === z.id) hud.showZonePrompt(z.name);
          },
        };

        if (z.minigameSceneId) {
          zoneManager.enterZone(z, ctx);
        } else {
          player.setEnabled(false);
          zoneManager.enterZone(z, ctx);
          zonePanel.show(z, () => player.setEnabled(true));
        }
      }

      onBadgeToggle = () => {
        if (zonePanel.isOpen()) return;
        badgePanel.toggle(() => player.setEnabled(true));
        if (badgePanel.isOpen()) player.setEnabled(false);
      };

      window.addEventListener(
        "keydown",
        (event) => {
          const key = event.key.toLowerCase();
          if (key === "e") attemptEnterZone();
          if (key === "b") onBadgeToggle();
          if (key === "m") AudioSystem.toggleMute();
          if (key === "escape" && !badgePanel.isOpen()) exitToLanding();
        },
        { signal }
      );

      let lastProximityUpdate = 0;
      scene.onBeforeRenderObservable.add(() => {
        if (arCamera) {
          zoneManager.update(arCamera.globalPosition, ZONE_TRIGGER_RADIUS * AR_SCALE);
          return;
        }
        zoneManager.update(player.position);

        const now = performance.now();
        if (now - lastProximityUpdate > 100) {
          lastProximityUpdate = now;
          const { index: nearestIndex, distance } = zoneManager.getNearestPortal(player.position);
          const closeness = 1 - (distance - 2) / 12;
          AudioSystem.setProximity(closeness > 0 ? nearestIndex : -1, closeness);
        }
      });

      await setupXR(scene, islandRoot, uiRoot, environment.setOutdoorEnabled, {
        onXRStateChange: (inXR, xrCamera) => {
          arCamera = xrCamera;
          hud.setTouchMode(inXR);
          player.setEnabled(!inXR);
        },
        onSelectTap: () => attemptEnterZone(),
      });

      // Recién aquí, con la cámara y toda la isla ya montadas, arranca (o reinicia) el bucle de render.
      activeGame.run();
    } catch (error) {
      console.error(`No se pudo cargar la isla "${zone.name}":`, error);
      controller.abort();
      activeIsland = undefined;
      onBadgeToggle = () => undefined;
      if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__virtux;
      activeGame.resetScene();
      activeGame.pause();
      showLanding();
    }
  }

  landingPage.onIslandSelect((zone, index) => {
    if (isIslandUnlocked(index)) enterIsland(zone, index);
  });

  showLanding();
}

bootstrap();

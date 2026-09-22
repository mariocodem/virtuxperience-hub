import "./style.css";
import "./minigames/neuromath/registerNeuroMath";
import "./minigames/comunicarte/registerComunicarte";
import "./minigames/activatuidea/registerActivaTuIdea";
import "./minigames/gerencia/registerGerencia";
import "./minigames/voxcivitas/registerVoxCivitas";
import "./minigames/latidosocial/registerLatidoSocial";
import { Game } from "./core/Game";
import { buildHub } from "./scene/Hub";
import { PlayerController } from "./scene/PlayerController";
import { AR_SCALE, setupXR } from "./xr/setupXR";
import { HUD } from "./ui/HUD";
import { ZonePanel } from "./ui/ZonePanel";
import { BadgePanel } from "./ui/BadgePanel";
import { ZONE_TRIGGER_RADIUS } from "./scene/zones.config";
import type { ZoneEnterContext } from "./types/zone";
import type { WebXRCamera } from "@babylonjs/core";
import { getDigitModel } from "./minigames/neuromath/digitModel";
import { AudioSystem } from "./systems/AudioSystem";
import { BadgeSystem } from "./systems/BadgeSystem";
import { showBadgeToast } from "./ui/BadgeToast";
import { playZoneTransition } from "./ui/ZoneTransition";
import { isPavedAt } from "./scene/Hub";

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  // Entrena/carga el modelo de reconocimiento de escritura en segundo plano,
  // para que ya esté listo cuando el jugador llegue a la zona de NeuroMath.
  getDigitModel().catch((error) => console.error("No se pudo preparar el modelo de NeuroMath:", error));

  const game = new Game(canvas);
  const { hubRoot, environment, zoneManager } = buildHub(game.scene);
  const player = new PlayerController(game.scene, canvas, (x, z) => (isPavedAt(x, z) ? "stone" : "grass"));
  environment.setupPostProcessing(player.camera);

  // Gancho solo para desarrollo: permite a los scripts de Playwright colocar la cámara y leer la escena.
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__virtux = { game, player, audio: AudioSystem, zoneManager, badges: BadgeSystem, environment };

  const hud = new HUD(uiRoot);
  const zonePanel = new ZonePanel(uiRoot);
  const badgePanel = new BadgePanel(uiRoot);

  function toggleBadgePanel(): void {
    if (zonePanel.isOpen()) return;
    badgePanel.toggle(() => player.setEnabled(true));
    if (badgePanel.isOpen()) player.setEnabled(false);
  }

  hud.onBadgeButtonClick(() => toggleBadgePanel());

  // Audio: el navegador solo lo permite tras un gesto del usuario.
  const unlockAudio = (): void => AudioSystem.unlock();
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  hud.setAudioMuted(AudioSystem.isMuted);
  hud.onAudioButtonClick(() => AudioSystem.toggleMute());
  AudioSystem.onMuteChange((muted) => hud.setAudioMuted(muted));

  BadgeSystem.onUnlock((badge) => {
    AudioSystem.play("badge");
    showBadgeToast(uiRoot, badge);
  });

  let arCamera: WebXRCamera | undefined;

  document.addEventListener("pointerlockchange", () => {
    hud.setPointerLocked(document.pointerLockElement === canvas);
  });

  zoneManager.onRangeChange((zone, inRange) => {
    if (inRange) {
      hud.showZonePrompt(zone.name);
    } else {
      hud.hideZonePrompt();
    }
  });

  function attemptEnterZone(): void {
    if (zonePanel.isOpen()) return;
    const zone = zoneManager.getZoneInRange();
    if (!zone) return;

    hud.hideZonePrompt();
    AudioSystem.play("enter");
    zoneManager.setGreetingsHidden(true);
    playZoneTransition(uiRoot, zone.color);
    player.punchFov();

    const ctx: ZoneEnterContext = {
      scene: game.scene,
      camera: player.camera,
      canvas,
      uiRoot,
      freezeMovement: (frozen) => player.setMovementFrozen(frozen),
      onExit: () => {
        AudioSystem.play("exit");
        zoneManager.setGreetingsHidden(false);
        if (zoneManager.getZoneInRange()?.id === zone.id) {
          hud.showZonePrompt(zone.name);
        }
      },
    };

    if (zone.minigameSceneId) {
      zoneManager.enterZone(zone, ctx);
    } else {
      player.setEnabled(false);
      zoneManager.enterZone(zone, ctx);
      zonePanel.show(zone, () => player.setEnabled(true));
    }
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "e") attemptEnterZone();
    if (key === "b") toggleBadgePanel();
    if (key === "m") AudioSystem.toggleMute();
  });

  // El zumbido de proximidad se actualiza unas 10 veces por segundo, no en cada frame.
  let lastProximityUpdate = 0;
  game.scene.onBeforeRenderObservable.add(() => {
    if (arCamera) {
      zoneManager.update(arCamera.globalPosition, ZONE_TRIGGER_RADIUS * AR_SCALE);
      return;
    }
    zoneManager.update(player.position);

    const now = performance.now();
    if (now - lastProximityUpdate > 100) {
      lastProximityUpdate = now;
      const { index, distance } = zoneManager.getNearestPortal(player.position);
      const closeness = 1 - (distance - 2) / 12;
      AudioSystem.setProximity(closeness > 0 ? index : -1, closeness);
    }
  });

  await setupXR(game.scene, hubRoot, uiRoot, environment.setOutdoorEnabled, {
    onXRStateChange: (inXR, xrCamera) => {
      arCamera = xrCamera;
      hud.setTouchMode(inXR);
      if (inXR) player.setEnabled(false);
      else player.setEnabled(true);
    },
    onSelectTap: () => attemptEnterZone(),
  });

  game.run();
}

bootstrap();

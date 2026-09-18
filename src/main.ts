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

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  // Entrena/carga el modelo de reconocimiento de escritura en segundo plano,
  // para que ya esté listo cuando el jugador llegue a la zona de NeuroMath.
  getDigitModel().catch((error) => console.error("No se pudo preparar el modelo de NeuroMath:", error));

  const game = new Game(canvas);
  const { hubRoot, environment, zoneManager } = buildHub(game.scene);
  const player = new PlayerController(game.scene, canvas);

  const hud = new HUD(uiRoot);
  const zonePanel = new ZonePanel(uiRoot);
  const badgePanel = new BadgePanel(uiRoot);

  function toggleBadgePanel(): void {
    if (zonePanel.isOpen()) return;
    badgePanel.toggle(() => player.setEnabled(true));
    if (badgePanel.isOpen()) player.setEnabled(false);
  }

  hud.onBadgeButtonClick(() => toggleBadgePanel());

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

    const ctx: ZoneEnterContext = {
      scene: game.scene,
      camera: player.camera,
      canvas,
      uiRoot,
      freezeMovement: (frozen) => player.setMovementFrozen(frozen),
      onExit: () => {
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
  });

  game.scene.onBeforeRenderObservable.add(() => {
    if (arCamera) {
      zoneManager.update(arCamera.globalPosition, ZONE_TRIGGER_RADIUS * AR_SCALE);
    } else {
      zoneManager.update(player.position);
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

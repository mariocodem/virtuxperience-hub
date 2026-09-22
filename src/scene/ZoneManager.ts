import { Scene, ShadowGenerator, TransformNode, Vector3 } from "@babylonjs/core";
import { HUB_RADIUS, ZONE_TRIGGER_RADIUS, ZONES, zoneHandlers } from "./zones.config";
import { createZonePortal, ZonePortalHandle } from "./ZonePortal";
import { createZoneCharacter, ZoneCharacterHandle } from "./Character";
import type { ZoneDefinition, ZoneEnterContext } from "../types/zone";
import { NarrativeSystem } from "../systems/NarrativeSystem";

export type ZoneRangeListener = (zone: ZoneDefinition, inRange: boolean) => void;

export class ZoneManager {
  readonly portals: ZonePortalHandle[] = [];
  private readonly characters: ZoneCharacterHandle[] = [];
  private readonly inRangeState = new Map<string, boolean>();
  private readonly rangeListeners: ZoneRangeListener[] = [];
  private greetingsHidden = false;

  constructor(private readonly scene: Scene, hubRoot: TransformNode, shadowGenerator: ShadowGenerator) {
    ZONES.forEach((zone, index) => {
      const rad = (zone.angleDeg * Math.PI) / 180;
      const localPosition = new Vector3(Math.sin(rad) * HUB_RADIUS, 0, Math.cos(rad) * HUB_RADIUS);
      const portal = createZonePortal(scene, hubRoot, zone, localPosition);
      const character = createZoneCharacter(scene, portal.root, zone, index);
      this.portals.push(portal);
      this.characters.push(character);
      this.inRangeState.set(zone.id, false);

      for (const mesh of portal.root.getChildMeshes()) {
        if (/^(pole|plinth|character|leg|torso|arm|head|hair|neck)/.test(mesh.name)) shadowGenerator.addShadowCaster(mesh);
      }
    });
  }

  /** Oculta los globos de diálogo de los personajes mientras hay un minijuego abierto encima. */
  setGreetingsHidden(hidden: boolean): void {
    this.greetingsHidden = hidden;
  }

  setEffectsEnabled(enabled: boolean): void {
    this.portals.forEach((portal) => portal.setEffectsEnabled(enabled));
  }

  /** Portal más cercano al jugador (índice en ZONES y distancia en metros). */
  getNearestPortal(playerPosition: Vector3): { index: number; distance: number } {
    let index = -1;
    let distance = Infinity;
    this.portals.forEach((portal, i) => {
      const d = Vector3.Distance(playerPosition, portal.getWorldPosition());
      if (d < distance) {
        distance = d;
        index = i;
      }
    });
    return { index, distance };
  }

  onRangeChange(listener: ZoneRangeListener): void {
    this.rangeListeners.push(listener);
  }

  update(playerPosition: Vector3, triggerRadius: number = ZONE_TRIGGER_RADIUS): void {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    this.characters.forEach((character) => character.update(playerPosition, dt, this.greetingsHidden));

    for (const portal of this.portals) {
      const dist = Vector3.Distance(playerPosition, portal.getWorldPosition());
      const inRange = dist < triggerRadius;
      const wasInRange = this.inRangeState.get(portal.zone.id) ?? false;
      if (inRange !== wasInRange) {
        this.inRangeState.set(portal.zone.id, inRange);
        portal.setHighlighted(inRange);
        this.rangeListeners.forEach((listener) => listener(portal.zone, inRange));
      }
    }
  }

  enterZone(zone: ZoneDefinition, ctx: ZoneEnterContext): void {
    NarrativeSystem.trigger(`zone:enter:${zone.id}`);
    const handler = zoneHandlers[zone.id];
    if (handler) {
      handler(zone, ctx);
    }
  }

  getZoneInRange(): ZoneDefinition | undefined {
    for (const [id, inRange] of this.inRangeState) {
      if (inRange) {
        return ZONES.find((zone) => zone.id === id);
      }
    }
    return undefined;
  }
}

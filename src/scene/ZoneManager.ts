import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { HUB_RADIUS, ZONE_TRIGGER_RADIUS, ZONES, zoneHandlers } from "./zones.config";
import { createZonePortal, ZonePortalHandle } from "./ZonePortal";
import { createZoneCharacter } from "./Character";
import type { ZoneDefinition, ZoneEnterContext } from "../types/zone";
import { NarrativeSystem } from "../systems/NarrativeSystem";

export type ZoneRangeListener = (zone: ZoneDefinition, inRange: boolean) => void;

export class ZoneManager {
  readonly portals: ZonePortalHandle[] = [];
  private readonly inRangeState = new Map<string, boolean>();
  private readonly rangeListeners: ZoneRangeListener[] = [];

  constructor(scene: Scene, hubRoot: TransformNode) {
    for (const zone of ZONES) {
      const rad = (zone.angleDeg * Math.PI) / 180;
      const localPosition = new Vector3(Math.sin(rad) * HUB_RADIUS, 0, Math.cos(rad) * HUB_RADIUS);
      const portal = createZonePortal(scene, hubRoot, zone, localPosition);
      createZoneCharacter(scene, portal.root, zone);
      this.portals.push(portal);
      this.inRangeState.set(zone.id, false);
    }
  }

  onRangeChange(listener: ZoneRangeListener): void {
    this.rangeListeners.push(listener);
  }

  update(playerPosition: Vector3, triggerRadius: number = ZONE_TRIGGER_RADIUS): void {
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

import type { Scene, UniversalCamera } from "@babylonjs/core";

export interface ZoneDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  angleDeg: number;
  minigameSceneId?: string;
}

export interface ZoneEnterContext {
  scene: Scene;
  camera: UniversalCamera;
  canvas: HTMLCanvasElement;
  uiRoot: HTMLElement;
  /** Congela/descongela el movimiento del jugador sin soltar el pointer lock, para minijuegos que apuntan con la mira. */
  freezeMovement: (frozen: boolean) => void;
  /** El minijuego debe llamarlo cuando el jugador recupera el control del hub. */
  onExit: () => void;
}

export type ZoneEnterHandler = (zone: ZoneDefinition, ctx: ZoneEnterContext) => void;

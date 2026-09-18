import { Engine, Scene } from "@babylonjs/core";

export class Game {
  readonly engine: Engine;
  readonly scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true });
    this.scene = new Scene(this.engine);

    window.addEventListener("resize", () => this.engine.resize());
  }

  run(): void {
    this.engine.runRenderLoop(() => this.scene.render());
  }
}

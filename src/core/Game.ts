import { Engine, Scene } from "@babylonjs/core";

/**
 * Motor persistente: el Engine (y su contexto WebGL) se crea una sola vez y se reutiliza para todas las
 * islas que se visiten en la sesión. Recrear el Engine en el mismo <canvas> en cada entrada/salida de
 * isla compite con el navegador liberando el contexto WebGL de forma asíncrona (falla de forma
 * intermitente); cambiar solo la Scene es el patrón correcto para "recargar un nivel" en Babylon.js.
 */
export class Game {
  readonly engine: Engine;
  scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true });
    this.scene = new Scene(this.engine);

    window.addEventListener("resize", () => this.engine.resize());
  }

  /** Descarta la escena actual (libera toda su geometría/materiales/texturas) y crea una nueva, vacía. */
  resetScene(): Scene {
    this.scene.dispose();
    this.scene = new Scene(this.engine);
    return this.scene;
  }

  /** Arranca (o reinicia) el bucle de render. Lee `this.scene` en cada frame, así que recoge sin más un resetScene(). */
  run(): void {
    this.engine.stopRenderLoop();
    this.engine.runRenderLoop(() => {
      try {
        this.scene.render();
      } catch (error) {
        // Un frame fallido (p. ej. un resto de compilación de shader asíncrona de la escena anterior,
        // justo tras un resetScene()) no debe tumbar todo el bucle de render: se salta ese frame y sigue.
        console.warn("Frame de render con error, se omite:", error);
      }
    });
  }

  /** Detiene el bucle de render: para cuando no hay ninguna escena con cámara que mostrar (p. ej. en la landing page). */
  pause(): void {
    this.engine.stopRenderLoop();
  }
}

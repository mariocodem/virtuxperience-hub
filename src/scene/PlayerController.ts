import { Scene, UniversalCamera, Vector3 } from "@babylonjs/core";

const EYE_HEIGHT = 1.7;

/**
 * Pide pointer lock sin dejar una promesa rechazada sin capturar. En modo RA
 * (celular, sesión WebXR activa) esta llamada no tiene sentido y el navegador
 * la rechaza; en escritorio funciona igual que antes.
 */
export function safeRequestPointerLock(canvas: HTMLCanvasElement): void {
  if (document.pointerLockElement === canvas) return;
  const result = canvas.requestPointerLock() as unknown;
  if (result instanceof Promise) result.catch(() => undefined);
}

export class PlayerController {
  readonly camera: UniversalCamera;
  private enabled = true;
  private readonly baseSpeed: number;

  constructor(scene: Scene, private readonly canvas: HTMLCanvasElement) {
    this.camera = new UniversalCamera("player", new Vector3(0, EYE_HEIGHT, -20), scene);
    this.camera.setTarget(new Vector3(0, 3, 0));
    this.camera.attachControl(canvas, true);

    this.camera.keysUp = [87, 38];
    this.camera.keysDown = [83, 40];
    this.camera.keysLeft = [65, 37];
    this.camera.keysRight = [68, 39];
    this.camera.angularSensibility = 4000;
    this.camera.speed = 0.7;
    this.baseSpeed = this.camera.speed;
    this.camera.inertia = 0.5;
    this.camera.minZ = 0.1;

    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = new Vector3(0.5, EYE_HEIGHT / 2, 0.5);
    // La cámara representa la posición de los ojos, no el centro de la cápsula:
    // se desplaza el centro del elipsoide hacia abajo para que sus pies (no su
    // centro) queden apoyados en el suelo cuando actúa la gravedad.
    this.camera.ellipsoidOffset = new Vector3(0, -EYE_HEIGHT / 2, 0);

    scene.gravity = new Vector3(0, -0.98, 0);
    scene.collisionsEnabled = true;

    canvas.addEventListener("click", () => {
      if (this.enabled) safeRequestPointerLock(canvas);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.camera.attachControl(this.canvas, true);
    } else {
      this.camera.detachControl();
      if (document.pointerLockElement === this.canvas) {
        document.exitPointerLock();
      }
    }
  }

  /** Congela/descongela el desplazamiento sin tocar el pointer lock ni el mouse-look, para minijuegos de puntería. */
  setMovementFrozen(frozen: boolean): void {
    this.camera.speed = frozen ? 0 : this.baseSpeed;
  }

  get position(): Vector3 {
    return this.camera.globalPosition;
  }
}

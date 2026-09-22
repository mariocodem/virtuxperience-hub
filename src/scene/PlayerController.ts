import { Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { AudioSystem, Surface } from "../systems/AudioSystem";

const EYE_HEIGHT = 1.7;
/** Distancia recorrida entre dos pasos consecutivos. */
const STRIDE = 1.5;
const BASE_FOV = 0.8;

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

  // Estado del andar: pasos, balanceo de cabeza y el "tirón" de campo de visión al entrar a una zona.
  private lastX: number;
  private lastZ: number;
  private stepDistance = 0;
  private gait = 0;
  private walkBlend = 0;
  private appliedBobPitch = 0;
  private appliedRoll = 0;
  private fovPunch = 0;

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly surfaceAt: (x: number, z: number) => Surface = () => "grass"
  ) {
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
    this.camera.maxZ = 900;

    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = new Vector3(0.5, EYE_HEIGHT / 2, 0.5);
    // La cámara representa la posición de los ojos, no el centro de la cápsula:
    // se desplaza el centro del elipsoide hacia abajo para que sus pies (no su
    // centro) queden apoyados en el suelo cuando actúa la gravedad.
    this.camera.ellipsoidOffset = new Vector3(0, -EYE_HEIGHT / 2, 0);

    scene.gravity = new Vector3(0, -0.98, 0);
    scene.collisionsEnabled = true;

    this.camera.fov = BASE_FOV;
    this.lastX = this.camera.position.x;
    this.lastZ = this.camera.position.z;
    scene.onBeforeRenderObservable.add(() => this.updateWalk());

    canvas.addEventListener("click", () => {
      if (this.enabled) safeRequestPointerLock(canvas);
    });
  }

  /** Ensancha brevemente el campo de visión (efecto de "salto" al cruzar un portal). */
  punchFov(amount = 0.28): void {
    this.fovPunch = amount;
  }

  /**
   * Pasos con sonido y balanceo de la cabeza. La cámara tiene gravedad y colisiones, así que no se
   * puede mover su altura sin que el motor la corrija; el rebote se simula con pequeños cabeceos
   * (pitch/roll) aplicados de forma incremental para no pelear con el mouse-look.
   */
  private updateWalk(): void {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    const { x, z } = this.camera.position;
    const moved = Math.hypot(x - this.lastX, z - this.lastZ);
    this.lastX = x;
    this.lastZ = z;

    // Un salto grande es un teletransporte (p. ej. RA o pruebas), no un paso.
    const walking = dt > 0 && moved > 0.002 && moved < 2 && moved / dt > 0.4;
    this.walkBlend += ((walking ? 1 : 0) - this.walkBlend) * (1 - Math.exp(-dt * 8));

    if (walking) {
      this.stepDistance += moved;
      this.gait += (moved / STRIDE) * Math.PI * 2;
      while (this.stepDistance >= STRIDE) {
        this.stepDistance -= STRIDE;
        AudioSystem.footstep(this.surfaceAt(x, z));
      }
    }

    // Un rebote por paso; un balanceo lateral por cada dos pasos.
    const bobPitch = Math.sin(this.gait) * 0.0055 * this.walkBlend;
    const roll = Math.sin(this.gait / 2) * 0.006 * this.walkBlend;
    this.camera.rotation.x += bobPitch - this.appliedBobPitch;
    this.camera.rotation.z += roll - this.appliedRoll;
    this.appliedBobPitch = bobPitch;
    this.appliedRoll = roll;

    this.fovPunch *= Math.exp(-dt * 5);
    this.camera.fov = BASE_FOV + this.fovPunch;
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

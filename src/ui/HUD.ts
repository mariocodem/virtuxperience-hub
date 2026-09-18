export class HUD {
  private readonly crosshairEl: HTMLDivElement;
  private readonly promptEl: HTMLDivElement;
  private readonly lockHintEl: HTMLDivElement;
  private touchMode = false;
  private currentZoneName: string | undefined;

  constructor(root: HTMLElement) {
    this.crosshairEl = document.createElement("div");
    this.crosshairEl.className = "hud-crosshair";
    root.appendChild(this.crosshairEl);

    this.promptEl = document.createElement("div");
    this.promptEl.className = "hud-prompt";
    this.promptEl.style.display = "none";
    root.appendChild(this.promptEl);

    this.lockHintEl = document.createElement("div");
    this.lockHintEl.className = "hud-lock-hint";
    this.lockHintEl.textContent = "Haz clic para jugar";
    root.appendChild(this.lockHintEl);
  }

  showZonePrompt(zoneName: string): void {
    this.currentZoneName = zoneName;
    this.promptEl.textContent = this.touchMode
      ? `Toca la pantalla para entrar a ${zoneName}`
      : `Presiona [E] para entrar a ${zoneName}`;
    this.promptEl.style.display = "block";
  }

  hideZonePrompt(): void {
    this.currentZoneName = undefined;
    this.promptEl.style.display = "none";
  }

  setPointerLocked(locked: boolean): void {
    if (this.touchMode) return;
    this.lockHintEl.style.display = locked ? "none" : "block";
  }

  /** Alterna la interfaz entre el modo escritorio (mouse+teclado) y el modo RA táctil del celular. */
  setTouchMode(enabled: boolean): void {
    this.touchMode = enabled;
    this.crosshairEl.style.display = enabled ? "none" : "block";
    this.lockHintEl.style.display = enabled ? "none" : "block";
    if (this.currentZoneName) this.showZonePrompt(this.currentZoneName);
  }
}

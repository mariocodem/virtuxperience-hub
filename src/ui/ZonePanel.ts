import type { ZoneDefinition } from "../types/zone";

export class ZonePanel {
  private readonly root: HTMLDivElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly descEl: HTMLParagraphElement;
  private closeHandler: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "zone-panel";
    this.root.style.display = "none";

    const card = document.createElement("div");
    card.className = "zone-panel-card";

    this.titleEl = document.createElement("h2");
    this.descEl = document.createElement("p");

    const badge = document.createElement("p");
    badge.className = "zone-panel-badge";
    badge.textContent = "Próximamente";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar (Esc)";
    closeBtn.addEventListener("click", () => this.hide());

    card.append(this.titleEl, this.descEl, badge, closeBtn);
    this.root.appendChild(card);
    container.appendChild(this.root);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen()) this.hide();
    });
  }

  show(zone: ZoneDefinition, onClose: () => void): void {
    this.titleEl.textContent = zone.name;
    this.titleEl.style.color = zone.color;
    this.descEl.textContent = zone.description;
    this.root.style.display = "flex";
    this.closeHandler = onClose;
  }

  hide(): void {
    this.root.style.display = "none";
    this.closeHandler?.();
    this.closeHandler = null;
  }

  isOpen(): boolean {
    return this.root.style.display !== "none";
  }
}

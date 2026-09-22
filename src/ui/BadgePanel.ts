import { BADGE_CATALOG, BadgeSystem } from "../systems/BadgeSystem";

export class BadgePanel {
  private readonly root: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly countEl: HTMLParagraphElement;
  private closeHandler: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "badge-panel";
    this.root.style.display = "none";

    const card = document.createElement("div");
    card.className = "badge-panel-card";

    const title = document.createElement("h2");
    title.textContent = "Insignias";

    this.countEl = document.createElement("p");
    this.countEl.className = "badge-panel-count";

    this.listEl = document.createElement("div");
    this.listEl.className = "badge-panel-list";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar (Esc)";
    closeBtn.addEventListener("click", () => this.hide());

    card.append(title, this.countEl, this.listEl, closeBtn);
    this.root.appendChild(card);
    container.appendChild(this.root);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen()) this.hide();
    });
  }

  show(onClose: () => void): void {
    this.render();
    this.root.style.display = "flex";
    this.closeHandler = onClose;
  }

  hide(): void {
    this.root.style.display = "none";
    this.closeHandler?.();
    this.closeHandler = null;
  }

  toggle(onClose: () => void): void {
    if (this.isOpen()) this.hide();
    else this.show(onClose);
  }

  isOpen(): boolean {
    return this.root.style.display !== "none";
  }

  private render(): void {
    const unlocked = new Set(BadgeSystem.getUnlocked());
    this.countEl.textContent = `${unlocked.size} / ${BADGE_CATALOG.length} desbloqueadas`;
    this.listEl.innerHTML = "";

    for (const badge of BADGE_CATALOG) {
      const isUnlocked = unlocked.has(badge.id);
      const item = document.createElement("div");
      item.className = isUnlocked ? "badge-item unlocked" : "badge-item";

      const icon = document.createElement("div");
      icon.className = "badge-item-icon";
      icon.textContent = isUnlocked ? "🏅" : "🔒";

      const text = document.createElement("div");
      text.className = "badge-item-text";

      const zone = document.createElement("span");
      zone.className = "badge-item-zone";
      zone.textContent = badge.zone;

      const name = document.createElement("strong");
      name.textContent = badge.name;

      const desc = document.createElement("p");
      desc.textContent = badge.description;

      text.append(zone, name, desc);
      item.append(icon, text);
      this.listEl.appendChild(item);
    }
  }
}

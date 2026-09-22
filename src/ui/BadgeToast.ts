import type { BadgeDefinition } from "../systems/BadgeSystem";

const VISIBLE_MS = 3600;

/** Aviso flotante al desbloquear una insignia. */
export function showBadgeToast(root: HTMLElement, badge: BadgeDefinition): void {
  const toast = document.createElement("div");
  toast.className = "badge-toast";

  const title = document.createElement("div");
  title.className = "badge-toast-title";
  title.textContent = `🏅 Insignia desbloqueada: ${badge.name}`;
  const detail = document.createElement("div");
  detail.className = "badge-toast-detail";
  detail.textContent = badge.description;
  toast.append(title, detail);

  root.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, VISIBLE_MS);
}

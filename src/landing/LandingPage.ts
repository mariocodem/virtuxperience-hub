import { ZONES } from "../scene/zones.config";
import { BADGE_CATALOG, BadgeSystem } from "../systems/BadgeSystem";
import type { ZoneDefinition } from "../types/zone";

/**
 * Landing page de entrada (inspirada en la de VirtuXperience de UNIMINUTO: cabecera institucional +
 * presentación de las 6 líneas transversales) con el mapa de islas tipo videojuego como pieza central:
 * cada isla es una línea transversal: se recorren en orden y la insignia de "primera ronda" de una
 * desbloquea la entrada a la siguiente.
 */

const NODE_GAP = 230;
const TOP_PADDING = 110;
const BOTTOM_PADDING = 150;
/** Posición horizontal (0-100) de cada isla a lo largo del camino: alterna lado con un leve zigzag. */
const NODE_X = [22, 70, 30, 76, 24, 68];

export type IslandSelectHandler = (zone: ZoneDefinition, index: number) => void;

/** True si la isla `index` ya está disponible: la primera siempre lo está; las demás, cuando se completó la anterior. */
export function isIslandUnlocked(index: number): boolean {
  if (index <= 0) return true;
  const prevBadge = ZONES[index - 1]?.firstRoundBadgeId;
  return prevBadge ? BadgeSystem.isUnlocked(prevBadge) : true;
}

export class LandingPage {
  private readonly root: HTMLDivElement;
  private readonly mapSection: HTMLElement;
  private readonly badgeCounterEl: HTMLSpanElement;
  private selectHandler: IslandSelectHandler = () => undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "landing";

    const topbar = document.createElement("header");
    topbar.className = "landing-topbar";
    topbar.innerHTML = `
      <span class="landing-brand">UNIMINUTO <strong>Virtual</strong></span>
      <span class="landing-badge-counter" id="landing-badge-counter"></span>
    `;

    const hero = document.createElement("section");
    hero.className = "landing-hero";
    hero.innerHTML = `
      <p class="landing-eyebrow">VirtuXperience</p>
      <h1>Un ecosistema virtual inmersivo para tu desarrollo integral</h1>
      <p class="landing-lead">
        Seis islas, seis líneas transversales. Explora cada una en primera persona, con tecnología
        WebXR, y desbloquea la siguiente completando los retos de la anterior.
      </p>
      <a class="landing-cta" href="#island-map">Explorar las islas ↓</a>
    `;

    const intro = document.createElement("section");
    intro.className = "landing-intro";
    intro.innerHTML = `
      <h2>Potenciamos tu desarrollo integral</h2>
      <p>Cada isla es un mundo 3D independiente con su propio minijuego, personaje guía e insignias.</p>
    `;

    this.mapSection = document.createElement("section");
    this.mapSection.className = "island-map";
    this.mapSection.id = "island-map";

    const footer = document.createElement("footer");
    footer.className = "landing-footer";
    footer.textContent = "VirtuXperience Hub — prueba técnica UNIMINUTO Virtual. 100% cliente web, sin backend.";

    this.root.append(topbar, hero, intro, this.mapSection, footer);
    container.appendChild(this.root);

    this.badgeCounterEl = topbar.querySelector("#landing-badge-counter") as HTMLSpanElement;
  }

  onIslandSelect(handler: IslandSelectHandler): void {
    this.selectHandler = handler;
  }

  show(): void {
    this.root.style.display = "block";
    this.render();
  }

  hide(): void {
    this.root.style.display = "none";
  }

  /** Reconstruye el mapa de islas leyendo el estado actual de insignias (llamar cada vez que se vuelve a mostrar). */
  render(): void {
    const unlockedBadges = new Set(BadgeSystem.getUnlocked());
    this.badgeCounterEl.textContent = `🏅 ${unlockedBadges.size} / ${BADGE_CATALOG.length}`;

    const mapHeight = TOP_PADDING + (ZONES.length - 1) * NODE_GAP + BOTTOM_PADDING;
    this.mapSection.style.height = `${mapHeight}px`;
    this.mapSection.innerHTML = "";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "island-map-path");
    svg.setAttribute("viewBox", `0 0 100 ${mapHeight}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", buildPathD(mapHeight));
    svg.appendChild(path);
    this.mapSection.appendChild(svg);

    ZONES.forEach((zone, index) => {
      const unlocked = isIslandUnlocked(index);
      const zoneBadges = BADGE_CATALOG.filter((b) => b.zone === zone.name);
      const completedCount = zoneBadges.filter((b) => unlockedBadges.has(b.id)).length;
      const justCompleted = completedCount === zoneBadges.length && zoneBadges.length > 0;

      const node = document.createElement("button");
      node.type = "button";
      node.className = `island-node${unlocked ? " unlocked" : ""}${justCompleted ? " completed" : ""}`;
      node.style.left = `${NODE_X[index % NODE_X.length]}%`;
      node.style.top = `${TOP_PADDING + index * NODE_GAP}px`;
      node.style.setProperty("--island-color", zone.color);
      node.style.setProperty("--island-delay", `${index * 0.4}s`);

      node.innerHTML = `
        <span class="island-node-number">${index + 1}</span>
        <span class="island-node-icon">${zone.icon ?? "🏝️"}</span>
        <span class="island-node-name">${zone.name}</span>
        <span class="island-node-desc">${zone.description}</span>
        <span class="island-node-progress">${completedCount} / ${zoneBadges.length} insignias</span>
        <span class="island-node-lock" aria-hidden="true">🔒</span>
      `;

      node.addEventListener("click", () => {
        if (!unlocked) {
          node.classList.add("shake");
          node.addEventListener("animationend", () => node.classList.remove("shake"), { once: true });
          return;
        }
        this.selectHandler(zone, index);
      });

      this.mapSection.appendChild(node);
    });
  }
}

/** Camino curvo (serie de curvas Q) que conecta el centro de cada isla, en el mismo sistema de coordenadas del viewBox. */
function buildPathD(mapHeight: number): string {
  const points = ZONES.map((_, i) => ({ x: NODE_X[i % NODE_X.length], y: TOP_PADDING + i * NODE_GAP }));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  void mapHeight;
  return d;
}

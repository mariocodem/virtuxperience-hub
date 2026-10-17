import { ZONES } from "../scene/zones.config";
import { BADGE_CATALOG, BadgeSystem } from "../systems/BadgeSystem";
import type { ZoneDefinition } from "../types/zone";

/**
 * Landing page de entrada.
 *
 * Dirección de diseño: "un solo motivo" (tasteskill v2, dirección `one-motif`, semilla 1288655323,
 * sector `education`, --keep palette,type). La idea: el aspa que forma la "X" de "VirtuXperience" en
 * la marca real de UNIMINUTO es, en esencia, un cuadrado girado 45° — un chaflán. Ese único corte
 * gobierna toda la página: la tarima del hero, el marco de la captura real, el botón principal, las
 * muescas de color de cada línea en el índice de islas, y la marca grande del footer. Nada de tarjetas
 * repetidas, nada de degradados, nada de sombras en reposo, nada de rótulos pequeños en mayúsculas.
 *
 * Se mantiene la paleta y la tipografía reales de UNIMINUTO (azul marino, dorado, Lato) y los 6 colores
 * reales de cada línea transversal (ver zones.config.ts), pero la composición es propia: el menú de dos
 * filas con mega-menús decorativos de la página real se simplificó a una barra sola (sin enlaces que no
 * llevan a ningún sitio), y la grilla de 6 tarjetas pasó a ser un índice tipográfico — más cercano al
 * mapa de niveles real del proyecto (orden, bloqueo, progreso) que a una fila de tarjetas idénticas.
 *
 * Esa misma lista de 6 líneas es el punto de entrada a las islas: cada una se desbloquea al completar
 * la insignia de "primera ronda" de la anterior.
 */

export type IslandSelectHandler = (zone: ZoneDefinition, index: number) => void;

/** True si la isla `index` ya está disponible: la primera siempre lo está; las demás, cuando se completó la anterior. */
export function isIslandUnlocked(index: number): boolean {
  if (index <= 0) return true;
  const prevBadge = ZONES[index - 1]?.firstRoundBadgeId;
  return prevBadge ? BadgeSystem.isUnlocked(prevBadge) : true;
}

const PREVIEW_SRC = "/landing-preview.jpg";
/** Recortes distintos de la misma captura real (no hay una foto propia por isla todavía). */
const PREVIEW_CROPS = ["50% 35%", "30% 50%", "70% 40%", "45% 60%", "60% 30%", "35% 45%"];

export class LandingPage {
  private readonly root: HTMLDivElement;
  private readonly indexList: HTMLDivElement;
  private readonly statusEl: HTMLSpanElement;
  private selectHandler: IslandSelectHandler = () => undefined;
  private revealObserver: IntersectionObserver | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "landing";

    const nav = document.createElement("header");
    nav.className = "landing-nav";
    nav.innerHTML = `
      <a class="landing-brand" href="#">
        <span class="landing-mark" aria-hidden="true"></span>
        UNIMINUTO Virtual
      </a>
      <a class="landing-nav-link" href="#indice">Las islas</a>
      <span class="landing-nav-status" id="landing-status"></span>
      <a class="landing-nav-cta" href="#indice">Comenzar</a>
    `;

    const hero = document.createElement("section");
    hero.className = "landing-hero";
    hero.innerHTML = `
      <div class="landing-hero-copy">
        <h1 class="landing-hero-head">
          <span class="landing-hero-line" data-rise style="--i:0">Virtu<span class="landing-x">X</span>perience</span>
        </h1>
        <p class="landing-hero-sub" data-rise style="--i:1">Seis líneas transversales, seis islas en primera persona. Entra, resuelve y desbloquea la siguiente.</p>
        <a class="landing-btn" href="#indice" data-rise style="--i:2">Entrar al mapa →</a>
      </div>
      <div class="landing-hero-stage">
        <div class="landing-frame shutter" data-reveal>
          <img src="${PREVIEW_SRC}" data-ui alt="Captura real de una isla del hub, en 3D" loading="eager" width="1280" height="720" />
        </div>
      </div>
    `;

    const intro = document.createElement("section");
    intro.className = "landing-intro";
    intro.setAttribute("data-reveal", "");
    intro.innerHTML = `
      <h2 class="landing-intro-head">Cada línea es una isla.</h2>
      <p class="landing-intro-sub">Un mundo 3D independiente por competencia, con su propio reto y su propia insignia.</p>
    `;

    const indexSection = document.createElement("section");
    indexSection.className = "landing-index";
    indexSection.id = "indice";
    this.indexList = document.createElement("div");
    this.indexList.className = "landing-index-list";
    indexSection.appendChild(this.indexList);

    const footer = this.buildFooter();

    this.root.append(nav, hero, intro, indexSection, footer);
    container.appendChild(this.root);

    this.statusEl = nav.querySelector("#landing-status") as HTMLSpanElement;
  }

  private buildFooter(): HTMLElement {
    const footer = document.createElement("footer");
    footer.className = "landing-footer";
    footer.setAttribute("data-reveal", "");
    footer.innerHTML = `
      <div class="landing-footer-mark" aria-hidden="true">
        <span class="landing-footer-diamond landing-footer-diamond--a"></span>
        <span class="landing-footer-diamond landing-footer-diamond--b"></span>
      </div>
      <p class="landing-footer-name">VirtuXperience Hub</p>
      <div class="landing-footer-cols">
        <div class="landing-footer-col">
          <p class="landing-footer-heading">Proyecto</p>
          <a href="#indice">Las 6 islas</a>
          <a href="https://github.com/mariocodem/virtuxperience-hub" target="_blank" rel="noopener noreferrer">Código fuente</a>
          <a href="https://github.com/mariocodem/virtuxperience-hub#readme" target="_blank" rel="noopener noreferrer">Documentación</a>
        </div>
        <div class="landing-footer-col">
          <p class="landing-footer-heading">Dentro de cada isla</p>
          <p>Insignias y progreso</p>
          <p>Realidad aumentada (WebXR)</p>
          <p>Personaje guía</p>
        </div>
        <div class="landing-footer-col">
          <p class="landing-footer-heading">Construido con</p>
          <p>Babylon.js · TypeScript</p>
          <p>WebXR · TensorFlow.js</p>
        </div>
      </div>
      <div class="landing-footer-bottom">
        <p>VirtuXperience Hub © 2026 — inspirado en VirtuXperience de UNIMINUTO Virtual, sin ser su sitio oficial.</p>
        <a class="landing-btn landing-btn--small" href="#">Volver arriba</a>
      </div>
    `;
    return footer;
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

  /** Reconstruye el índice de islas leyendo el estado actual de insignias (llamar cada vez que se vuelve a mostrar). */
  render(): void {
    const unlockedBadges = new Set(BadgeSystem.getUnlocked());
    this.statusEl.textContent = `${unlockedBadges.size} / ${BADGE_CATALOG.length} insignias`;
    this.indexList.innerHTML = "";
    this.revealObserver?.disconnect();

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );

    ZONES.forEach((zone, index) => {
      const unlocked = isIslandUnlocked(index);
      const zoneBadges = BADGE_CATALOG.filter((b) => b.zone === zone.name);
      const completedCount = zoneBadges.filter((b) => unlockedBadges.has(b.id)).length;
      const completed = completedCount === zoneBadges.length && zoneBadges.length > 0;

      const row = document.createElement(unlocked ? "button" : "div");
      row.className = `landing-index-row${unlocked ? " unlocked" : ""}${completed ? " completed" : ""}`;
      if (unlocked) (row as HTMLButtonElement).type = "button";
      row.style.setProperty("--zone-color", zone.color);
      row.style.setProperty("--crop", PREVIEW_CROPS[index % PREVIEW_CROPS.length]);
      row.setAttribute("data-reveal", "");
      row.style.transitionDelay = `${(index % 6) * 70}ms`;

      row.innerHTML = `
        <span class="landing-index-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <span class="landing-index-swatch" aria-hidden="true"></span>
        <span class="landing-index-body">
          <span class="landing-index-name">${zone.name}</span>
          <span class="landing-index-desc">${zone.description}</span>
        </span>
        <span class="landing-index-status">${unlocked ? `${completedCount} / ${zoneBadges.length} insignias` : "Bloqueada"}</span>
        <span class="landing-index-cta" aria-hidden="true">${unlocked ? "Entrar →" : "Completa la anterior"}</span>
      `;

      const activate = (): void => {
        if (!unlocked) return;
        this.selectHandler(zone, index);
      };
      if (unlocked) {
        row.addEventListener("click", activate);
      } else {
        row.addEventListener("click", () => {
          row.classList.add("shake");
          row.addEventListener("animationend", () => row.classList.remove("shake"), { once: true });
        });
      }

      this.indexList.appendChild(row);
    });

    document.querySelectorAll(".landing [data-reveal]").forEach((el) => this.revealObserver?.observe(el));
  }
}

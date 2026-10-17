import { ZONES } from "../scene/zones.config";
import { BADGE_CATALOG, BadgeSystem } from "../systems/BadgeSystem";
import type { ZoneDefinition } from "../types/zone";

/**
 * Landing page de entrada: réplica cercana de la landing real de VirtuXperience de UNIMINUTO
 * (uniminuto.edu/virtuxperience-home) — misma paleta (azul marino, dorado, teal), misma tipografía
 * (Lato), mismas dos filas de cabecera, mismo hero con wordmark + patrón de puntos + diamantes, misma
 * sección "Potenciamos tu desarrollo integral" con sus 6 tarjetas, y un footer con la misma estructura.
 *
 * Tres cosas de la página real NO se reproducen, a propósito:
 * - La fotografía de la estudiante del hero: es de una persona real: se sustituye por una ilustración
 *   propia en el mismo lugar y composición.
 * - El botón "Haz tu donación" y el video de YouTube: no hay donaciones ni video propios; se sustituyen
 *   por una acción real de esta app y por una vista previa real del juego, en el mismo layout.
 * - El footer institucional (certificaciones, logos de organizaciones aliadas, avisos legales de
 *   UNIMINUTO): se mantiene la misma estructura visual (columnas, navy, dorado) pero con contenido
 *   real de este proyecto, no certificaciones o entidades que no son suyas.
 *
 * La grilla de 6 tarjetas de competencias es, además, el punto de entrada a las islas: cada una se
 * desbloquea al completar la insignia de "primera ronda" de la anterior.
 */

export type IslandSelectHandler = (zone: ZoneDefinition, index: number) => void;

/** True si la isla `index` ya está disponible: la primera siempre lo está; las demás, cuando se completó la anterior. */
export function isIslandUnlocked(index: number): boolean {
  if (index <= 0) return true;
  const prevBadge = ZONES[index - 1]?.firstRoundBadgeId;
  return prevBadge ? BadgeSystem.isUnlocked(prevBadge) : true;
}

/** Un ícono de línea simple por competencia, en el espíritu del de la página real (no una copia de su arte). */
const ICONS: Record<string, string> = {
  comunicarte: `<path d="M8 15a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v9a6 6 0 0 1-6 6H21l-8 6v-6.3A6 6 0 0 1 8 24z"/><path d="M16 19.5c1.6 2 4 3 8 3s6.4-1 8-3"/><circle cx="33" cy="11" r="1.8" fill="currentColor" stroke="none"/>`,
  neuromath: `<circle cx="22" cy="19" r="11"/><path d="M22 8a11 11 0 0 1 0 22"/><path d="M15 32h14l-2 6H17z"/><path d="M16 17l4 5 5-7 5 4"/>`,
  voxcivitas: `<path d="M24 36S8 27 8 16.5A7.5 7.5 0 0 1 24 14a7.5 7.5 0 0 1 16 2.5C40 27 24 36 24 36z"/>`,
  "gerencia-plus": `<rect x="6" y="16" width="18" height="18" rx="2"/><rect x="22" y="6" width="18" height="18" rx="2"/><circle cx="38" cy="9" r="1.8" fill="currentColor" stroke="none"/><circle cx="9" cy="31" r="1.8" fill="currentColor" stroke="none"/>`,
  "activa-tu-idea": `<path d="M24 6a12 12 0 0 0-7 21.8c1.3 1 2 2.5 2 4.2v1h10v-1c0-1.7.7-3.2 2-4.2A12 12 0 0 0 24 6z"/><path d="M19 38h10M21 42h6"/><path d="M24 14v3M18 19l2 1.3M30 19l-2 1.3"/>`,
  "latido-social": `<circle cx="17" cy="13" r="4.5"/><circle cx="31" cy="13" r="4.5"/><path d="M8 37v-6a9 9 0 0 1 9-9h0a9 9 0 0 1 6 2.3"/><path d="M40 37v-6a9 9 0 0 0-9-9h0a9 9 0 0 0-6 2.3"/><path d="M8 30l6-6 4 4 6-7 4 4 6-6"/>`,
};

function iconSvg(zoneId: string): string {
  const paths = ICONS[zoneId] ?? `<circle cx="24" cy="24" r="14"/>`;
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/** Ilustración propia (no una foto) de un estudiante, en el lugar donde la página real pone su fotografía. */
const HERO_ILLUSTRATION = `
<svg viewBox="0 0 220 320" class="landing-hero-figure" aria-hidden="true">
  <ellipse cx="110" cy="300" rx="70" ry="14" fill="#06102a" opacity="0.4"/>
  <path d="M40 300v-70c0-44 31-80 70-80s70 36 70 80v70z" fill="#0f2742"/>
  <path d="M55 170c8-14 18-22 30-22h50c16 0 28 14 28 32v18H55z" fill="#55e5f5" opacity="0.9"/>
  <rect x="50" y="178" width="18" height="60" rx="6" fill="#1c8f85"/>
  <rect x="150" y="178" width="18" height="60" rx="6" fill="#1c8f85"/>
  <circle cx="110" cy="92" r="46" fill="#ffd9ad"/>
  <path d="M64 88c0-28 20-50 46-50s46 22 46 50c-10-10-26-16-46-16s-36 6-46 16z" fill="#2a1b12"/>
  <path d="M70 84c10-6 24-9 40-9s30 3 40 9" stroke="#2a1b12" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="90" cy="96" r="12" fill="none" stroke="#0f2742" stroke-width="4"/>
  <circle cx="130" cy="96" r="12" fill="none" stroke="#0f2742" stroke-width="4"/>
  <line x1="102" y1="96" x2="118" y2="96" stroke="#0f2742" stroke-width="4"/>
  <path d="M86 112q24 14 48 0" stroke="#7a4a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <rect x="86" y="226" width="48" height="60" rx="6" fill="#ffd300"/>
  <rect x="92" y="236" width="36" height="4" rx="2" fill="#0f2742" opacity="0.5"/>
  <rect x="92" y="246" width="36" height="4" rx="2" fill="#0f2742" opacity="0.5"/>
  <rect x="92" y="256" width="24" height="4" rx="2" fill="#0f2742" opacity="0.5"/>
</svg>`;

export class LandingPage {
  private readonly root: HTMLDivElement;
  private readonly cardsGrid: HTMLDivElement;
  private readonly badgeCounterEl: HTMLSpanElement;
  private selectHandler: IslandSelectHandler = () => undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "landing";

    const topbar = document.createElement("header");
    topbar.className = "landing-topbar";
    topbar.innerHTML = `
      <div class="landing-utility-row">
        <div class="landing-brand">
          <span class="landing-brand-mark" aria-hidden="true"></span>
          <span class="landing-brand-text">UNIMINUTO <strong>Virtual</strong></span>
        </div>
        <div class="landing-utility-links">
          <span>📍 100% en línea</span>
          <span>🧭 6 líneas transversales</span>
          <span>🛡️ Sin registro</span>
          <a class="landing-utility-cta" href="#competencias">Comenzar gratis →</a>
        </div>
      </div>
      <nav class="landing-nav-row">
        <div class="landing-nav-links">
          <span>Sistema Uniminuto ▾</span>
          <span>Conoce nuestra oferta académica ▾</span>
          <span>Vida universitaria ▾</span>
          <span>Portal I+D+I+C</span>
          <span>Proyección social ▾</span>
        </div>
        <span class="landing-badge-counter landing-nav-glow" id="landing-badge-counter"></span>
      </nav>
    `;

    const hero = document.createElement("section");
    hero.className = "landing-hero";
    hero.innerHTML = `
      <div class="landing-hero-dots" aria-hidden="true"></div>
      <div class="landing-hero-diamond landing-hero-diamond--a" aria-hidden="true"></div>
      <div class="landing-hero-diamond landing-hero-diamond--b" aria-hidden="true"></div>
      <div class="landing-hero-grid">
        <div class="landing-hero-inner">
          <p class="landing-eyebrow">UNIMINUTO Virtual</p>
          <h1 class="landing-wordmark">Virtu<span class="landing-wordmark-x">X</span>perience</h1>
          <p class="landing-lead">
            Un entorno virtual con recursos dinámicos e interactivos: seis líneas transversales, seis
            islas en primera persona con tecnología WebXR.
          </p>
          <a class="landing-cta" href="#competencias">Explorar las islas →</a>
        </div>
        <div class="landing-hero-figure-wrap">${HERO_ILLUSTRATION}</div>
      </div>
    `;

    const intro = document.createElement("section");
    intro.className = "landing-intro";
    intro.innerHTML = `
      <div class="landing-intro-preview">
        <img src="/landing-preview.jpg" alt="Vista previa de una isla del hub" loading="lazy" />
        <span class="landing-intro-preview-badge">🎮 Vista previa · 3D · WebXR</span>
      </div>
      <div class="landing-intro-copy">
        <p class="landing-intro-eyebrow">VirtuXperience</p>
        <span class="landing-intro-rule" aria-hidden="true"></span>
        <p class="landing-intro-text">
          Es un entorno virtual con recursos digitales dinámicos e interactivos complementarios, que
          busca fomentar el aprendizaje experiencial, la flexibilidad de acceso, y el desarrollo integral
          de competencias declaradas en el perfil profesional como aporte académico y social para tu
          permanencia. Cada línea es una isla: entra, resuelve su reto y desbloquea la siguiente.
        </p>
      </div>
    `;

    const competencias = document.createElement("section");
    competencias.className = "landing-competencias";
    competencias.id = "competencias";
    competencias.innerHTML = `
      <p class="landing-section-eyebrow">Competencias</p>
      <h2 class="landing-section-heading">Potenciamos tu desarrollo integral</h2>
    `;
    this.cardsGrid = document.createElement("div");
    this.cardsGrid.className = "landing-cards";
    competencias.appendChild(this.cardsGrid);

    const footer = this.buildFooter();

    this.root.append(topbar, hero, intro, competencias, footer);
    container.appendChild(this.root);

    this.badgeCounterEl = topbar.querySelector("#landing-badge-counter") as HTMLSpanElement;
  }

  private buildFooter(): HTMLElement {
    const footer = document.createElement("footer");
    footer.className = "landing-footer";
    footer.innerHTML = `
      <div class="landing-footer-grid">
        <div class="landing-footer-col landing-footer-brand">
          <div class="landing-brand">
            <span class="landing-brand-mark" aria-hidden="true"></span>
            <span class="landing-brand-text">VirtuXperience <strong>Hub</strong></span>
          </div>
          <p>
            Ecosistema virtual inmersivo (WebXR/3D): un hub de islas navegable en primera persona, cada
            una con su minijuego educativo. Prueba técnica inspirada en VirtuXperience de UNIMINUTO
            Virtual.
          </p>
        </div>
        <div class="landing-footer-col">
          <h4>Proyecto</h4>
          <a href="#competencias">Las 6 islas</a>
          <a href="https://github.com/mariocodem/virtuxperience-hub" target="_blank" rel="noopener noreferrer">Código fuente</a>
          <a href="https://github.com/mariocodem/virtuxperience-hub#readme" target="_blank" rel="noopener noreferrer">Documentación (README)</a>
        </div>
        <div class="landing-footer-col">
          <h4>Explora</h4>
          <span>🗺️ Mapa de islas: esta página</span>
          <span>🏅 Insignias: dentro de cada isla</span>
          <span>🥽 Realidad aumentada (WebXR)</span>
        </div>
        <div class="landing-footer-col">
          <h4>Construido con</h4>
          <div class="landing-footer-badges">
            <span>Babylon.js</span>
            <span>TypeScript</span>
            <span>WebXR</span>
            <span>TensorFlow.js</span>
          </div>
        </div>
      </div>
      <div class="landing-footer-bottom">
        <p>VirtuXperience Hub © 2026 — Prueba técnica inspirada en VirtuXperience de UNIMINUTO Virtual.</p>
        <p class="landing-footer-fine">No es un sitio oficial de UNIMINUTO. 100% cliente web, sin backend.</p>
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

  /** Reconstruye la grilla de islas leyendo el estado actual de insignias (llamar cada vez que se vuelve a mostrar). */
  render(): void {
    const unlockedBadges = new Set(BadgeSystem.getUnlocked());
    this.badgeCounterEl.textContent = `🏅 ${unlockedBadges.size} / ${BADGE_CATALOG.length}`;
    this.cardsGrid.innerHTML = "";

    ZONES.forEach((zone, index) => {
      const unlocked = isIslandUnlocked(index);
      const zoneBadges = BADGE_CATALOG.filter((b) => b.zone === zone.name);
      const completedCount = zoneBadges.filter((b) => unlockedBadges.has(b.id)).length;
      const completed = completedCount === zoneBadges.length && zoneBadges.length > 0;

      const card = document.createElement("div");
      card.className = `landing-card${unlocked ? " unlocked" : ""}${completed ? " completed" : ""}`;
      card.style.setProperty("--zone-color", zone.color);

      const number = document.createElement("span");
      number.className = "landing-card-number";
      number.textContent = String(index + 1);

      const iconWrap = document.createElement("div");
      iconWrap.className = "landing-card-icon";
      iconWrap.innerHTML = iconSvg(zone.id);

      const title = document.createElement("h3");
      title.className = "landing-card-title";
      title.textContent = zone.name;

      const desc = document.createElement("p");
      desc.className = "landing-card-desc";
      desc.textContent = zone.description;

      const progress = document.createElement("span");
      progress.className = "landing-card-progress";
      progress.textContent = `${completedCount} / ${zoneBadges.length} insignias`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "landing-card-button";
      button.textContent = unlocked ? "Entrar" : "Bloqueada";

      const lock = document.createElement("div");
      lock.className = "landing-card-lock";
      lock.setAttribute("aria-hidden", "true");
      lock.textContent = "🔒";

      card.append(number, iconWrap, title, desc, progress, button, lock);

      const activate = (): void => {
        if (!unlocked) {
          card.classList.add("shake");
          card.addEventListener("animationend", () => card.classList.remove("shake"), { once: true });
          return;
        }
        this.selectHandler(zone, index);
      };
      card.addEventListener("click", activate);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        activate();
      });

      this.cardsGrid.appendChild(card);
    });
  }
}

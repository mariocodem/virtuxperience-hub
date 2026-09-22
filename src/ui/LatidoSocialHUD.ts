import { AudioSystem } from "../systems/AudioSystem";

export interface LatidoCard {
  id: number;
  label: string;
}

export interface ResultsCallbacks {
  onRetry: () => void;
  onExit: () => void;
}

export class LatidoSocialHUD {
  private readonly root: HTMLDivElement;
  private readonly statusEl: HTMLDivElement;
  private readonly gridEl: HTMLDivElement;
  private readonly feedbackEl: HTMLDivElement;
  private readonly resultsEl: HTMLDivElement;
  private readonly cardButtons = new Map<number, HTMLButtonElement>();

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "latidosocial-hud";

    this.statusEl = document.createElement("div");
    this.statusEl.className = "latidosocial-status";

    this.gridEl = document.createElement("div");
    this.gridEl.className = "latidosocial-grid";

    const panel = document.createElement("div");
    panel.className = "latidosocial-panel";
    panel.append(this.statusEl, this.gridEl);

    this.feedbackEl = document.createElement("div");
    this.feedbackEl.className = "neuromath-feedback latidosocial-feedback";

    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "zone-panel";
    this.resultsEl.style.display = "none";

    this.root.append(panel, this.feedbackEl, this.resultsEl);
    container.appendChild(this.root);
  }

  renderGrid(cards: LatidoCard[], onCardClick: (id: number) => void): void {
    this.resultsEl.style.display = "none";
    this.root.style.display = "flex";
    this.gridEl.innerHTML = "";
    this.cardButtons.clear();
    this.feedbackEl.textContent = "";

    for (const card of cards) {
      const button = document.createElement("button");
      button.className = "latidosocial-card";
      button.textContent = "💗";
      button.addEventListener("click", () => onCardClick(card.id));
      this.gridEl.appendChild(button);
      this.cardButtons.set(card.id, button);
    }
  }

  revealCard(id: number, label: string): void {
    AudioSystem.play("click");
    const button = this.cardButtons.get(id);
    if (!button) return;
    button.textContent = label;
    button.classList.add("flipped");
  }

  hideCard(id: number): void {
    const button = this.cardButtons.get(id);
    if (!button) return;
    button.textContent = "💗";
    button.classList.remove("flipped", "wrong");
  }

  markMatched(ids: number[]): void {
    AudioSystem.play("correct");
    for (const id of ids) {
      const button = this.cardButtons.get(id);
      if (!button) continue;
      button.classList.add("matched");
      button.disabled = true;
    }
  }

  flashWrong(ids: number[]): void {
    AudioSystem.play("wrong");
    for (const id of ids) {
      this.cardButtons.get(id)?.classList.add("wrong");
    }
  }

  updateStatus(matched: number, total: number, moves: number): void {
    this.statusEl.textContent = `Parejas encontradas: ${matched}/${total} · Movimientos: ${moves}`;
  }

  setFeedback(text: string): void {
    this.feedbackEl.textContent = text;
  }

  showResults(moves: number, tierLabel: string, callbacks: ResultsCallbacks): void {
    this.resultsEl.style.display = "flex";
    this.resultsEl.innerHTML = "";

    const card = document.createElement("div");
    card.className = "zone-panel-card";

    const title = document.createElement("h2");
    title.textContent = tierLabel;
    title.style.color = "#E02F5C";

    const scoreEl = document.createElement("p");
    scoreEl.textContent = `Completaste todas las parejas en ${moves} movimientos.`;

    const actions = document.createElement("div");
    actions.className = "zone-panel-actions";

    const retryBtn = document.createElement("button");
    retryBtn.textContent = "Reintentar";
    retryBtn.addEventListener("click", callbacks.onRetry);

    const exitBtn = document.createElement("button");
    exitBtn.textContent = "Salir";
    exitBtn.className = "secondary";
    exitBtn.addEventListener("click", callbacks.onExit);

    actions.append(retryBtn, exitBtn);
    card.append(title, scoreEl, actions);
    this.resultsEl.appendChild(card);
  }

  destroy(): void {
    this.root.remove();
  }
}

import { AudioSystem } from "../systems/AudioSystem";

export interface ResultsCallbacks {
  onRetry: () => void;
  onExit: () => void;
}

export interface WordChip {
  id: number;
  text: string;
}

export class ComunicarteHUD {
  private readonly root: HTMLDivElement;
  private readonly questionBar: HTMLDivElement;
  private readonly progressEl: HTMLDivElement;
  private readonly timerFillEl: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly builtEl: HTMLDivElement;
  private readonly poolEl: HTMLDivElement;
  private readonly feedbackEl: HTMLDivElement;
  private readonly resultsEl: HTMLDivElement;
  private pendingTimeout: number | undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "comunicarte-hud";

    this.questionBar = document.createElement("div");
    this.questionBar.className = "neuromath-question-bar";

    this.progressEl = document.createElement("div");
    this.progressEl.className = "neuromath-progress";

    const prompt = document.createElement("div");
    prompt.className = "neuromath-prompt";
    prompt.textContent = "Ordena la frase";
    prompt.style.fontSize = "20px";

    const timerTrack = document.createElement("div");
    timerTrack.className = "neuromath-timer-track";
    this.timerFillEl = document.createElement("div");
    this.timerFillEl.className = "neuromath-timer-fill";
    timerTrack.appendChild(this.timerFillEl);

    this.questionBar.append(this.progressEl, prompt, timerTrack);

    this.panel = document.createElement("div");
    this.panel.className = "comunicarte-panel";
    this.panel.style.display = "none";

    this.builtEl = document.createElement("div");
    this.builtEl.className = "comunicarte-built";

    this.poolEl = document.createElement("div");
    this.poolEl.className = "comunicarte-pool";

    this.feedbackEl = document.createElement("div");
    this.feedbackEl.className = "neuromath-feedback";

    this.panel.append(this.builtEl, this.poolEl, this.feedbackEl);

    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "zone-panel";
    this.resultsEl.style.display = "none";

    this.root.append(this.questionBar, this.panel, this.resultsEl);
    container.appendChild(this.root);
  }

  showQuestion(index: number, total: number, durationMs: number, onTimeout: () => void): void {
    this.resultsEl.style.display = "none";
    this.questionBar.style.display = "flex";
    this.panel.style.display = "flex";
    this.progressEl.textContent = `Frase ${index}/${total}`;
    this.feedbackEl.textContent = "";

    this.timerFillEl.style.transition = "none";
    this.timerFillEl.style.width = "100%";
    void this.timerFillEl.offsetWidth;
    this.timerFillEl.style.transition = `width ${durationMs}ms linear`;
    this.timerFillEl.style.width = "0%";

    this.pendingTimeout = window.setTimeout(onTimeout, durationMs);
  }

  setBuiltWords(words: string[]): void {
    this.builtEl.innerHTML = "";
    if (words.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "comunicarte-placeholder";
      placeholder.textContent = "Haz clic en las palabras en orden…";
      this.builtEl.appendChild(placeholder);
      return;
    }
    for (const word of words) {
      const chip = document.createElement("span");
      chip.className = "comunicarte-chip built";
      chip.textContent = word;
      this.builtEl.appendChild(chip);
    }
  }

  setWordPool(chips: WordChip[], onSelect: (id: number) => void): void {
    this.poolEl.innerHTML = "";
    for (const chip of chips) {
      const button = document.createElement("button");
      button.className = "comunicarte-chip pool";
      button.textContent = chip.text;
      button.addEventListener("click", () => onSelect(chip.id));
      this.poolEl.appendChild(button);
    }
  }

  setFeedback(text: string): void {
    this.feedbackEl.textContent = text;
  }

  stopTimer(): void {
    if (this.pendingTimeout !== undefined) {
      window.clearTimeout(this.pendingTimeout);
      this.pendingTimeout = undefined;
    }
    this.timerFillEl.style.transition = "none";
  }

  flashHit(correct: boolean): void {
    AudioSystem.play(correct ? "correct" : "wrong");
    this.root.classList.remove("flash-hit", "flash-miss");
    void this.root.offsetWidth;
    this.root.classList.add(correct ? "flash-hit" : "flash-miss");
  }

  showResults(score: number, total: number, callbacks: ResultsCallbacks): void {
    this.stopTimer();
    this.questionBar.style.display = "none";
    this.panel.style.display = "none";
    this.resultsEl.style.display = "flex";
    this.resultsEl.innerHTML = "";

    const card = document.createElement("div");
    card.className = "zone-panel-card";

    const title = document.createElement("h2");
    title.textContent = score === total ? "¡Ronda perfecta!" : "Ronda completada";
    title.style.color = "#2FA5D8";

    const scoreEl = document.createElement("p");
    scoreEl.textContent = `Aciertos: ${score}/${total}`;

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
    this.stopTimer();
    this.root.remove();
  }
}

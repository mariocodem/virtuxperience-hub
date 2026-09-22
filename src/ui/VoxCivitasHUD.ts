import { AudioSystem } from "../systems/AudioSystem";

export interface ResultsCallbacks {
  onRetry: () => void;
  onExit: () => void;
}

export interface DilemmaOption {
  id: number;
  text: string;
}

export class VoxCivitasHUD {
  private readonly root: HTMLDivElement;
  private readonly questionBar: HTMLDivElement;
  private readonly progressEl: HTMLDivElement;
  private readonly dilemmaEl: HTMLDivElement;
  private readonly timerFillEl: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly optionsEl: HTMLDivElement;
  private readonly feedbackEl: HTMLDivElement;
  private readonly resultsEl: HTMLDivElement;
  private pendingTimeout: number | undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "voxcivitas-hud";

    this.questionBar = document.createElement("div");
    this.questionBar.className = "neuromath-question-bar voxcivitas-question-bar";

    this.progressEl = document.createElement("div");
    this.progressEl.className = "neuromath-progress";

    this.dilemmaEl = document.createElement("div");
    this.dilemmaEl.className = "activaidea-problem";

    const timerTrack = document.createElement("div");
    timerTrack.className = "neuromath-timer-track";
    this.timerFillEl = document.createElement("div");
    this.timerFillEl.className = "neuromath-timer-fill";
    timerTrack.appendChild(this.timerFillEl);

    this.questionBar.append(this.progressEl, this.dilemmaEl, timerTrack);

    this.panel = document.createElement("div");
    this.panel.className = "voxcivitas-panel";
    this.panel.style.display = "none";

    this.optionsEl = document.createElement("div");
    this.optionsEl.className = "voxcivitas-options";

    this.feedbackEl = document.createElement("div");
    this.feedbackEl.className = "neuromath-feedback";

    this.panel.append(this.optionsEl, this.feedbackEl);

    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "zone-panel";
    this.resultsEl.style.display = "none";

    this.root.append(this.questionBar, this.panel, this.resultsEl);
    container.appendChild(this.root);
  }

  showQuestion(
    index: number,
    total: number,
    dilemma: string,
    options: DilemmaOption[],
    durationMs: number,
    onSelect: (id: number) => void,
    onTimeout: () => void
  ): void {
    this.resultsEl.style.display = "none";
    this.questionBar.style.display = "flex";
    this.panel.style.display = "flex";
    this.progressEl.textContent = `Dilema ${index}/${total}`;
    this.dilemmaEl.textContent = dilemma;
    this.feedbackEl.textContent = "";

    this.optionsEl.innerHTML = "";
    for (const option of options) {
      const button = document.createElement("button");
      button.className = "voxcivitas-option";
      button.textContent = option.text;
      button.addEventListener("click", () => onSelect(option.id));
      this.optionsEl.appendChild(button);
    }

    this.timerFillEl.style.transition = "none";
    this.timerFillEl.style.width = "100%";
    void this.timerFillEl.offsetWidth;
    this.timerFillEl.style.transition = `width ${durationMs}ms linear`;
    this.timerFillEl.style.width = "0%";

    this.pendingTimeout = window.setTimeout(onTimeout, durationMs);
  }

  markOptionByIndex(index: number, kind: "correct" | "incorrect"): void {
    const button = this.optionsEl.children[index] as HTMLButtonElement | undefined;
    button?.classList.add(kind);
  }

  disableOptions(): void {
    Array.from(this.optionsEl.children).forEach((child) => ((child as HTMLButtonElement).disabled = true));
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
    title.style.color = "#E0A22F";

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

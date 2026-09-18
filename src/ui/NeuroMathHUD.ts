import { DrawingCanvas } from "./DrawingCanvas";

export interface ResultsCallbacks {
  onRetry: () => void;
  onExit: () => void;
}

export class NeuroMathHUD {
  readonly drawing: DrawingCanvas;

  private readonly root: HTMLDivElement;
  private readonly questionBar: HTMLDivElement;
  private readonly progressEl: HTMLDivElement;
  private readonly promptEl: HTMLDivElement;
  private readonly timerFillEl: HTMLDivElement;
  private readonly drawingPanel: HTMLDivElement;
  private readonly feedbackEl: HTMLDivElement;
  private readonly submitBtn: HTMLButtonElement;
  private readonly loadingEl: HTMLDivElement;
  private readonly resultsEl: HTMLDivElement;
  private pendingTimeout: number | undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "neuromath-hud";

    this.questionBar = document.createElement("div");
    this.questionBar.className = "neuromath-question-bar";

    this.progressEl = document.createElement("div");
    this.progressEl.className = "neuromath-progress";

    this.promptEl = document.createElement("div");
    this.promptEl.className = "neuromath-prompt";

    const timerTrack = document.createElement("div");
    timerTrack.className = "neuromath-timer-track";
    this.timerFillEl = document.createElement("div");
    this.timerFillEl.className = "neuromath-timer-fill";
    timerTrack.appendChild(this.timerFillEl);

    this.questionBar.append(this.progressEl, this.promptEl, timerTrack);

    this.drawingPanel = document.createElement("div");
    this.drawingPanel.className = "neuromath-drawing-panel";
    this.drawingPanel.style.display = "none";

    const hint = document.createElement("p");
    hint.className = "neuromath-hint";
    hint.textContent = "Dibuja la respuesta. Si tiene varios dígitos, deja un espacio entre cada uno.";

    this.drawing = new DrawingCanvas(this.drawingPanel);

    const actions = document.createElement("div");
    actions.className = "neuromath-drawing-actions";
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Borrar";
    clearBtn.className = "secondary";
    clearBtn.addEventListener("click", () => this.drawing.clear());
    this.submitBtn = document.createElement("button");
    this.submitBtn.textContent = "Enviar";
    actions.append(clearBtn, this.submitBtn);

    this.feedbackEl = document.createElement("div");
    this.feedbackEl.className = "neuromath-feedback";

    this.drawingPanel.append(hint, actions, this.feedbackEl);

    this.loadingEl = document.createElement("div");
    this.loadingEl.className = "neuromath-loading";
    this.loadingEl.style.display = "none";

    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "zone-panel";
    this.resultsEl.style.display = "none";

    this.root.append(this.questionBar, this.drawingPanel, this.loadingEl, this.resultsEl);
    container.appendChild(this.root);
  }

  onSubmit(handler: () => void): void {
    this.submitBtn.addEventListener("click", handler);
  }

  showLoading(message: string): void {
    this.questionBar.style.display = "none";
    this.drawingPanel.style.display = "none";
    this.loadingEl.style.display = "flex";
    this.loadingEl.textContent = message;
  }

  showQuestion(index: number, total: number, prompt: string, durationMs: number, onTimeout: () => void): void {
    this.resultsEl.style.display = "none";
    this.loadingEl.style.display = "none";
    this.questionBar.style.display = "flex";
    this.drawingPanel.style.display = "flex";
    this.progressEl.textContent = `Pregunta ${index}/${total}`;
    this.promptEl.textContent = prompt;
    this.feedbackEl.textContent = "";
    this.drawing.clear();

    this.timerFillEl.style.transition = "none";
    this.timerFillEl.style.width = "100%";
    // Fuerza reflow para que la siguiente transición arranque realmente desde 100%.
    void this.timerFillEl.offsetWidth;
    this.timerFillEl.style.transition = `width ${durationMs}ms linear`;
    this.timerFillEl.style.width = "0%";

    this.pendingTimeout = window.setTimeout(onTimeout, durationMs);
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
    this.root.classList.remove("flash-hit", "flash-miss");
    void this.root.offsetWidth;
    this.root.classList.add(correct ? "flash-hit" : "flash-miss");
  }

  showResults(score: number, total: number, callbacks: ResultsCallbacks): void {
    this.stopTimer();
    this.questionBar.style.display = "none";
    this.drawingPanel.style.display = "none";
    this.loadingEl.style.display = "none";
    this.resultsEl.style.display = "flex";
    this.resultsEl.innerHTML = "";

    const card = document.createElement("div");
    card.className = "zone-panel-card";

    const title = document.createElement("h2");
    title.textContent = score === total ? "¡Ronda perfecta!" : "Ronda completada";
    title.style.color = "#7A4FE0";

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
    this.drawing.destroy();
    this.root.remove();
  }
}

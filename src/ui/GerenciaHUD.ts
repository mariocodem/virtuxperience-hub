import { AudioSystem } from "../systems/AudioSystem";

export interface ResultsCallbacks {
  onRetry: () => void;
  onExit: () => void;
}

export interface InitiativeRow {
  name: string;
  valuePerUnit: number;
  maxUnits: number;
  allocated: number;
}

export class GerenciaHUD {
  private readonly root: HTMLDivElement;
  private readonly questionBar: HTMLDivElement;
  private readonly progressEl: HTMLDivElement;
  private readonly scenarioEl: HTMLDivElement;
  private readonly timerFillEl: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly budgetEl: HTMLDivElement;
  private readonly rowsEl: HTMLDivElement;
  private readonly confirmBtn: HTMLButtonElement;
  private readonly feedbackEl: HTMLDivElement;
  private readonly resultsEl: HTMLDivElement;
  private pendingTimeout: number | undefined;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "gerencia-hud";

    this.questionBar = document.createElement("div");
    this.questionBar.className = "neuromath-question-bar gerencia-question-bar";

    this.progressEl = document.createElement("div");
    this.progressEl.className = "neuromath-progress";

    this.scenarioEl = document.createElement("div");
    this.scenarioEl.className = "activaidea-problem";

    const timerTrack = document.createElement("div");
    timerTrack.className = "neuromath-timer-track";
    this.timerFillEl = document.createElement("div");
    this.timerFillEl.className = "neuromath-timer-fill";
    timerTrack.appendChild(this.timerFillEl);

    this.questionBar.append(this.progressEl, this.scenarioEl, timerTrack);

    this.panel = document.createElement("div");
    this.panel.className = "gerencia-panel";
    this.panel.style.display = "none";

    this.budgetEl = document.createElement("div");
    this.budgetEl.className = "gerencia-budget";

    this.rowsEl = document.createElement("div");
    this.rowsEl.className = "gerencia-rows";

    this.confirmBtn = document.createElement("button");
    this.confirmBtn.className = "gerencia-confirm";
    this.confirmBtn.textContent = "Confirmar reparto";

    this.feedbackEl = document.createElement("div");
    this.feedbackEl.className = "neuromath-feedback";

    this.panel.append(this.budgetEl, this.rowsEl, this.confirmBtn, this.feedbackEl);

    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "zone-panel";
    this.resultsEl.style.display = "none";

    this.root.append(this.questionBar, this.panel, this.resultsEl);
    container.appendChild(this.root);
  }

  showQuestion(
    index: number,
    total: number,
    scenario: string,
    unitLabel: string,
    budget: number,
    rows: InitiativeRow[],
    durationMs: number,
    onChange: (rowIndex: number, delta: number) => void,
    onConfirm: () => void,
    onTimeout: () => void
  ): void {
    this.resultsEl.style.display = "none";
    this.questionBar.style.display = "flex";
    this.panel.style.display = "flex";
    this.progressEl.textContent = `Reto ${index}/${total}`;
    this.scenarioEl.textContent = scenario;
    this.feedbackEl.textContent = "";
    this.confirmBtn.disabled = false;
    this.confirmBtn.onclick = onConfirm;

    this.renderRows(rows, unitLabel, budget, onChange);

    this.timerFillEl.style.transition = "none";
    this.timerFillEl.style.width = "100%";
    void this.timerFillEl.offsetWidth;
    this.timerFillEl.style.transition = `width ${durationMs}ms linear`;
    this.timerFillEl.style.width = "0%";

    this.pendingTimeout = window.setTimeout(onTimeout, durationMs);
  }

  renderRows(rows: InitiativeRow[], unitLabel: string, budget: number, onChange: (rowIndex: number, delta: number) => void): void {
    const used = rows.reduce((sum, row) => sum + row.allocated, 0);
    this.budgetEl.textContent = `${unitLabel} disponibles: ${budget - used}/${budget}`;

    this.rowsEl.innerHTML = "";
    rows.forEach((row, index) => {
      const rowEl = document.createElement("div");
      rowEl.className = "gerencia-row";

      const info = document.createElement("div");
      info.className = "gerencia-row-info";
      const name = document.createElement("div");
      name.className = "gerencia-row-name";
      name.textContent = row.name;
      const meta = document.createElement("div");
      meta.className = "gerencia-row-meta";
      meta.textContent = `Valor: ${row.valuePerUnit} pts/${unitLabel.slice(0, -1)} · máx ${row.maxUnits}`;
      info.append(name, meta);

      const controls = document.createElement("div");
      controls.className = "gerencia-row-controls";
      const minusBtn = document.createElement("button");
      minusBtn.textContent = "−";
      minusBtn.disabled = row.allocated <= 0;
      minusBtn.addEventListener("click", () => onChange(index, -1));
      const countEl = document.createElement("span");
      countEl.className = "gerencia-row-count";
      countEl.textContent = String(row.allocated);
      const plusBtn = document.createElement("button");
      plusBtn.textContent = "+";
      plusBtn.disabled = row.allocated >= row.maxUnits || used >= budget;
      plusBtn.addEventListener("click", () => onChange(index, 1));
      controls.append(minusBtn, countEl, plusBtn);

      rowEl.append(info, controls);
      this.rowsEl.appendChild(rowEl);
    });
  }

  disableAll(): void {
    this.confirmBtn.disabled = true;
    Array.from(this.rowsEl.querySelectorAll("button")).forEach((btn) => ((btn as HTMLButtonElement).disabled = true));
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
    title.style.color = "#2FE07A";

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

import type { ZoneEnterContext } from "../../types/zone";
import { BadgeSystem } from "../../systems/BadgeSystem";
import { safeRequestPointerLock } from "../../scene/PlayerController";
import { GerenciaHUD, InitiativeRow } from "../../ui/GerenciaHUD";

interface InitiativeDef {
  name: string;
  valuePerUnit: number;
  maxUnits: number;
}

interface Scenario {
  prompt: string;
  unitLabel: string;
  budget: number;
  initiatives: InitiativeDef[];
}

const SCENARIOS: Scenario[] = [
  {
    prompt: "Tu equipo tiene 6 horas esta semana para repartir entre tres frentes.",
    unitLabel: "horas",
    budget: 6,
    initiatives: [
      { name: "Atención al cliente", valuePerUnit: 2, maxUnits: 3 },
      { name: "Capacitación del equipo", valuePerUnit: 3, maxUnits: 2 },
      { name: "Mejorar procesos internos", valuePerUnit: 1, maxUnits: 6 },
    ],
  },
  {
    prompt: "Tienes $9 millones de presupuesto de marketing este mes.",
    unitLabel: "millones",
    budget: 9,
    initiatives: [
      { name: "Redes sociales", valuePerUnit: 2, maxUnits: 3 },
      { name: "Evento presencial", valuePerUnit: 4, maxUnits: 2 },
      { name: "Publicidad impresa", valuePerUnit: 1, maxUnits: 9 },
    ],
  },
  {
    prompt: "Tu sprint tiene 8 puntos de historia disponibles para el equipo.",
    unitLabel: "puntos",
    budget: 8,
    initiatives: [
      { name: "Corregir errores críticos", valuePerUnit: 3, maxUnits: 3 },
      { name: "Nueva función pedida por clientes", valuePerUnit: 2, maxUnits: 4 },
      { name: "Mejoras visuales menores", valuePerUnit: 1, maxUnits: 8 },
    ],
  },
  {
    prompt: "Cuentas con 10 horas para preparar la evaluación de desempeño del equipo.",
    unitLabel: "horas",
    budget: 10,
    initiatives: [
      { name: "Retroalimentación individual", valuePerUnit: 2, maxUnits: 5 },
      { name: "Revisar métricas del trimestre", valuePerUnit: 3, maxUnits: 3 },
      { name: "Actualizar documentación", valuePerUnit: 1, maxUnits: 10 },
    ],
  },
  {
    prompt: "Tienes $12 millones para mejorar el clima laboral este trimestre.",
    unitLabel: "millones",
    budget: 12,
    initiatives: [
      { name: "Programa de bienestar", valuePerUnit: 3, maxUnits: 4 },
      { name: "Reconocimientos mensuales", valuePerUnit: 2, maxUnits: 5 },
      { name: "Decoración de oficinas", valuePerUnit: 1, maxUnits: 12 },
    ],
  },
];

const QUESTION_COUNT = SCENARIOS.length;
const QUESTION_TIME_MS = 25000;
const RESULT_PAUSE_MS = 1600;
const TARGET_RATIO = 0.75;

let active = false;

/** Óptimo por codicia: para este modelo (valor lineal por unidad con tope), llenar primero
 * las iniciativas de mayor valor/unidad hasta su tope es matemáticamente óptimo. */
function computeOptimalScore(budget: number, initiatives: InitiativeDef[]): number {
  const sorted = [...initiatives].sort((a, b) => b.valuePerUnit - a.valuePerUnit);
  let remaining = budget;
  let score = 0;
  for (const initiative of sorted) {
    const used = Math.min(initiative.maxUnits, remaining);
    score += used * initiative.valuePerUnit;
    remaining -= used;
  }
  return score;
}

export function startGerenciaGame(_zone: unknown, ctx: ZoneEnterContext): void {
  if (active) return;
  active = true;

  const { canvas, uiRoot, freezeMovement, onExit } = ctx;
  freezeMovement(true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const hud = new GerenciaHUD(uiRoot);

  let questionIndex = 0;
  let score = 0;
  let answered = false;
  let allocations: number[] = [];

  function nextQuestion(): void {
    if (questionIndex >= SCENARIOS.length) {
      endGame();
      return;
    }
    answered = false;
    const scenario = SCENARIOS[questionIndex];
    allocations = scenario.initiatives.map(() => 0);

    hud.showQuestion(
      questionIndex + 1,
      QUESTION_COUNT,
      scenario.prompt,
      scenario.unitLabel,
      scenario.budget,
      toRows(scenario),
      QUESTION_TIME_MS,
      handleChange,
      handleConfirm,
      () => {
        if (answered) return;
        answered = true;
        resolveRound(scenario, false, true);
      }
    );
  }

  function toRows(scenario: Scenario): InitiativeRow[] {
    return scenario.initiatives.map((initiative, i) => ({
      name: initiative.name,
      valuePerUnit: initiative.valuePerUnit,
      maxUnits: initiative.maxUnits,
      allocated: allocations[i],
    }));
  }

  function render(scenario: Scenario): void {
    hud.renderRows(toRows(scenario), scenario.unitLabel, scenario.budget, handleChange);
  }

  function handleChange(rowIndex: number, delta: number): void {
    if (answered) return;
    const scenario = SCENARIOS[questionIndex];
    const used = allocations.reduce((sum, value) => sum + value, 0);
    const nextValue = allocations[rowIndex] + delta;
    if (nextValue < 0 || nextValue > scenario.initiatives[rowIndex].maxUnits) return;
    if (delta > 0 && used >= scenario.budget) return;
    allocations[rowIndex] = nextValue;
    render(scenario);
  }

  function handleConfirm(): void {
    if (answered) return;
    answered = true;
    const scenario = SCENARIOS[questionIndex];
    const total = allocations.reduce((sum, value, i) => sum + value * scenario.initiatives[i].valuePerUnit, 0);
    const optimal = computeOptimalScore(scenario.budget, scenario.initiatives);
    const isCorrect = total >= Math.ceil(optimal * TARGET_RATIO);
    resolveRound(scenario, isCorrect, false, total, optimal);
  }

  function resolveRound(scenario: Scenario, isCorrect: boolean, timedOut: boolean, total?: number, optimal?: number): void {
    hud.stopTimer();
    hud.disableAll();
    hud.flashHit(isCorrect);

    const computedOptimal = optimal ?? computeOptimalScore(scenario.budget, scenario.initiatives);
    if (timedOut) {
      hud.setFeedback(`Se acabó el tiempo. Con este reparto se podían lograr hasta ${computedOptimal} puntos.`);
    } else {
      const achieved = total ?? 0;
      hud.setFeedback(
        isCorrect
          ? `¡Buen reparto! Lograste ${achieved} de un máximo posible de ${computedOptimal} puntos.`
          : `Reparto poco eficiente: ${achieved} puntos. Se podían lograr hasta ${computedOptimal} priorizando lo de mayor valor.`
      );
    }

    if (isCorrect) score++;
    questionIndex++;
    window.setTimeout(nextQuestion, RESULT_PAUSE_MS);
  }

  function endGame(): void {
    if (score === QUESTION_COUNT) BadgeSystem.unlock("gerencia-ronda-perfecta");
    BadgeSystem.unlock("gerencia-primera-ronda");

    hud.showResults(score, QUESTION_COUNT, {
      onRetry: () => {
        questionIndex = 0;
        score = 0;
        nextQuestion();
      },
      onExit: () => {
        cleanup();
        safeRequestPointerLock(canvas);
        freezeMovement(false);
        onExit();
      },
    });
  }

  function cleanup(): void {
    hud.destroy();
    active = false;
  }

  nextQuestion();
}

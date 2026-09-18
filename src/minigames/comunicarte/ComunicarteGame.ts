import type { ZoneEnterContext } from "../../types/zone";
import { BadgeSystem } from "../../systems/BadgeSystem";
import { safeRequestPointerLock } from "../../scene/PlayerController";
import { ComunicarteHUD, WordChip } from "../../ui/ComunicarteHUD";

const SENTENCES = [
  "Leer abre puertas.",
  "Escribir bien requiere práctica constante.",
  "Escuchar con atención mejora el diálogo.",
  "Las palabras claras evitan confusiones innecesarias.",
  "Comunicarse en varios idiomas amplía tus oportunidades.",
];

const QUESTION_COUNT = SENTENCES.length;
const QUESTION_TIME_MS = 20000;
const RESULT_PAUSE_MS = 1200;

let active = false;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function startComunicarteGame(_zone: unknown, ctx: ZoneEnterContext): void {
  if (active) return;
  active = true;

  const { canvas, uiRoot, freezeMovement, onExit } = ctx;
  freezeMovement(true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const hud = new ComunicarteHUD(uiRoot);
  const questions = SENTENCES.map((sentence) => sentence.replace(".", "").split(" "));

  let questionIndex = 0;
  let score = 0;
  let answered = false;
  let pool: WordChip[] = [];
  let built: string[] = [];

  function nextQuestion(): void {
    if (questionIndex >= questions.length) {
      endGame();
      return;
    }
    answered = false;
    built = [];
    pool = shuffle(questions[questionIndex].map((text, id) => ({ id, text })));
    renderState();
    hud.showQuestion(questionIndex + 1, QUESTION_COUNT, QUESTION_TIME_MS, () => {
      if (answered) return;
      answered = true;
      hud.setFeedback(`Se acabó el tiempo. La frase era: "${questions[questionIndex].join(" ")}."`);
      handleResult(false);
    });
  }

  function renderState(): void {
    hud.setBuiltWords(built);
    hud.setWordPool(pool, selectWord);
  }

  function selectWord(id: number): void {
    if (answered) return;
    const chipIndex = pool.findIndex((chip) => chip.id === id);
    if (chipIndex === -1) return;
    const [chip] = pool.splice(chipIndex, 1);
    built.push(chip.text);
    renderState();

    if (pool.length === 0) {
      answered = true;
      const correctWords = questions[questionIndex];
      const isCorrect = built.join(" ") === correctWords.join(" ");
      hud.setFeedback(isCorrect ? "¡Frase correcta!" : `La frase era: "${correctWords.join(" ")}."`);
      handleResult(isCorrect);
    }
  }

  function handleResult(isCorrect: boolean): void {
    hud.stopTimer();
    hud.flashHit(isCorrect);
    if (isCorrect) score++;
    questionIndex++;
    window.setTimeout(nextQuestion, RESULT_PAUSE_MS);
  }

  function endGame(): void {
    if (score === QUESTION_COUNT) BadgeSystem.unlock("comunicarte-ronda-perfecta");
    BadgeSystem.unlock("comunicarte-primera-ronda");

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

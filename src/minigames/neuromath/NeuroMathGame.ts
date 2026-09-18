import type { ZoneEnterContext } from "../../types/zone";
import { BadgeSystem } from "../../systems/BadgeSystem";
import { safeRequestPointerLock } from "../../scene/PlayerController";
import { NeuroMathHUD } from "../../ui/NeuroMathHUD";
import { getDigitModel } from "./digitModel";
import { recognizeNumber } from "./digitRecognition";

interface Question {
  prompt: string;
  correctAnswer: number;
}

const QUESTION_COUNT = 5;
// Dibujar toma más tiempo que apuntar y disparar, por eso el margen es más amplio.
const QUESTION_TIME_MS = 15000;
const RESULT_PAUSE_MS = 900;

let active = false;

export function startNeuroMathGame(_zone: unknown, ctx: ZoneEnterContext): void {
  if (active) return;
  active = true;

  const { canvas, uiRoot, freezeMovement, onExit } = ctx;
  freezeMovement(true);
  // Dibujar necesita un cursor real, no la mira bloqueada del modo FPS.
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const hud = new NeuroMathHUD(uiRoot);
  hud.showLoading("Preparando reconocimiento de escritura…");

  const questions = generateQuestions();
  let questionIndex = 0;
  let score = 0;
  let answered = false;

  getDigitModel()
    .then((model) => {
      hud.onSubmit(() => {
        if (answered) return;
        if (!hud.drawing.hasInk()) {
          hud.setFeedback("Dibuja un número antes de enviar.");
          return;
        }
        answered = true;
        const recognized = recognizeNumber(hud.drawing.element, model);
        const question = questions[questionIndex];
        const isCorrect = recognized !== null && recognized === question.correctAnswer;
        hud.setFeedback(recognized === null ? "No reconocí ningún trazo." : `Reconocí: ${recognized}`);
        handleResult(isCorrect);
      });
      nextQuestion();
    })
    .catch((error) => {
      console.error("No se pudo preparar el reconocimiento de escritura:", error);
      hud.showLoading("No se pudo cargar el reconocimiento de escritura. Intenta más tarde.");
    });

  function nextQuestion(): void {
    if (questionIndex >= questions.length) {
      endGame();
      return;
    }
    answered = false;
    const question = questions[questionIndex];
    hud.showQuestion(questionIndex + 1, QUESTION_COUNT, question.prompt, QUESTION_TIME_MS, () => {
      if (answered) return;
      answered = true;
      hud.setFeedback("Se acabó el tiempo.");
      handleResult(false);
    });
  }

  function handleResult(isCorrect: boolean): void {
    hud.stopTimer();
    hud.flashHit(isCorrect);
    if (isCorrect) score++;
    questionIndex++;
    window.setTimeout(nextQuestion, RESULT_PAUSE_MS);
  }

  function endGame(): void {
    if (score === QUESTION_COUNT) BadgeSystem.unlock("neuromath-ronda-perfecta");
    BadgeSystem.unlock("neuromath-primera-ronda");

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
}

function generateQuestions(): Question[] {
  return Array.from({ length: QUESTION_COUNT }, (_, i) => generateQuestion(i));
}

function generateQuestion(difficultyStep: number): Question {
  const useMultiplication = difficultyStep >= 3;
  const range = 5 + difficultyStep * 4;
  const a = useMultiplication ? randomInt(2, 9) : randomInt(1, range);
  const b = useMultiplication ? randomInt(2, 9) : randomInt(1, range);

  if (useMultiplication) {
    return { prompt: `${a} × ${b} = ?`, correctAnswer: a * b };
  }
  if (Math.random() > 0.5) {
    return { prompt: `${a} + ${b} = ?`, correctAnswer: a + b };
  }
  const [big, small] = a >= b ? [a, b] : [b, a];
  return { prompt: `${big} - ${small} = ?`, correctAnswer: big - small };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

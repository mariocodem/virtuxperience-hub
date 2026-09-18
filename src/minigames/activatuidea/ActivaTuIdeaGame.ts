import type { ZoneEnterContext } from "../../types/zone";
import { BadgeSystem } from "../../systems/BadgeSystem";
import { safeRequestPointerLock } from "../../scene/PlayerController";
import { ActivaTuIdeaHUD, IdeaOption } from "../../ui/ActivaTuIdeaHUD";

interface Challenge {
  problem: string;
  options: string[];
  correctIndex: number;
  rationale: string;
}

const CHALLENGES: Challenge[] = [
  {
    problem: "Los estudiantes olvidan traer sus propias botellas y se genera mucho plástico desechable.",
    options: [
      "Bebederos con sensor que detectan botellas reutilizables",
      "Prohibir el agua dentro del campus",
      "Vender más botellas desechables en la cafetería",
      "Dar una clase extra sobre la historia del plástico",
    ],
    correctIndex: 0,
    rationale: "Resuelve el problema de raíz: facilita y premia rellenar en vez de comprar.",
  },
  {
    problem: "Casi nadie lee las carteleras físicas y se desperdicia mucho papel imprimiendo avisos.",
    options: [
      "Pantallas digitales compartidas entre facultades",
      "Hacer las carteleras el doble de grandes",
      "Imprimir el doble de copias de cada aviso",
      "Eliminar toda comunicación escrita",
    ],
    correctIndex: 0,
    rationale: "Actualiza el medio en vez de insistir en uno que ya no funciona, y ahorra papel.",
  },
  {
    problem: "Estudiantes de zonas rurales tienen mala conexión para tomar clases virtuales en vivo.",
    options: [
      "Puntos de wifi comunitarios con horarios de descarga de material",
      "Exigir que todos vivan en la ciudad",
      "Hacer todas las clases solo por videollamada en vivo",
      "Aumentar el tamaño de los archivos PDF del curso",
    ],
    correctIndex: 0,
    rationale: "Se adapta a la conectividad real de los estudiantes en vez de ignorarla.",
  },
  {
    problem: "Sobra mucha comida en la cafetería al final del día y se termina botando.",
    options: [
      "Una app para donar o vender con descuento la comida sobrante",
      "Cocinar el doble de comida cada día",
      "Cerrar la cafetería antes del mediodía",
      "Prohibir repetir plato a los estudiantes",
    ],
    correctIndex: 0,
    rationale: "Reduce el desperdicio conectando la comida sobrante con quien la necesita.",
  },
  {
    problem: "A los estudiantes les cuesta encontrar mentores en su área de interés profesional.",
    options: [
      "Una plataforma que conecta estudiantes con egresados por intereses en común",
      "Un buzón de sugerencias físico en la entrada",
      "Programar más exámenes sorpresa",
      "Eliminar por completo las asesorías académicas",
    ],
    correctIndex: 0,
    rationale: "Usa la red de egresados existente para crear las conexiones que faltan.",
  },
];

const QUESTION_COUNT = CHALLENGES.length;
const QUESTION_TIME_MS = 15000;
const RESULT_PAUSE_MS = 1400;

let active = false;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function startActivaTuIdeaGame(_zone: unknown, ctx: ZoneEnterContext): void {
  if (active) return;
  active = true;

  const { canvas, uiRoot, freezeMovement, onExit } = ctx;
  freezeMovement(true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const hud = new ActivaTuIdeaHUD(uiRoot);

  let questionIndex = 0;
  let score = 0;
  let answered = false;
  // Mapea el índice mostrado (tras barajar) al índice original de CHALLENGES para saber cuál es correcto.
  let displayOrder: number[] = [];

  function nextQuestion(): void {
    if (questionIndex >= CHALLENGES.length) {
      endGame();
      return;
    }
    answered = false;
    const challenge = CHALLENGES[questionIndex];
    displayOrder = shuffle(challenge.options.map((_, i) => i));
    const options: IdeaOption[] = displayOrder.map((originalIndex, id) => ({
      id,
      text: challenge.options[originalIndex],
    }));

    hud.showQuestion(
      questionIndex + 1,
      QUESTION_COUNT,
      challenge.problem,
      options,
      QUESTION_TIME_MS,
      selectOption,
      () => {
        if (answered) return;
        answered = true;
        hud.disableOptions();
        revealCorrect();
        hud.setFeedback(`Se acabó el tiempo. ${challenge.rationale}`);
        handleResult(false);
      }
    );
  }

  function revealCorrect(): void {
    const correctDisplayIndex = displayOrder.indexOf(CHALLENGES[questionIndex].correctIndex);
    hud.markOptionByIndex(correctDisplayIndex, "correct");
  }

  function selectOption(id: number): void {
    if (answered) return;
    answered = true;
    hud.stopTimer();
    hud.disableOptions();

    const challenge = CHALLENGES[questionIndex];
    const chosenOriginalIndex = displayOrder[id];
    const isCorrect = chosenOriginalIndex === challenge.correctIndex;

    if (isCorrect) {
      hud.markOptionByIndex(id, "correct");
      hud.setFeedback(`¡Buena idea! ${challenge.rationale}`);
    } else {
      hud.markOptionByIndex(id, "incorrect");
      revealCorrect();
      hud.setFeedback(`Esa no resuelve el problema. ${challenge.rationale}`);
    }
    handleResult(isCorrect);
  }

  function handleResult(isCorrect: boolean): void {
    hud.flashHit(isCorrect);
    if (isCorrect) score++;
    questionIndex++;
    window.setTimeout(nextQuestion, RESULT_PAUSE_MS);
  }

  function endGame(): void {
    if (score === QUESTION_COUNT) BadgeSystem.unlock("activaidea-ronda-perfecta");
    BadgeSystem.unlock("activaidea-primera-ronda");

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

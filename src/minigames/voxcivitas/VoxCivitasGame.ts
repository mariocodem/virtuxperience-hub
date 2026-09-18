import type { ZoneEnterContext } from "../../types/zone";
import { BadgeSystem } from "../../systems/BadgeSystem";
import { safeRequestPointerLock } from "../../scene/PlayerController";
import { VoxCivitasHUD, DilemmaOption } from "../../ui/VoxCivitasHUD";

interface Dilemma {
  situation: string;
  options: [string, string];
  correctIndex: 0 | 1;
  rationale: string;
}

const DILEMMAS: Dilemma[] = [
  {
    situation: "El consejo estudiantil tiene un fondo sobrante. ¿Qué deberían hacer con él?",
    options: [
      "Convocar una votación abierta para que todos propongan y elijan su destino",
      "Dejar que solo el presidente del consejo decida en privado",
    ],
    correctIndex: 0,
    rationale: "La participación de todos en las decisiones que los afectan es la base de la ciudadanía democrática.",
  },
  {
    situation: "Un compañero de otro país tiene una costumbre distinta y genera burlas en el salón.",
    options: [
      "Pedirle que deje su costumbre para 'encajar' con el resto",
      "Abrir un espacio para que la explique y fomentar el respeto mutuo",
    ],
    correctIndex: 1,
    rationale: "El respeto a la diversidad cultural es un pilar de la convivencia ciudadana.",
  },
  {
    situation: "Se va a construir una nueva zona común en el campus. ¿Cómo decidir su diseño?",
    options: [
      "Que la administración decida sola, sin consultar a nadie",
      "Hacer una consulta pública con encuestas y foros abiertos a la comunidad",
    ],
    correctIndex: 1,
    rationale: "La participación ciudadana en decisiones públicas mejora la legitimidad de las soluciones.",
  },
  {
    situation: "Un compañero fue tratado injustamente por un reglamento mal aplicado.",
    options: [
      "Ayudarlo a presentar una petición formal ante las instancias correspondientes",
      "Decirle que mejor no diga nada para evitar problemas",
    ],
    correctIndex: 0,
    rationale: "Ejercer y defender los mecanismos de petición es un derecho y un deber ciudadano.",
  },
  {
    situation: "Hay elección de representante estudiantil y la participación histórica es muy baja.",
    options: [
      "Asumir que a nadie le interesa y no hacer nada al respecto",
      "Organizar una campaña informativa sobre por qué votar importa",
    ],
    correctIndex: 1,
    rationale: "La participación electoral informada fortalece la democracia y la representación.",
  },
];

const QUESTION_COUNT = DILEMMAS.length;
const QUESTION_TIME_MS = 14000;
const RESULT_PAUSE_MS = 1400;

let active = false;

export function startVoxCivitasGame(_zone: unknown, ctx: ZoneEnterContext): void {
  if (active) return;
  active = true;

  const { canvas, uiRoot, freezeMovement, onExit } = ctx;
  freezeMovement(true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const hud = new VoxCivitasHUD(uiRoot);

  let questionIndex = 0;
  let score = 0;
  let answered = false;

  function nextQuestion(): void {
    if (questionIndex >= DILEMMAS.length) {
      endGame();
      return;
    }
    answered = false;
    const dilemma = DILEMMAS[questionIndex];
    const options: DilemmaOption[] = dilemma.options.map((text, id) => ({ id, text }));

    hud.showQuestion(questionIndex + 1, QUESTION_COUNT, dilemma.situation, options, QUESTION_TIME_MS, selectOption, () => {
      if (answered) return;
      answered = true;
      hud.disableOptions();
      hud.markOptionByIndex(dilemma.correctIndex, "correct");
      hud.setFeedback(`Se acabó el tiempo. ${dilemma.rationale}`);
      handleResult(false);
    });
  }

  function selectOption(id: number): void {
    if (answered) return;
    answered = true;
    hud.stopTimer();
    hud.disableOptions();

    const dilemma = DILEMMAS[questionIndex];
    const isCorrect = id === dilemma.correctIndex;

    if (isCorrect) {
      hud.markOptionByIndex(id, "correct");
      hud.setFeedback(`¡Bien decidido! ${dilemma.rationale}`);
    } else {
      hud.markOptionByIndex(id, "incorrect");
      hud.markOptionByIndex(dilemma.correctIndex, "correct");
      hud.setFeedback(`Esa opción no fortalece la participación. ${dilemma.rationale}`);
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
    if (score === QUESTION_COUNT) BadgeSystem.unlock("voxcivitas-ronda-perfecta");
    BadgeSystem.unlock("voxcivitas-primera-ronda");

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

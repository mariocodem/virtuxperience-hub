import type { ZoneEnterContext } from "../../types/zone";
import { BadgeSystem } from "../../systems/BadgeSystem";
import { safeRequestPointerLock } from "../../scene/PlayerController";
import { LatidoSocialHUD, LatidoCard } from "../../ui/LatidoSocialHUD";

interface SocialPair {
  needLabel: string;
  actionLabel: string;
  rationale: string;
}

const PAIRS: SocialPair[] = [
  {
    needLabel: "Persona mayor que vive sola",
    actionLabel: "Visitas de acompañamiento",
    rationale: "Acompañar a quien vive en soledad fortalece el tejido social del barrio.",
  },
  {
    needLabel: "Familias sin alimentos suficientes",
    actionLabel: "Mercado comunitario solidario",
    rationale: "Organizar mercados solidarios ayuda a cubrir necesidades básicas de forma colectiva.",
  },
  {
    needLabel: "Niños sin apoyo escolar",
    actionLabel: "Tutorías voluntarias",
    rationale: "Las tutorías voluntarias reducen la brecha educativa en la comunidad.",
  },
  {
    needLabel: "Barrio sin zonas verdes",
    actionLabel: "Jornada de siembra comunitaria",
    rationale: "Recuperar espacios verdes mejora la calidad de vida de todo el vecindario.",
  },
  {
    needLabel: "Personas con movilidad reducida",
    actionLabel: "Construcción de rampas y accesos",
    rationale: "La accesibilidad es un derecho: adecuar los espacios incluye a todos.",
  },
  {
    needLabel: "Comunidad sin información de salud",
    actionLabel: "Brigada de salud preventiva",
    rationale: "Las brigadas de salud preventiva evitan problemas mayores a futuro.",
  },
];

const PERFECT_MOVES = PAIRS.length + 1;
const GOOD_MOVES = PAIRS.length * 2;
const MISMATCH_DELAY_MS = 900;
const MATCH_ADVANCE_DELAY_MS = 700;

interface DeckCard extends LatidoCard {
  pairIndex: number;
}

function buildShuffledDeck(): DeckCard[] {
  const deck: DeckCard[] = [];
  PAIRS.forEach((pair, pairIndex) => {
    deck.push({ id: pairIndex * 2, pairIndex, label: pair.needLabel });
    deck.push({ id: pairIndex * 2 + 1, pairIndex, label: pair.actionLabel });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

let active = false;

export function startLatidoSocialGame(_zone: unknown, ctx: ZoneEnterContext): void {
  if (active) return;
  active = true;

  const { canvas, uiRoot, freezeMovement, onExit } = ctx;
  freezeMovement(true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();

  const hud = new LatidoSocialHUD(uiRoot);

  let deck: DeckCard[] = [];
  const idToPair = new Map<number, DeckCard>();
  let flippedIds: number[] = [];
  const matchedPairs = new Set<number>();
  let moves = 0;
  let locked = false;

  function startRound(): void {
    deck = buildShuffledDeck();
    idToPair.clear();
    deck.forEach((card) => idToPair.set(card.id, card));
    flippedIds = [];
    matchedPairs.clear();
    moves = 0;
    locked = false;

    hud.renderGrid(
      deck.map(({ id, label }) => ({ id, label })),
      onCardClick
    );
    hud.updateStatus(0, PAIRS.length, 0);
  }

  function onCardClick(id: number): void {
    if (locked) return;
    if (flippedIds.includes(id)) return;
    const card = idToPair.get(id);
    if (!card || matchedPairs.has(card.pairIndex)) return;

    hud.revealCard(id, card.label);
    flippedIds.push(id);
    if (flippedIds.length < 2) return;

    moves++;
    locked = true;
    const [firstId, secondId] = flippedIds;
    const first = idToPair.get(firstId)!;
    const second = idToPair.get(secondId)!;

    if (first.pairIndex === second.pairIndex) {
      matchedPairs.add(first.pairIndex);
      hud.markMatched([firstId, secondId]);
      hud.setFeedback(`¡Conexión correcta! ${PAIRS[first.pairIndex].rationale}`);
      hud.updateStatus(matchedPairs.size, PAIRS.length, moves);
      flippedIds = [];
      locked = false;

      if (matchedPairs.size === PAIRS.length) {
        locked = true;
        window.setTimeout(endGame, MATCH_ADVANCE_DELAY_MS);
      }
    } else {
      hud.flashWrong([firstId, secondId]);
      hud.setFeedback("Esa combinación todavía no corresponde. Intenta de nuevo.");
      hud.updateStatus(matchedPairs.size, PAIRS.length, moves);
      window.setTimeout(() => {
        hud.hideCard(firstId);
        hud.hideCard(secondId);
        flippedIds = [];
        locked = false;
      }, MISMATCH_DELAY_MS);
    }
  }

  function endGame(): void {
    BadgeSystem.unlock("latido-social-primera-ronda");
    let tierLabel = "Cadena de apoyo completada";
    if (moves <= PERFECT_MOVES) {
      tierLabel = "¡Memoria excepcional!";
      BadgeSystem.unlock("latido-social-memoria-perfecta");
    } else if (moves <= GOOD_MOVES) {
      tierLabel = "¡Buena conexión comunitaria!";
    }

    hud.showResults(moves, tierLabel, {
      onRetry: () => startRound(),
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

  startRound();
}

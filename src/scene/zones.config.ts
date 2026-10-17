import type { ZoneDefinition, ZoneEnterHandler } from "../types/zone";

/** Radio de activación del portal: a esta distancia aparece "Presiona E para entrar". */
export const ZONE_TRIGGER_RADIUS = 4;

/**
 * Las 6 líneas transversales, en el orden fijo en que aparecen como islas en la landing page.
 * Nombres, colores y descripciones replican los de la landing page real de VirtuXperience
 * (uniminuto.edu/virtuxperience-home), para que la marca sea consistente entre la landing y el
 * mundo 3D de cada isla (el portal, el personaje y el monumento usan el mismo `color`).
 * Cada una se desbloquea al completar la insignia de "primera ronda" de la anterior (la primera
 * siempre está abierta). `angleDeg` ya no ubica un portal en un hub compartido: Character.ts lo usa
 * solo para decidir de qué lado del portal se para el personaje dentro de su propia isla.
 */
export const ZONES: ZoneDefinition[] = [
  {
    id: "comunicarte",
    name: "ComunicArte",
    description: "Desarrolla tu pensamiento crítico y comunica con propósito.",
    color: "#6ABCCC",
    angleDeg: 0,
    minigameSceneId: "comunicarte-sentence",
    npcGreeting: "¡Hola! ¿Listo para ordenar unas frases conmigo?",
    icon: "💬",
    firstRoundBadgeId: "comunicarte-primera-ronda",
  },
  {
    id: "neuromath",
    name: "NeuroMath",
    description: "Estimula tu mente. Fortalece tu pensamiento lógico y matemático.",
    color: "#F54F17",
    angleDeg: 60,
    minigameSceneId: "neuromath-arcade",
    npcGreeting: "Dibuja tus respuestas a mano: yo aprendo a reconocerlas.",
    icon: "🧮",
    firstRoundBadgeId: "neuromath-primera-ronda",
  },
  {
    id: "voxcivitas",
    name: "Voxcivitas",
    description: "Desarrolla autonomía, proyecto de vida y ciudadanía.",
    color: "#EEE61C",
    angleDeg: 120,
    minigameSceneId: "voxcivitas-dilemas",
    npcGreeting: "En una comunidad, cada decisión cuenta. ¿Qué harías tú?",
    icon: "🏛️",
    firstRoundBadgeId: "voxcivitas-primera-ronda",
  },
  {
    id: "gerencia-plus",
    name: "Gerencia+",
    description: "Lidera con propósito, crece con confianza.",
    color: "#3887D1",
    angleDeg: 180,
    minigameSceneId: "gerencia-recursos",
    npcGreeting: "Los recursos son limitados. Repártelos con cabeza.",
    icon: "💼",
    firstRoundBadgeId: "gerencia-primera-ronda",
  },
  {
    id: "activa-tu-idea",
    name: "ActivaTuIdea",
    description: "Convierte tu creatividad en proyectos reales.",
    color: "#F84F44",
    angleDeg: 240,
    minigameSceneId: "activa-tu-idea-inventos",
    npcGreeting: "Toda gran idea empieza con un problema bien entendido.",
    icon: "💡",
    firstRoundBadgeId: "activaidea-primera-ronda",
  },
  {
    id: "latido-social",
    name: "LatidoSocial",
    description: "¡Aquí se vibra con el corazón del impacto social!",
    color: "#639A44",
    angleDeg: 300,
    minigameSceneId: "latido-social-cadena",
    npcGreeting: "Conectemos cada necesidad con la acción que la atiende.",
    icon: "❤️",
    firstRoundBadgeId: "latido-social-primera-ronda",
  },
];

/**
 * Punto de extensión: cuando exista un minijuego real para una línea,
 * registrar aquí su handler en vez de tocar ZoneManager.
 */
export const zoneHandlers: Record<string, ZoneEnterHandler> = {};

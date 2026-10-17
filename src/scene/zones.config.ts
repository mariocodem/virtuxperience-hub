import type { ZoneDefinition, ZoneEnterHandler } from "../types/zone";

/** Radio de activación del portal: a esta distancia aparece "Presiona E para entrar". */
export const ZONE_TRIGGER_RADIUS = 4;

/**
 * Las 6 líneas transversales, en el orden fijo en que aparecen como islas en la landing page.
 * Cada una se desbloquea al completar la insignia de "primera ronda" de la anterior (la primera
 * siempre está abierta). `angleDeg` ya no ubica un portal en un hub compartido: Character.ts lo usa
 * solo para decidir de qué lado del portal se para el personaje dentro de su propia isla.
 */
export const ZONES: ZoneDefinition[] = [
  {
    id: "comunicarte",
    name: "Comunicarte",
    description: "Lectura, escritura, oralidad y multilingüismo.",
    color: "#2FA5D8",
    angleDeg: 0,
    minigameSceneId: "comunicarte-sentence",
    npcGreeting: "¡Hola! ¿Listo para ordenar unas frases conmigo?",
    icon: "💬",
    firstRoundBadgeId: "comunicarte-primera-ronda",
  },
  {
    id: "neuromath",
    name: "NeuroMath",
    description: "Pensamiento matemático y resolución de problemas.",
    color: "#7A4FE0",
    angleDeg: 60,
    minigameSceneId: "neuromath-arcade",
    npcGreeting: "Dibuja tus respuestas a mano: yo aprendo a reconocerlas.",
    icon: "🧮",
    firstRoundBadgeId: "neuromath-primera-ronda",
  },
  {
    id: "voxcivitas",
    name: "VoxCivitas",
    description: "Ciudadanía y participación.",
    color: "#E0A22F",
    angleDeg: 120,
    minigameSceneId: "voxcivitas-dilemas",
    npcGreeting: "En una comunidad, cada decisión cuenta. ¿Qué harías tú?",
    icon: "🏛️",
    firstRoundBadgeId: "voxcivitas-primera-ronda",
  },
  {
    id: "gerencia-plus",
    name: "Gerencia+",
    description: "Gestión y desempeño profesional.",
    color: "#2FE07A",
    angleDeg: 180,
    minigameSceneId: "gerencia-recursos",
    npcGreeting: "Los recursos son limitados. Repártelos con cabeza.",
    icon: "💼",
    firstRoundBadgeId: "gerencia-primera-ronda",
  },
  {
    id: "activa-tu-idea",
    name: "Activa tu idea",
    description: "Innovación y desarrollo de ideas.",
    color: "#E05C2F",
    angleDeg: 240,
    minigameSceneId: "activa-tu-idea-inventos",
    npcGreeting: "Toda gran idea empieza con un problema bien entendido.",
    icon: "💡",
    firstRoundBadgeId: "activaidea-primera-ronda",
  },
  {
    id: "latido-social",
    name: "Latido Social",
    description: "Dimensión social y compromiso con el entorno.",
    color: "#E02F5C",
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

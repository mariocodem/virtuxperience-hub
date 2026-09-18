import type { ZoneDefinition, ZoneEnterHandler } from "../types/zone";

export const HUB_RADIUS = 25;
export const ZONE_TRIGGER_RADIUS = 4;

export const ZONES: ZoneDefinition[] = [
  {
    id: "comunicarte",
    name: "Comunicarte",
    description: "Lectura, escritura, oralidad y multilingüismo.",
    color: "#2FA5D8",
    angleDeg: 0,
    minigameSceneId: "comunicarte-sentence",
  },
  {
    id: "neuromath",
    name: "NeuroMath",
    description: "Pensamiento matemático y resolución de problemas.",
    color: "#7A4FE0",
    angleDeg: 60,
    minigameSceneId: "neuromath-arcade",
  },
  {
    id: "voxcivitas",
    name: "VoxCivitas",
    description: "Ciudadanía y participación.",
    color: "#E0A22F",
    angleDeg: 120,
    minigameSceneId: "voxcivitas-dilemas",
  },
  {
    id: "gerencia-plus",
    name: "Gerencia+",
    description: "Gestión y desempeño profesional.",
    color: "#2FE07A",
    angleDeg: 180,
    minigameSceneId: "gerencia-recursos",
  },
  {
    id: "activa-tu-idea",
    name: "Activa tu idea",
    description: "Innovación y desarrollo de ideas.",
    color: "#E05C2F",
    angleDeg: 240,
    minigameSceneId: "activa-tu-idea-inventos",
  },
  {
    id: "latido-social",
    name: "Latido Social",
    description: "Dimensión social y compromiso con el entorno.",
    color: "#E02F5C",
    angleDeg: 300,
    minigameSceneId: "latido-social-cadena",
  },
];

/**
 * Punto de extensión: cuando exista un minijuego real para una línea,
 * registrar aquí su handler en vez de tocar ZoneManager.
 */
export const zoneHandlers: Record<string, ZoneEnterHandler> = {};

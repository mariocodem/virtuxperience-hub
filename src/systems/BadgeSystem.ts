const STORAGE_KEY = "virtuxperience:badges";

export interface BadgeDefinition {
  id: string;
  zone: string;
  name: string;
  description: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: "comunicarte-primera-ronda", zone: "ComunicArte", name: "Primeras palabras", description: "Completa tu primera ronda de ComunicArte." },
  { id: "comunicarte-ronda-perfecta", zone: "ComunicArte", name: "Oratoria perfecta", description: "Ordena bien las 5 frases de ComunicArte." },
  { id: "neuromath-primera-ronda", zone: "NeuroMath", name: "Primer trazo", description: "Completa tu primera ronda de NeuroMath." },
  { id: "neuromath-ronda-perfecta", zone: "NeuroMath", name: "Mente calculadora", description: "Acierta las 5 operaciones de NeuroMath." },
  { id: "voxcivitas-primera-ronda", zone: "Voxcivitas", name: "Voz ciudadana", description: "Completa tu primera ronda de Voxcivitas." },
  { id: "voxcivitas-ronda-perfecta", zone: "Voxcivitas", name: "Conciencia cívica", description: "Acierta los 5 dilemas de Voxcivitas." },
  { id: "gerencia-primera-ronda", zone: "Gerencia+", name: "Primer reparto", description: "Completa tu primer reto de Gerencia+." },
  { id: "gerencia-ronda-perfecta", zone: "Gerencia+", name: "Gerente estratega", description: "Logra el reparto óptimo en los 5 retos de Gerencia+." },
  { id: "activaidea-primera-ronda", zone: "ActivaTuIdea", name: "Primera chispa", description: "Completa tu primer reto de ActivaTuIdea." },
  { id: "activaidea-ronda-perfecta", zone: "ActivaTuIdea", name: "Innovador nato", description: "Elige la mejor solución en los 5 retos de ActivaTuIdea." },
  { id: "latido-social-primera-ronda", zone: "LatidoSocial", name: "Primer latido", description: "Completa tu primera ronda de LatidoSocial." },
  { id: "latido-social-memoria-perfecta", zone: "LatidoSocial", name: "Memoria solidaria", description: "Empareja todas las tarjetas con el mínimo de intentos en LatidoSocial." },
];

function readUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const unlockListeners: Array<(badge: BadgeDefinition) => void> = [];

export const BadgeSystem = {
  unlock(id: string): void {
    const unlocked = new Set(readUnlocked());
    if (!unlocked.has(id)) {
      unlocked.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
      console.log(`[Badge] desbloqueada: ${id}`);
      const badge = BADGE_CATALOG.find((b) => b.id === id);
      if (badge) unlockListeners.forEach((listener) => listener(badge));
    }
  },
  /** Avisa cada vez que se desbloquea una insignia por primera vez (para mostrar aviso y sonido). */
  onUnlock(listener: (badge: BadgeDefinition) => void): void {
    unlockListeners.push(listener);
  },
  isUnlocked(id: string): boolean {
    return readUnlocked().includes(id);
  },
  getUnlocked(): string[] {
    return readUnlocked();
  },
};

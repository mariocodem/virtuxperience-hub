const STORAGE_KEY = "virtuxperience:badges";

function readUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export const BadgeSystem = {
  unlock(id: string): void {
    const unlocked = new Set(readUnlocked());
    if (!unlocked.has(id)) {
      unlocked.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
      console.log(`[Badge] desbloqueada: ${id}`);
    }
  },
  isUnlocked(id: string): boolean {
    return readUnlocked().includes(id);
  },
};

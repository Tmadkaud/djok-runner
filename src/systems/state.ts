import { STORAGE_KEYS } from '../config';
import type { IslandId } from '../data/islands';

export type AgeStatus = 'unverified' | 'verified' | 'denied';

interface Persisted {
  ageStatus: AgeStatus;
  birthYear: number | null;
  mute: boolean;
  highscore: number;
  unlockedIslands: IslandId[];
  collectedRums: IslandId[];
  starsByIsland: Partial<Record<IslandId, number>>;
  email: string | null;
  promoCode: string | null;
  recipesUnlocked: string[];
  cookieConsent: boolean | null;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — ignore */
  }
}

class State {
  private data: Persisted;

  constructor() {
    this.data = {
      ageStatus: readJSON<AgeStatus>(STORAGE_KEYS.age, 'unverified'),
      birthYear: readJSON<number | null>(STORAGE_KEYS.birthYear, null),
      mute: readJSON<boolean>(STORAGE_KEYS.mute, false),
      highscore: readJSON<number>(STORAGE_KEYS.highscore, 0),
      unlockedIslands: readJSON<IslandId[]>(STORAGE_KEYS.unlockedIslands, ['martinique']),
      collectedRums: readJSON<IslandId[]>(STORAGE_KEYS.collectedRums, []),
      starsByIsland: readJSON<Partial<Record<IslandId, number>>>(STORAGE_KEYS.starsByIsland, {}),
      email: readJSON<string | null>(STORAGE_KEYS.email, null),
      promoCode: readJSON<string | null>(STORAGE_KEYS.promoCode, null),
      recipesUnlocked: readJSON<string[]>(STORAGE_KEYS.recipesUnlocked, []),
      cookieConsent: readJSON<boolean | null>(STORAGE_KEYS.cookieConsent, null),
    };
    if (!this.data.unlockedIslands.includes('martinique')) {
      this.data.unlockedIslands.push('martinique');
      writeJSON(STORAGE_KEYS.unlockedIslands, this.data.unlockedIslands);
    }
  }

  get ageStatus(): AgeStatus { return this.data.ageStatus; }
  setAgeStatus(s: AgeStatus, birthYear: number | null = null): void {
    this.data.ageStatus = s;
    this.data.birthYear = birthYear;
    writeJSON(STORAGE_KEYS.age, s);
    writeJSON(STORAGE_KEYS.birthYear, birthYear);
  }

  get mute(): boolean { return this.data.mute; }
  setMute(m: boolean): void {
    this.data.mute = m;
    writeJSON(STORAGE_KEYS.mute, m);
  }
  toggleMute(): boolean {
    this.setMute(!this.data.mute);
    return this.data.mute;
  }

  get highscore(): number { return this.data.highscore; }
  maybeSetHighscore(v: number): boolean {
    if (v > this.data.highscore) {
      this.data.highscore = v;
      writeJSON(STORAGE_KEYS.highscore, v);
      return true;
    }
    return false;
  }

  get unlockedIslands(): IslandId[] { return [...this.data.unlockedIslands]; }
  isUnlocked(id: IslandId): boolean { return this.data.unlockedIslands.includes(id); }
  unlockIsland(id: IslandId): boolean {
    if (this.data.unlockedIslands.includes(id)) return false;
    this.data.unlockedIslands.push(id);
    writeJSON(STORAGE_KEYS.unlockedIslands, this.data.unlockedIslands);
    return true;
  }

  get collectedRums(): IslandId[] { return [...this.data.collectedRums]; }
  hasRum(id: IslandId): boolean { return this.data.collectedRums.includes(id); }
  collectRum(id: IslandId): boolean {
    if (this.data.collectedRums.includes(id)) return false;
    this.data.collectedRums.push(id);
    writeJSON(STORAGE_KEYS.collectedRums, this.data.collectedRums);
    return true;
  }

  starsForIsland(id: IslandId): number { return this.data.starsByIsland[id] ?? 0; }
  setStarsForIsland(id: IslandId, stars: number): boolean {
    const current = this.data.starsByIsland[id] ?? 0;
    if (stars > current) {
      this.data.starsByIsland[id] = stars;
      writeJSON(STORAGE_KEYS.starsByIsland, this.data.starsByIsland);
      return true;
    }
    return false;
  }

  get email(): string | null { return this.data.email; }
  setEmail(e: string | null): void {
    this.data.email = e;
    writeJSON(STORAGE_KEYS.email, e);
  }

  get promoCode(): string | null { return this.data.promoCode; }
  setPromoCode(c: string | null): void {
    this.data.promoCode = c;
    writeJSON(STORAGE_KEYS.promoCode, c);
  }

  get recipesUnlocked(): string[] { return [...this.data.recipesUnlocked]; }
  unlockRecipe(id: string): boolean {
    if (this.data.recipesUnlocked.includes(id)) return false;
    this.data.recipesUnlocked.push(id);
    writeJSON(STORAGE_KEYS.recipesUnlocked, this.data.recipesUnlocked);
    return true;
  }

  get cookieConsent(): boolean | null { return this.data.cookieConsent; }
  setCookieConsent(v: boolean): void {
    this.data.cookieConsent = v;
    writeJSON(STORAGE_KEYS.cookieConsent, v);
  }
}

export const state = new State();

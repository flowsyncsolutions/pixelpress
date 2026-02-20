import { safeGet, safeSet } from "./storageGuard";

const STARS_TOTAL_KEY = "pp_stars_total";
const STREAK_COUNT_KEY = "pp_streak_count";
const LAST_PLAY_DATE_KEY = "pp_last_play_date";

function readNumber(key: string): number {
  const raw = safeGet(key, "0");
  const parsed = Number(raw ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    safeSet(key, "0");
    return 0;
  }
  const normalized = Math.floor(parsed);
  if (String(normalized) !== raw) {
    safeSet(key, String(normalized));
  }
  return normalized;
}

function writeNumber(key: string, value: number): void {
  safeSet(key, String(Math.max(0, Math.floor(value))));
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getYesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDate(yesterday);
}

export function getTodayKey(): string {
  return formatLocalDate(new Date());
}

export function getStarsTotal(): number {
  return readNumber(STARS_TOTAL_KEY);
}

export function addStars(amount: number): void {
  if (amount <= 0) {
    return;
  }
  const current = getStarsTotal();
  writeNumber(STARS_TOTAL_KEY, current + amount);
}

export function getStreak(): number {
  return readNumber(STREAK_COUNT_KEY);
}

function isValidDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getLastPlayDate(): string | null {
  const value = safeGet(LAST_PLAY_DATE_KEY, "");
  if (!value) {
    return null;
  }
  if (!isValidDayKey(value)) {
    safeSet(LAST_PLAY_DATE_KEY, "");
    return null;
  }
  return value;
}

export function ensureProgressDefaults(): void {
  if (typeof window === "undefined") {
    return;
  }

  const stars = getStarsTotal();
  const streak = getStreak();
  const lastPlayDate = safeGet(LAST_PLAY_DATE_KEY, "");
  const normalizedLastPlayDate = isValidDayKey(lastPlayDate) ? lastPlayDate : "";

  safeSet(STARS_TOTAL_KEY, String(stars));
  safeSet(STREAK_COUNT_KEY, String(streak));
  safeSet(LAST_PLAY_DATE_KEY, normalizedLastPlayDate);
}

export function resetProgress(): void {
  if (typeof window === "undefined") {
    return;
  }

  safeSet(STARS_TOTAL_KEY, "0");
  safeSet(STREAK_COUNT_KEY, "0");
  safeSet(LAST_PLAY_DATE_KEY, "");
}

export function markPlayedToday(): void {
  const today = getTodayKey();
  const lastPlayDate = getLastPlayDate();

  if (lastPlayDate === today) {
    return;
  }

  const previousStreak = getStreak();
  const yesterday = getYesterdayKey();
  const nextStreak = lastPlayDate === yesterday ? previousStreak + 1 : 1;

  writeNumber(STREAK_COUNT_KEY, nextStreak);
  safeSet(LAST_PLAY_DATE_KEY, today);
}

export function getDailySeededItems<T>(items: T[], count: number, dateKey = getTodayKey()): T[] {
  if (items.length === 0 || count <= 0) {
    return [];
  }

  const shuffled = [...items];
  let state = hashSeed(dateKey) || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

const STARS_TOTAL_KEY = "pp_stars_total";
const STREAK_COUNT_KEY = "pp_streak_count";
const LAST_PLAY_DATE_KEY = "pp_last_play_date";
const PLAYS_COUNT_KEY = "pp_plays_count";

function readNumber(key: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(key);
  const parsed = Number(raw ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function writeNumber(key: string, value: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
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

export function markPlayedToday(): void {
  if (typeof window === "undefined") {
    return;
  }

  const today = getTodayKey();
  const lastPlayDate = window.localStorage.getItem(LAST_PLAY_DATE_KEY);

  if (lastPlayDate === today) {
    return;
  }

  const previousStreak = getStreak();
  const yesterday = getYesterdayKey();
  const nextStreak = lastPlayDate === yesterday ? previousStreak + 1 : 1;

  writeNumber(STREAK_COUNT_KEY, nextStreak);
  window.localStorage.setItem(LAST_PLAY_DATE_KEY, today);
}

export function getPlaysCount(): number {
  return readNumber(PLAYS_COUNT_KEY);
}

export function incrementPlay(): number {
  const next = getPlaysCount() + 1;
  writeNumber(PLAYS_COUNT_KEY, next);
  return next;
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

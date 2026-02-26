import { safeGet, safeSet } from "./storageGuard";

const STARCAP_DAY_KEY = "pp_starcap_day_key";
const STARCAP_EARNED_KEY = "pp_starcap_earned_today";
const STARCAP_LIMIT_KEY = "pp_starcap_limit";
const DEFAULT_STARCAP_LIMIT = 5;

export type StarCapState = {
  earnedToday: number;
  limit: number;
  remaining: number;
  capped: boolean;
};

function normalizePositiveInt(raw: string, fallback: number, minimum = 0): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.floor(parsed);
  if (normalized < minimum) {
    return fallback;
  }
  return normalized;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function getTodayKey(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readLimit(): number {
  const rawLimit = safeGet(STARCAP_LIMIT_KEY, String(DEFAULT_STARCAP_LIMIT));
  const limit = normalizePositiveInt(rawLimit, DEFAULT_STARCAP_LIMIT, 1);
  if (String(limit) !== rawLimit) {
    safeSet(STARCAP_LIMIT_KEY, String(limit));
  }
  return limit;
}

function readEarned(limit: number): number {
  const rawEarned = safeGet(STARCAP_EARNED_KEY, "0");
  const parsed = normalizePositiveInt(rawEarned, 0, 0);
  const earned = clamp(parsed, 0, Math.max(0, limit));
  if (String(earned) !== rawEarned) {
    safeSet(STARCAP_EARNED_KEY, String(earned));
  }
  return earned;
}

export function resetIfNewDay(): void {
  if (typeof window === "undefined") {
    return;
  }

  const today = getTodayKey();
  const storedDay = safeGet(STARCAP_DAY_KEY, "");
  if (storedDay !== today) {
    safeSet(STARCAP_DAY_KEY, today);
    safeSet(STARCAP_EARNED_KEY, "0");
  }
  readLimit();
}

export function getStarCapState(): StarCapState {
  if (typeof window === "undefined") {
    return {
      earnedToday: 0,
      limit: DEFAULT_STARCAP_LIMIT,
      remaining: DEFAULT_STARCAP_LIMIT,
      capped: false,
    };
  }

  resetIfNewDay();
  const limit = readLimit();
  const earnedToday = readEarned(limit);
  const remaining = Math.max(0, limit - earnedToday);

  return {
    earnedToday,
    limit,
    remaining,
    capped: remaining <= 0,
  };
}

export function canEarnStar(): boolean {
  return getStarCapState().remaining > 0;
}

export function recordStarEarned(amount = 1): void {
  if (typeof window === "undefined") {
    return;
  }

  resetIfNewDay();
  const normalizedAmount = Math.max(0, Math.floor(amount));
  if (normalizedAmount <= 0) {
    return;
  }

  const state = getStarCapState();
  if (state.capped) {
    return;
  }

  const nextEarned = state.earnedToday + Math.min(normalizedAmount, state.remaining);
  safeSet(STARCAP_EARNED_KEY, String(Math.min(state.limit, nextEarned)));
}

export function setStarCapLimit(limit: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedLimit = Math.max(1, Math.floor(limit));
  safeSet(STARCAP_LIMIT_KEY, String(normalizedLimit));
  resetIfNewDay();

  const current = getStarCapState();
  if (current.earnedToday > normalizedLimit) {
    safeSet(STARCAP_EARNED_KEY, String(normalizedLimit));
  }
}

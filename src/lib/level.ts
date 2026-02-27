import { safeGet, safeSet } from "./storageGuard";

const XP_TOTAL_KEY = "pp_xp_total";
const LEVEL_KEY = "pp_level";
const LAST_LEVEL_NOTIFIED_KEY = "pp_last_level_notified";

export type LevelData = {
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
};

function parseNonNegativeInt(raw: string, fallback = 0): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function getXpForLevel(level: number): number {
  return Math.max(1, Math.floor(50 * level));
}

function computeLevelDataFromXP(xpTotal: number): LevelData {
  let level = 1;
  let xpRemaining = Math.max(0, Math.floor(xpTotal));
  let xpForNextLevel = getXpForLevel(level);

  while (xpRemaining >= xpForNextLevel) {
    xpRemaining -= xpForNextLevel;
    level += 1;
    xpForNextLevel = getXpForLevel(level);
  }

  const progressPercent = Math.min(100, Math.max(0, (xpRemaining / xpForNextLevel) * 100));
  return {
    level,
    xpTotal: Math.max(0, Math.floor(xpTotal)),
    xpIntoLevel: xpRemaining,
    xpForNextLevel,
    progressPercent,
  };
}

function readXP(): number {
  const raw = safeGet(XP_TOTAL_KEY, "0");
  const xp = parseNonNegativeInt(raw, 0);
  if (String(xp) !== raw) {
    safeSet(XP_TOTAL_KEY, String(xp));
  }
  return xp;
}

function readLastNotifiedLevel(currentLevel: number): number {
  const raw = safeGet(LAST_LEVEL_NOTIFIED_KEY, "1");
  const parsed = parseNonNegativeInt(raw, 1);
  const normalized = Math.max(1, parsed);

  // Keep storage sane and avoid notifying level 1.
  if (String(normalized) !== raw || normalized > currentLevel) {
    safeSet(LAST_LEVEL_NOTIFIED_KEY, String(Math.min(normalized, currentLevel)));
  }
  return Math.min(normalized, currentLevel);
}

export function getLevelData(): LevelData {
  const xpTotal = readXP();
  const data = computeLevelDataFromXP(xpTotal);

  const storedLevelRaw = safeGet(LEVEL_KEY, "1");
  const storedLevel = Math.max(1, parseNonNegativeInt(storedLevelRaw, 1));
  if (storedLevel !== data.level || storedLevelRaw !== String(storedLevel)) {
    safeSet(LEVEL_KEY, String(data.level));
  }

  readLastNotifiedLevel(data.level);
  return data;
}

export function addXP(amount: number): LevelData {
  const normalizedAmount = Math.max(0, Math.floor(amount));
  if (normalizedAmount <= 0) {
    return getLevelData();
  }

  const previous = getLevelData();
  const nextXp = previous.xpTotal + normalizedAmount;
  safeSet(XP_TOTAL_KEY, String(nextXp));

  const next = computeLevelDataFromXP(nextXp);
  safeSet(LEVEL_KEY, String(next.level));

  if (previous.level < 5 && next.level >= 5) {
    console.log("Level reward unlocked: Cosmetic badge at Level 5");
  }
  if (previous.level < 10 && next.level >= 10) {
    console.log("Level reward unlocked: Alternate shop item color at Level 10");
  }

  readLastNotifiedLevel(next.level);
  return next;
}

export function getPendingLevelUp(): number | null {
  const data = getLevelData();
  const lastNotified = readLastNotifiedLevel(data.level);
  if (data.level > lastNotified) {
    return data.level;
  }
  return null;
}

export function markLevelUpNotified(level: number): void {
  const normalized = Math.max(1, Math.floor(level));
  const current = getLevelData().level;
  const nextValue = Math.min(normalized, current);
  const lastNotified = readLastNotifiedLevel(current);
  if (nextValue > lastNotified) {
    safeSet(LAST_LEVEL_NOTIFIED_KEY, String(nextValue));
  }
}

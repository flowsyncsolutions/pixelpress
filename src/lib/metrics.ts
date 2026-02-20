import { safeGetJSON, safeSetJSON } from "./storageGuard";

const GLOBAL_KEY = "pp_metrics_global";
const GAMES_KEY = "pp_metrics_games";
const DAY_KEY = "pp_metrics_day";

export type MetricsGlobal = {
  firstSeenAt: number;
  sessions: number;
  lastSeenAt: number;
  totalGameLaunches: number;
  totalPlaySeconds: number;
};

export type MetricsGameEntry = {
  launches: number;
  completes: number;
  best?: number;
  lastPlayedAt: number;
  playSeconds: number;
};

export type MetricsGames = Record<string, MetricsGameEntry>;

export type MetricsDayEntry = {
  sessions: number;
  launches: number;
  playSeconds: number;
};

export type MetricsDay = Record<string, MetricsDayEntry>;

export type MetricsSnapshot = {
  global: MetricsGlobal;
  games: MetricsGames;
  day: MetricsDay;
};

function createDefaultGlobal(): MetricsGlobal {
  return {
    firstSeenAt: 0,
    sessions: 0,
    lastSeenAt: 0,
    totalGameLaunches: 0,
    totalPlaySeconds: 0,
  };
}

function createDefaultGames(): MetricsGames {
  return {};
}

function createDefaultDay(): MetricsDay {
  return {};
}

function createDefaultSnapshot(): MetricsSnapshot {
  return {
    global: createDefaultGlobal(),
    games: createDefaultGames(),
    day: createDefaultDay(),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseGlobal(value: unknown): MetricsGlobal | null {
  if (!isObject(value)) {
    return null;
  }

  const firstSeenAt = value.firstSeenAt;
  const sessions = value.sessions;
  const lastSeenAt = value.lastSeenAt;
  const totalGameLaunches = value.totalGameLaunches;
  const totalPlaySeconds = value.totalPlaySeconds;

  if (
    !isNonNegativeNumber(firstSeenAt) ||
    !isNonNegativeNumber(sessions) ||
    !isNonNegativeNumber(lastSeenAt) ||
    !isNonNegativeNumber(totalGameLaunches) ||
    !isNonNegativeNumber(totalPlaySeconds)
  ) {
    return null;
  }

  return {
    firstSeenAt: Math.floor(firstSeenAt),
    sessions: Math.floor(sessions),
    lastSeenAt: Math.floor(lastSeenAt),
    totalGameLaunches: Math.floor(totalGameLaunches),
    totalPlaySeconds: Math.floor(totalPlaySeconds),
  };
}

function parseGameEntry(value: unknown): MetricsGameEntry | null {
  if (!isObject(value)) {
    return null;
  }

  const launches = value.launches;
  const completes = value.completes;
  const lastPlayedAt = value.lastPlayedAt;
  const playSeconds = value.playSeconds;

  if (
    !isNonNegativeNumber(launches) ||
    !isNonNegativeNumber(completes) ||
    !isNonNegativeNumber(lastPlayedAt) ||
    !isNonNegativeNumber(playSeconds)
  ) {
    return null;
  }

  let best: number | undefined;
  if (value.best !== undefined) {
    if (!isNonNegativeNumber(value.best)) {
      return null;
    }
    best = Math.floor(value.best);
  }

  return {
    launches: Math.floor(launches),
    completes: Math.floor(completes),
    ...(best !== undefined ? { best } : {}),
    lastPlayedAt: Math.floor(lastPlayedAt),
    playSeconds: Math.floor(playSeconds),
  };
}

function parseGames(value: unknown): MetricsGames | null {
  if (!isObject(value)) {
    return null;
  }

  const next: MetricsGames = {};
  for (const [slug, entry] of Object.entries(value)) {
    if (!slug) {
      return null;
    }
    const parsedEntry = parseGameEntry(entry);
    if (!parsedEntry) {
      return null;
    }
    next[slug] = parsedEntry;
  }

  return next;
}

function parseDayEntry(value: unknown): MetricsDayEntry | null {
  if (!isObject(value)) {
    return null;
  }

  const sessions = value.sessions;
  const launches = value.launches;
  const playSeconds = value.playSeconds;

  if (!isNonNegativeNumber(sessions) || !isNonNegativeNumber(launches) || !isNonNegativeNumber(playSeconds)) {
    return null;
  }

  return {
    sessions: Math.floor(sessions),
    launches: Math.floor(launches),
    playSeconds: Math.floor(playSeconds),
  };
}

function parseDay(value: unknown): MetricsDay | null {
  if (!isObject(value)) {
    return null;
  }

  const next: MetricsDay = {};
  for (const [dayKey, entry] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return null;
    }
    const parsedEntry = parseDayEntry(entry);
    if (!parsedEntry) {
      return null;
    }
    next[dayKey] = parsedEntry;
  }

  return next;
}

function readJsonKey<T>(
  key: string,
  parse: (value: unknown) => T | null,
  createFallback: () => T,
): T {
  const fallback = createFallback();
  const value = safeGetJSON<unknown>(key, fallback);
  const parsed = parse(value);
  if (parsed) {
    return parsed;
  }

  safeSetJSON(key, fallback);
  return fallback;
}

function readAll(): MetricsSnapshot {
  if (typeof window === "undefined") {
    return createDefaultSnapshot();
  }

  const global = readJsonKey(GLOBAL_KEY, parseGlobal, createDefaultGlobal);
  const games = readJsonKey(GAMES_KEY, parseGames, createDefaultGames);
  const day = readJsonKey(DAY_KEY, parseDay, createDefaultDay);

  return { global, games, day };
}

function persistAll(snapshot: MetricsSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  safeSetJSON(GLOBAL_KEY, snapshot.global);
  safeSetJSON(GAMES_KEY, snapshot.games);
  safeSetJSON(DAY_KEY, snapshot.day);
}

function getLocalDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ensureGameEntry(snapshot: MetricsSnapshot, slug: string, now: number): MetricsGameEntry {
  if (!snapshot.games[slug]) {
    snapshot.games[slug] = {
      launches: 0,
      completes: 0,
      lastPlayedAt: now,
      playSeconds: 0,
    };
  }
  return snapshot.games[slug];
}

function ensureDayEntry(snapshot: MetricsSnapshot, dayKey: string): MetricsDayEntry {
  if (!snapshot.day[dayKey]) {
    snapshot.day[dayKey] = {
      sessions: 0,
      launches: 0,
      playSeconds: 0,
    };
  }
  return snapshot.day[dayKey];
}

function normalizeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.floor(seconds);
}

export function metricsSessionStart(): void {
  if (typeof window === "undefined") {
    return;
  }

  const now = Date.now();
  const dayKey = getLocalDayKey();
  const snapshot = readAll();

  if (snapshot.global.firstSeenAt === 0) {
    snapshot.global.firstSeenAt = now;
  }

  snapshot.global.sessions += 1;
  snapshot.global.lastSeenAt = now;

  const dayEntry = ensureDayEntry(snapshot, dayKey);
  dayEntry.sessions += 1;

  persistAll(snapshot);
}

export function metricsGameLaunch(slug: string): void {
  if (typeof window === "undefined" || !slug) {
    return;
  }

  const now = Date.now();
  const dayKey = getLocalDayKey();
  const snapshot = readAll();

  if (snapshot.global.firstSeenAt === 0) {
    snapshot.global.firstSeenAt = now;
  }

  snapshot.global.lastSeenAt = now;
  snapshot.global.totalGameLaunches += 1;

  const gameEntry = ensureGameEntry(snapshot, slug, now);
  gameEntry.launches += 1;
  gameEntry.lastPlayedAt = now;

  const dayEntry = ensureDayEntry(snapshot, dayKey);
  dayEntry.launches += 1;

  persistAll(snapshot);
}

export function metricsGameComplete(slug: string): void {
  if (typeof window === "undefined" || !slug) {
    return;
  }

  const now = Date.now();
  const snapshot = readAll();

  if (snapshot.global.firstSeenAt === 0) {
    snapshot.global.firstSeenAt = now;
  }

  snapshot.global.lastSeenAt = now;

  const gameEntry = ensureGameEntry(snapshot, slug, now);
  gameEntry.completes += 1;
  gameEntry.lastPlayedAt = now;

  persistAll(snapshot);
}

export function metricsAddPlaySeconds(slug: string, seconds: number): void {
  if (typeof window === "undefined" || !slug) {
    return;
  }

  const normalizedSeconds = normalizeSeconds(seconds);
  if (normalizedSeconds <= 0) {
    return;
  }

  const now = Date.now();
  const dayKey = getLocalDayKey();
  const snapshot = readAll();

  if (snapshot.global.firstSeenAt === 0) {
    snapshot.global.firstSeenAt = now;
  }

  snapshot.global.lastSeenAt = now;
  snapshot.global.totalPlaySeconds += normalizedSeconds;

  const gameEntry = ensureGameEntry(snapshot, slug, now);
  gameEntry.playSeconds += normalizedSeconds;
  gameEntry.lastPlayedAt = now;

  const dayEntry = ensureDayEntry(snapshot, dayKey);
  dayEntry.playSeconds += normalizedSeconds;

  persistAll(snapshot);
}

export function metricsSetBest(slug: string, best: number): void {
  if (typeof window === "undefined" || !slug || !Number.isFinite(best) || best <= 0) {
    return;
  }

  const now = Date.now();
  const snapshot = readAll();

  if (snapshot.global.firstSeenAt === 0) {
    snapshot.global.firstSeenAt = now;
  }

  snapshot.global.lastSeenAt = now;

  const gameEntry = ensureGameEntry(snapshot, slug, now);
  gameEntry.best = Math.floor(best);
  gameEntry.lastPlayedAt = now;

  persistAll(snapshot);
}

export function metricsGetAll(): MetricsSnapshot {
  return readAll();
}

export function metricsResetAll(): void {
  if (typeof window === "undefined") {
    return;
  }

  persistAll(createDefaultSnapshot());
}

import { safeGet, safeSet } from "./storageGuard";

const TIME_LIMIT_ENABLED_KEY = "pp_time_limit_enabled";
const TIME_LIMIT_MINUTES_KEY = "pp_time_limit_minutes";
const TIME_USED_TODAY_SECONDS_KEY = "pp_time_used_today_seconds";
const TIME_DAY_KEY = "pp_time_day_key";
const TIME_LAST_TICK_KEY = "pp_time_last_tick";
const TIME_EXTRA_TODAY_MINUTES_KEY = "pp_time_extra_today_minutes";

type TimeSettings = {
  enabled: boolean;
  limitMinutes: number;
};

type TimeState = {
  usedSeconds: number;
  remainingSeconds: number;
  limitSeconds: number;
  enabled: boolean;
};

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 30;
  }
  return Math.max(1, Math.min(600, Math.floor(value)));
}

function readEnabled(): boolean {
  return safeGet(TIME_LIMIT_ENABLED_KEY, "false") === "true";
}

function readBaseLimitMinutes(): number {
  const raw = safeGet(TIME_LIMIT_MINUTES_KEY, "30");
  const normalized = clampMinutes(toPositiveInt(raw, 30));
  if (raw !== String(normalized)) {
    safeSet(TIME_LIMIT_MINUTES_KEY, String(normalized));
  }
  return normalized;
}

function readUsedSeconds(): number {
  const raw = safeGet(TIME_USED_TODAY_SECONDS_KEY, "0");
  const normalized = toPositiveInt(raw, 0);
  if (raw !== String(normalized)) {
    safeSet(TIME_USED_TODAY_SECONDS_KEY, String(normalized));
  }
  return normalized;
}

function readExtraMinutesToday(): number {
  const raw = safeGet(TIME_EXTRA_TODAY_MINUTES_KEY, "0");
  const normalized = toPositiveInt(raw, 0);
  if (raw !== String(normalized)) {
    safeSet(TIME_EXTRA_TODAY_MINUTES_KEY, String(normalized));
  }
  return normalized;
}

function writeUsedSeconds(value: number): void {
  safeSet(TIME_USED_TODAY_SECONDS_KEY, String(Math.max(0, Math.floor(value))));
}

function writeLastTick(timestampMs: number): void {
  safeSet(TIME_LAST_TICK_KEY, String(Math.max(0, Math.floor(timestampMs))));
}

function ensureDayKey(dayKey: string): void {
  safeSet(TIME_DAY_KEY, dayKey);
}

function getTotalLimitSeconds(): number {
  const baseLimitMinutes = readBaseLimitMinutes();
  const extraMinutes = readExtraMinutesToday();
  return (baseLimitMinutes + extraMinutes) * 60;
}

function advanceUsedTime(nowMs: number): void {
  if (!readEnabled()) {
    writeLastTick(nowMs);
    return;
  }

  const lastTickRaw = safeGet(TIME_LAST_TICK_KEY, String(nowMs));
  const lastTickMs = toPositiveInt(lastTickRaw, nowMs);
  const deltaMs = Math.max(0, nowMs - lastTickMs);
  const deltaSeconds = Math.floor(deltaMs / 1000);

  if (deltaSeconds > 0) {
    writeUsedSeconds(readUsedSeconds() + deltaSeconds);
  }

  writeLastTick(nowMs);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayKey(): string {
  return formatLocalDate(new Date());
}

export function resetIfNewDay(): void {
  if (typeof window === "undefined") {
    return;
  }

  const today = getTodayKey();
  const storedDay = safeGet(TIME_DAY_KEY, "");

  if (storedDay !== today) {
    ensureDayKey(today);
    safeSet(TIME_USED_TODAY_SECONDS_KEY, "0");
    safeSet(TIME_EXTRA_TODAY_MINUTES_KEY, "0");
    writeLastTick(Date.now());
    return;
  }

  if (!safeGet(TIME_USED_TODAY_SECONDS_KEY, "")) {
    safeSet(TIME_USED_TODAY_SECONDS_KEY, "0");
  }
  if (!safeGet(TIME_LIMIT_MINUTES_KEY, "")) {
    safeSet(TIME_LIMIT_MINUTES_KEY, "30");
  }
}

export function loadTimeSettings(): TimeSettings {
  resetIfNewDay();
  return {
    enabled: readEnabled(),
    limitMinutes: readBaseLimitMinutes(),
  };
}

export function setTimeSettings(enabled: boolean, limitMinutes: number): void {
  if (typeof window === "undefined") {
    return;
  }

  resetIfNewDay();
  safeSet(TIME_LIMIT_ENABLED_KEY, String(enabled));
  safeSet(TIME_LIMIT_MINUTES_KEY, String(clampMinutes(limitMinutes)));
}

export function getTimeState(): TimeState {
  resetIfNewDay();
  const enabled = readEnabled();
  const limitSeconds = getTotalLimitSeconds();
  const usedSeconds = readUsedSeconds();
  const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);

  return {
    usedSeconds,
    remainingSeconds,
    limitSeconds,
    enabled,
  };
}

export function startSessionTick(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  resetIfNewDay();
  writeLastTick(Date.now());

  const runTick = () => {
    resetIfNewDay();
    advanceUsedTime(Date.now());
  };

  const intervalId = window.setInterval(runTick, 1000);

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      runTick();
    }
  };

  window.addEventListener("focus", runTick);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    runTick();
    window.clearInterval(intervalId);
    window.removeEventListener("focus", runTick);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

export function addExtraMinutes(minutes: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const increment = Math.max(0, Math.floor(minutes));
  if (increment <= 0) {
    return;
  }

  resetIfNewDay();
  const nextExtra = readExtraMinutesToday() + increment;
  safeSet(TIME_EXTRA_TODAY_MINUTES_KEY, String(nextExtra));
}

export function resetTodayUsage(): void {
  if (typeof window === "undefined") {
    return;
  }

  resetIfNewDay();
  writeUsedSeconds(0);
  safeSet(TIME_EXTRA_TODAY_MINUTES_KEY, "0");
  writeLastTick(Date.now());
}

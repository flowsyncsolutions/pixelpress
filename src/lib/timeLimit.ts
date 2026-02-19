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
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(TIME_LIMIT_ENABLED_KEY) === "true";
}

function readBaseLimitMinutes(): number {
  if (typeof window === "undefined") {
    return 30;
  }
  return clampMinutes(toPositiveInt(window.localStorage.getItem(TIME_LIMIT_MINUTES_KEY), 30));
}

function readUsedSeconds(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  return toPositiveInt(window.localStorage.getItem(TIME_USED_TODAY_SECONDS_KEY), 0);
}

function readExtraMinutesToday(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  return toPositiveInt(window.localStorage.getItem(TIME_EXTRA_TODAY_MINUTES_KEY), 0);
}

function writeUsedSeconds(value: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TIME_USED_TODAY_SECONDS_KEY, String(Math.max(0, Math.floor(value))));
}

function writeLastTick(timestampMs: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TIME_LAST_TICK_KEY, String(Math.max(0, Math.floor(timestampMs))));
}

function ensureDayKey(dayKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TIME_DAY_KEY, dayKey);
}

function getTotalLimitSeconds(): number {
  const baseLimitMinutes = readBaseLimitMinutes();
  const extraMinutes = readExtraMinutesToday();
  return (baseLimitMinutes + extraMinutes) * 60;
}

function advanceUsedTime(nowMs: number): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!readEnabled()) {
    writeLastTick(nowMs);
    return;
  }

  const lastTickRaw = window.localStorage.getItem(TIME_LAST_TICK_KEY);
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
  const storedDay = window.localStorage.getItem(TIME_DAY_KEY);

  if (storedDay !== today) {
    ensureDayKey(today);
    window.localStorage.setItem(TIME_USED_TODAY_SECONDS_KEY, "0");
    window.localStorage.setItem(TIME_EXTRA_TODAY_MINUTES_KEY, "0");
    writeLastTick(Date.now());
    return;
  }

  if (window.localStorage.getItem(TIME_USED_TODAY_SECONDS_KEY) === null) {
    window.localStorage.setItem(TIME_USED_TODAY_SECONDS_KEY, "0");
  }
  if (window.localStorage.getItem(TIME_LIMIT_MINUTES_KEY) === null) {
    window.localStorage.setItem(TIME_LIMIT_MINUTES_KEY, "30");
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
  window.localStorage.setItem(TIME_LIMIT_ENABLED_KEY, String(enabled));
  window.localStorage.setItem(TIME_LIMIT_MINUTES_KEY, String(clampMinutes(limitMinutes)));
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
  window.localStorage.setItem(TIME_EXTRA_TODAY_MINUTES_KEY, String(nextExtra));
}

export function resetTodayUsage(): void {
  if (typeof window === "undefined") {
    return;
  }

  resetIfNewDay();
  writeUsedSeconds(0);
  window.localStorage.setItem(TIME_EXTRA_TODAY_MINUTES_KEY, "0");
  writeLastTick(Date.now());
}

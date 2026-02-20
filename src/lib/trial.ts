import { safeGet, safeSet } from "./storageGuard";

const TRIAL_STARTED_AT_KEY = "pp_trial_started_at";
const TRIAL_DAYS_KEY = "pp_trial_days";
const TRIAL_OVERRIDE_UNLOCKED_KEY = "pp_trial_override_unlocked";

const DEFAULT_TRIAL_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function readNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function readTrialDays(): number {
  const raw = safeGet(TRIAL_DAYS_KEY, String(DEFAULT_TRIAL_DAYS));
  const normalized = Math.max(1, Math.floor(readNumber(raw, DEFAULT_TRIAL_DAYS)));
  if (raw !== String(normalized)) {
    safeSet(TRIAL_DAYS_KEY, String(normalized));
  }
  return normalized;
}

export function startTrial(): void {
  const existingStartedAt = safeGet(TRIAL_STARTED_AT_KEY, "");
  if (!existingStartedAt) {
    safeSet(TRIAL_STARTED_AT_KEY, String(Date.now()));
  }

  if (!safeGet(TRIAL_DAYS_KEY, "")) {
    safeSet(TRIAL_DAYS_KEY, String(DEFAULT_TRIAL_DAYS));
  }
}

export function getTrialStatus(): {
  isActive: boolean;
  daysRemaining: number;
  hasStarted: boolean;
  isExpired: boolean;
} {
  const trialDays = readTrialDays();

  if (typeof window === "undefined") {
    return {
      isActive: false,
      daysRemaining: trialDays,
      hasStarted: false,
      isExpired: false,
    };
  }

  const startedAtRaw = safeGet(TRIAL_STARTED_AT_KEY, "");
  if (!startedAtRaw) {
    return {
      isActive: false,
      daysRemaining: trialDays,
      hasStarted: false,
      isExpired: false,
    };
  }

  const startedAt = readNumber(startedAtRaw, 0);
  if (startedAt <= 0) {
    return {
      isActive: false,
      daysRemaining: trialDays,
      hasStarted: false,
      isExpired: false,
    };
  }

  const elapsedMs = Math.max(0, Date.now() - startedAt);
  const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
  const daysRemaining = Math.max(0, trialDays - elapsedDays);
  const isExpired = daysRemaining <= 0;

  return {
    isActive: !isExpired,
    daysRemaining,
    hasStarted: true,
    isExpired,
  };
}

export function isTrialOverrideUnlocked(): boolean {
  return safeGet(TRIAL_OVERRIDE_UNLOCKED_KEY, "false") === "true";
}

export function setTrialOverrideUnlocked(unlocked: boolean): void {
  safeSet(TRIAL_OVERRIDE_UNLOCKED_KEY, String(unlocked));
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Intentionally ignored.
  }
}

export function resetTrial(): void {
  safeRemove(TRIAL_STARTED_AT_KEY);
  safeRemove(TRIAL_DAYS_KEY);
}

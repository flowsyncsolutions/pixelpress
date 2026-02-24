import { safeGet, safeSet } from "./storageGuard";

const TRIAL_STARTED_AT_KEY = "pp_trial_started_at";
const TRIAL_DAYS_KEY = "pp_trial_days";
const TRIAL_OVERRIDE_UNLOCKED_KEY = "pp_trial_override_unlocked";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FULL_PHASE_END_DAY = 3;
const LIMITED_PHASE_END_DAY = 10;

export type TrialState = "full" | "limited" | "expired";

function readNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function startTrial(): void {
  const existingStartedAt = safeGet(TRIAL_STARTED_AT_KEY, "");
  if (!existingStartedAt) {
    safeSet(TRIAL_STARTED_AT_KEY, String(Date.now()));
  }

  if (!safeGet(TRIAL_DAYS_KEY, "")) {
    // Legacy key kept for compatibility with previous builds.
    safeSet(TRIAL_DAYS_KEY, "14");
  }
}

export function getTrialStatus(): {
  state: TrialState;
  daysRemaining: number;
  isActive: boolean;
  hasStarted: boolean;
  isExpired: boolean;
} {
  const trialDays = Math.max(1, LIMITED_PHASE_END_DAY + 1);

  if (typeof window === "undefined") {
    return {
      state: "full",
      daysRemaining: trialDays,
      isActive: false,
      hasStarted: false,
      isExpired: false,
    };
  }

  const startedAtRaw = safeGet(TRIAL_STARTED_AT_KEY, "");
  if (!startedAtRaw) {
    return {
      state: "full",
      daysRemaining: trialDays,
      isActive: false,
      hasStarted: false,
      isExpired: false,
    };
  }

  const startedAt = readNumber(startedAtRaw, 0);
  if (startedAt <= 0) {
    return {
      state: "full",
      daysRemaining: trialDays,
      isActive: false,
      hasStarted: false,
      isExpired: false,
    };
  }

  const elapsedMs = Math.max(0, Date.now() - startedAt);
  const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
  const daysRemaining = Math.max(0, LIMITED_PHASE_END_DAY + 1 - elapsedDays);

  let state: TrialState = "full";
  if (elapsedDays > LIMITED_PHASE_END_DAY) {
    state = "expired";
  } else if (elapsedDays > FULL_PHASE_END_DAY) {
    state = "limited";
  }

  const isExpired = state === "expired";

  return {
    state,
    daysRemaining,
    isActive: !isExpired,
    hasStarted: true,
    isExpired,
  };
}

export function isTrialLimitedMode(): boolean {
  return getTrialStatus().state === "limited";
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

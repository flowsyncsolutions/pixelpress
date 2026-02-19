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
  if (typeof window === "undefined") {
    return DEFAULT_TRIAL_DAYS;
  }

  return Math.max(1, Math.floor(readNumber(window.localStorage.getItem(TRIAL_DAYS_KEY), DEFAULT_TRIAL_DAYS)));
}

export function startTrial(): void {
  if (typeof window === "undefined") {
    return;
  }

  const existingStartedAt = window.localStorage.getItem(TRIAL_STARTED_AT_KEY);
  if (!existingStartedAt) {
    window.localStorage.setItem(TRIAL_STARTED_AT_KEY, String(Date.now()));
  }

  if (!window.localStorage.getItem(TRIAL_DAYS_KEY)) {
    window.localStorage.setItem(TRIAL_DAYS_KEY, String(DEFAULT_TRIAL_DAYS));
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

  const startedAtRaw = window.localStorage.getItem(TRIAL_STARTED_AT_KEY);
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
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(TRIAL_OVERRIDE_UNLOCKED_KEY) === "true";
}

export function setTrialOverrideUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TRIAL_OVERRIDE_UNLOCKED_KEY, String(unlocked));
}

export function resetTrial(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TRIAL_STARTED_AT_KEY);
  window.localStorage.removeItem(TRIAL_DAYS_KEY);
}

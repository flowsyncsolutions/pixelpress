import { safeGet, safeSet } from "./storageGuard";

const DISMISSED_UNTIL_KEY = "pp_install_dismissed_until";
const PROMPTED_COUNT_KEY = "pp_install_prompted_count";
const LAST_PROMPT_AT_KEY = "pp_install_last_prompt_at";
const COMPLETED_KEY = "pp_install_completed";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_REPROMPT_GAP_MS = 24 * 60 * 60 * 1000;
const MAX_PROMPTS = 3;

export type InstallNudgeContext = {
  isInstalled: boolean;
  stars: number;
  streak: number;
  hasPlayedToday: boolean;
  totalGameLaunches: number;
};

function readInt(key: string): number {
  const raw = safeGet(key, "0");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    safeSet(key, "0");
    return 0;
  }
  const normalized = Math.floor(parsed);
  if (raw !== String(normalized)) {
    safeSet(key, String(normalized));
  }
  return normalized;
}

function readCompleted(): boolean {
  return safeGet(COMPLETED_KEY, "false") === "true";
}

export function shouldShowInstallNudge(context: InstallNudgeContext): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (context.isInstalled || readCompleted()) {
    return false;
  }

  const now = Date.now();
  const dismissedUntil = readInt(DISMISSED_UNTIL_KEY);
  if (dismissedUntil > now) {
    return false;
  }

  const promptedCount = readInt(PROMPTED_COUNT_KEY);
  if (promptedCount >= MAX_PROMPTS) {
    return false;
  }

  const lastPromptAt = readInt(LAST_PROMPT_AT_KEY);
  if (lastPromptAt > 0 && now - lastPromptAt < MIN_REPROMPT_GAP_MS) {
    return false;
  }

  const triggerByStars = context.stars >= 3;
  const triggerByStreak = context.streak >= 1 && context.hasPlayedToday;
  const triggerByLaunches = context.totalGameLaunches >= 2;

  return triggerByStars || triggerByStreak || triggerByLaunches;
}

export function recordInstallPromptShown(): void {
  if (typeof window === "undefined") {
    return;
  }

  const count = readInt(PROMPTED_COUNT_KEY);
  safeSet(PROMPTED_COUNT_KEY, String(count + 1));
  safeSet(LAST_PROMPT_AT_KEY, String(Date.now()));
}

export function snoozeInstallNudge(days: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const safeDays = Math.max(1, Math.floor(days));
  const until = Date.now() + safeDays * MS_PER_DAY;
  safeSet(DISMISSED_UNTIL_KEY, String(until));
}

export function markInstalled(): void {
  if (typeof window === "undefined") {
    return;
  }

  safeSet(COMPLETED_KEY, "true");
}

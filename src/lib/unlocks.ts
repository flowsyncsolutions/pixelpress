import { getStarsTotal } from "./progress";
import { STAR_LADDER, getUnlockedIds } from "./starLadder";
import { safeGet, safeSet } from "./storageGuard";

const LAST_UNLOCK_NOTIFIED_KEY = "pp_last_unlock_notified";

export type UnlockedFeatures = {
  rocketSkinLevel: number;
  memoryHardUnlocked: boolean;
  challengeBadgeUnlocked: boolean;
};

export type UnlockNotice = {
  threshold: number;
  title: string;
  description: string;
};

const UNLOCK_MILESTONES: UnlockNotice[] = STAR_LADDER.map((goal) => ({
  threshold: goal.stars,
  title: "New Unlock!",
  description: goal.title,
}));

export function getTotalStars(): number {
  return getStarsTotal();
}

export function getUnlockedFeatures(): UnlockedFeatures {
  const stars = getTotalStars();
  const unlocked = new Set(getUnlockedIds(stars));

  return {
    rocketSkinLevel: unlocked.has("rocket_skin_3") ? 3 : unlocked.has("rocket_skin_2") ? 2 : 1,
    memoryHardUnlocked: unlocked.has("memory_normal"),
    challengeBadgeUnlocked: unlocked.has("arcade_challenger"),
  };
}

function readLastUnlockNotified(): number {
  const raw = safeGet(LAST_UNLOCK_NOTIFIED_KEY, "0");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    safeSet(LAST_UNLOCK_NOTIFIED_KEY, "0");
    return 0;
  }

  const normalized = Math.floor(parsed);
  if (raw !== String(normalized)) {
    safeSet(LAST_UNLOCK_NOTIFIED_KEY, String(normalized));
  }
  return normalized;
}

export function getPendingUnlockNotice(stars = getTotalStars()): UnlockNotice | null {
  const lastNotified = readLastUnlockNotified();
  return (
    UNLOCK_MILESTONES.find(
      (milestone) => stars >= milestone.threshold && milestone.threshold > lastNotified,
    ) ?? null
  );
}

export function markUnlockNoticeSeen(threshold: number): void {
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return;
  }

  const safeThreshold = Math.floor(threshold);
  const current = readLastUnlockNotified();
  if (safeThreshold > current) {
    safeSet(LAST_UNLOCK_NOTIFIED_KEY, String(safeThreshold));
  }
}

export function resetUnlockNotices(): void {
  safeSet(LAST_UNLOCK_NOTIFIED_KEY, "0");
}

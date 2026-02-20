import { getStarsTotal } from "./progress";
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

const UNLOCK_MILESTONES: UnlockNotice[] = [
  { threshold: 5, title: "New Unlock!", description: "Rocket Skin Level 2" },
  { threshold: 10, title: "New Unlock!", description: "Memory Normal Unlocked" },
  { threshold: 20, title: "New Unlock!", description: "Rocket Skin Level 3" },
  { threshold: 30, title: "New Unlock!", description: "Arcade Challenger" },
];

export function getTotalStars(): number {
  return getStarsTotal();
}

export function getUnlockedFeatures(): UnlockedFeatures {
  const stars = getTotalStars();

  return {
    rocketSkinLevel: stars >= 20 ? 3 : stars >= 5 ? 2 : 1,
    memoryHardUnlocked: stars >= 10,
    challengeBadgeUnlocked: stars >= 30,
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

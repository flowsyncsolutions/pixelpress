"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { metricsGetAll, metricsResetAll } from "@/src/lib/metrics";
import {
  ensureProgressDefaults,
  getLastPlayDate,
  getStarsTotal,
  getStreak,
  resetProgress,
} from "@/src/lib/progress";
import { safeGet, safeSet, safeSetJSON } from "@/src/lib/storageGuard";
import { getTimeState, resetIfNewDay, resetTodayUsage } from "@/src/lib/timeLimit";
import { getTrialStatus, resetTrial } from "@/src/lib/trial";
import { THEME } from "@/src/lib/theme";
import { getUnlockedFeatures, resetUnlockNotices } from "@/src/lib/unlocks";

const PIN_KEY = "pp_pin";
const DEBUG_UNLOCKED_KEY = "pp_debug_unlocked";

type ConfirmAction =
  | "reset_trial"
  | "reset_timer"
  | "reset_progress"
  | "reset_metrics"
  | "reset_everything"
  | "import_json";

type DebugSnapshot = {
  trial: {
    hasStarted: boolean;
    daysRemaining: number;
    isExpired: boolean;
  };
  timer: {
    enabled: boolean;
    limitMinutes: number;
    usedSeconds: number;
    remainingSeconds: number;
  };
  stars: {
    total: number;
    streak: number;
    lastPlayDate: string;
  };
  unlocks: {
    rocketSkinLevel: number;
    memoryHardUnlocked: boolean;
    challengeBadgeUnlocked: boolean;
  };
  metrics: {
    sessions: number;
    totalLaunches: number;
    totalPlaySeconds: number;
  };
};

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remaining}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remaining}s`;
  }
  return `${remaining}s`;
}

function getStoredPin(): string {
  return safeGet(PIN_KEY, "");
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

function clearAllPPKeys(): void {
  if (typeof window === "undefined") {
    return;
  }

  const keys: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith("pp_")) {
        keys.push(key);
      }
    }
  } catch {
    // Intentionally ignored.
  }

  for (const key of keys) {
    safeRemove(key);
  }

  try {
    window.sessionStorage.removeItem(DEBUG_UNLOCKED_KEY);
  } catch {
    // Intentionally ignored.
  }
}

function collectPrefixedStorage(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return {};
  }

  const payload: Record<string, unknown> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("pp_")) {
        continue;
      }

      const raw = safeGet(key, "");
      if (!raw) {
        payload[key] = "";
        continue;
      }

      try {
        payload[key] = JSON.parse(raw);
      } catch {
        payload[key] = raw;
      }
    }
  } catch {
    // Intentionally ignored.
  }

  return payload;
}

function importPrefixedStorage(rawJson: string): { ok: boolean; message: string } {
  if (!rawJson.trim()) {
    return { ok: false, message: "Paste JSON first." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, message: "Invalid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "JSON must be an object of keys and values." };
  }

  const entries = Object.entries(parsed as Record<string, unknown>).filter(([key]) =>
    key.startsWith("pp_"),
  );

  if (entries.length === 0) {
    return { ok: false, message: "No pp_* keys found in import payload." };
  }

  for (const [key, value] of entries) {
    if (value === null) {
      safeRemove(key);
      continue;
    }

    if (typeof value === "string") {
      safeSet(key, value);
      continue;
    }

    safeSetJSON(key, value);
  }

  return { ok: true, message: `Imported ${entries.length} keys.` };
}

export default function DebugPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction>("reset_trial");
  const [confirmPin, setConfirmPin] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [importInput, setImportInput] = useState("");

  const refreshSnapshot = useCallback(() => {
    resetIfNewDay();
    ensureProgressDefaults();

    const trial = getTrialStatus();
    const timerSettings = getTimeState();
    const metrics = metricsGetAll();
    const unlocks = getUnlockedFeatures();

    const limitMinutes = Math.floor(timerSettings.limitSeconds / 60);
    setSnapshot({
      trial: {
        hasStarted: trial.hasStarted,
        daysRemaining: trial.daysRemaining,
        isExpired: trial.isExpired,
      },
      timer: {
        enabled: timerSettings.enabled,
        limitMinutes,
        usedSeconds: timerSettings.usedSeconds,
        remainingSeconds: timerSettings.remainingSeconds,
      },
      stars: {
        total: getStarsTotal(),
        streak: getStreak(),
        lastPlayDate: getLastPlayDate() ?? "--",
      },
      unlocks: {
        rocketSkinLevel: unlocks.rocketSkinLevel,
        memoryHardUnlocked: unlocks.memoryHardUnlocked,
        challengeBadgeUnlocked: unlocks.challengeBadgeUnlocked,
      },
      metrics: {
        sessions: metrics.global.sessions,
        totalLaunches: metrics.global.totalGameLaunches,
        totalPlaySeconds: metrics.global.totalPlaySeconds,
      },
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unlocked = window.sessionStorage.getItem(DEBUG_UNLOCKED_KEY) === "true";
    setIsUnlocked(unlocked);
  }, []);

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    refreshSnapshot();
    const intervalId = window.setInterval(refreshSnapshot, 1500);
    window.addEventListener("storage", refreshSnapshot);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", refreshSnapshot);
    };
  }, [isUnlocked, refreshSnapshot]);

  const unlockPanel = () => {
    const storedPin = getStoredPin();
    if (!/^\d{4}$/.test(storedPin)) {
      setUnlockError("Set a Parent PIN first at /parent.");
      return;
    }

    if (unlockPin !== storedPin) {
      setUnlockError("Incorrect PIN.");
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DEBUG_UNLOCKED_KEY, "true");
    }
    setUnlockError(null);
    setUnlockPin("");
    setIsUnlocked(true);
    refreshSnapshot();
  };

  const openConfirmModal = (action: ConfirmAction) => {
    const storedPin = getStoredPin();
    if (!/^\d{4}$/.test(storedPin)) {
      setMessage("Set a Parent PIN first at /parent.");
      return;
    }

    setPendingAction(action);
    setConfirmPin("");
    setConfirmError(null);
    setConfirmModalOpen(true);
  };

  const applyAction = () => {
    const storedPin = getStoredPin();
    if (!/^\d{4}$/.test(storedPin)) {
      setConfirmError("Set a Parent PIN first.");
      return;
    }

    if (confirmPin !== storedPin) {
      setConfirmError("Incorrect PIN.");
      return;
    }

    if (pendingAction === "reset_trial") {
      resetTrial();
      setMessage("Trial reset.");
    } else if (pendingAction === "reset_timer") {
      resetTodayUsage();
      setMessage("Timer usage reset for today.");
    } else if (pendingAction === "reset_progress") {
      resetProgress();
      resetUnlockNotices();
      setMessage("Progress reset (stars/streak/unlock notices).");
    } else if (pendingAction === "reset_metrics") {
      metricsResetAll();
      setMessage("Metrics reset.");
    } else if (pendingAction === "reset_everything") {
      clearAllPPKeys();
      setMessage("All pp_* keys removed.");
      setIsUnlocked(false);
    } else if (pendingAction === "import_json") {
      const result = importPrefixedStorage(importInput);
      setMessage(result.message);
      if (!result.ok) {
        setConfirmError(result.message);
        return;
      }
      setImportInput("");
    }

    setConfirmModalOpen(false);
    setConfirmPin("");
    setConfirmError(null);
    refreshSnapshot();
  };

  const exportJson = () => {
    const payload = collectPrefixedStorage();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pixelpress-storage-${stamp}.json`;
    anchor.click();

    window.URL.revokeObjectURL(url);
    setMessage("Exported all pp_* keys.");
  };

  const trialStatusText = useMemo(() => {
    if (!snapshot) {
      return "--";
    }
    if (!snapshot.trial.hasStarted) {
      return "Not started";
    }
    if (snapshot.trial.isExpired) {
      return "Expired";
    }
    return `${snapshot.trial.daysRemaining} days left`;
  }, [snapshot]);

  if (!isUnlocked) {
    return (
      <section className="mx-auto w-full max-w-md">
        <div className={`${THEME.surfaces.card} p-5`}>
          <h1 className="text-2xl font-extrabold text-white">Debug Panel</h1>
          <p className="mt-1 text-sm text-slate-300">Parent PIN required.</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={unlockPin}
            onChange={(event) => setUnlockPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Enter 4-digit PIN"
            className="mt-3 w-full rounded-lg border border-slate-200/20 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-slate-100/40"
          />
          {unlockError ? <p className="mt-2 text-sm text-amber-200">{unlockError}</p> : null}
          <button type="button" onClick={unlockPanel} className={`${arcade.primaryButton} mt-3 w-full`}>
            Unlock Debug Panel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 pb-6">
      <header className={`${THEME.surfaces.card} p-4`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Admin</p>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Debug Panel</h1>
        <p className="mt-1 text-sm text-slate-300">System health and demo reset tools (local-only).</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className={`${THEME.surfaces.card} p-4`}>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Trial</h2>
          <p className="mt-2 text-sm text-slate-300">Started: {snapshot?.trial.hasStarted ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-300">Status: {trialStatusText}</p>
        </article>

        <article className={`${THEME.surfaces.card} p-4`}>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Timer</h2>
          <p className="mt-2 text-sm text-slate-300">Enabled: {snapshot?.timer.enabled ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-300">Limit: {snapshot?.timer.limitMinutes ?? 0} min</p>
          <p className="text-sm text-slate-300">Used: {formatDuration(snapshot?.timer.usedSeconds ?? 0)}</p>
          <p className="text-sm text-slate-300">Remaining: {formatDuration(snapshot?.timer.remainingSeconds ?? 0)}</p>
        </article>

        <article className={`${THEME.surfaces.card} p-4`}>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Stars</h2>
          <p className="mt-2 text-sm text-slate-300">Total: {snapshot?.stars.total ?? 0}</p>
          <p className="text-sm text-slate-300">Streak: {snapshot?.stars.streak ?? 0}</p>
          <p className="text-sm text-slate-300">Last play: {snapshot?.stars.lastPlayDate ?? "--"}</p>
        </article>

        <article className={`${THEME.surfaces.card} p-4`}>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Unlocks</h2>
          <p className="mt-2 text-sm text-slate-300">Rocket skin level: {snapshot?.unlocks.rocketSkinLevel ?? 1}</p>
          <p className="text-sm text-slate-300">
            Memory normal unlocked: {snapshot?.unlocks.memoryHardUnlocked ? "Yes" : "No"}
          </p>
          <p className="text-sm text-slate-300">
            Challenger badge: {snapshot?.unlocks.challengeBadgeUnlocked ? "Yes" : "No"}
          </p>
        </article>

        <article className={`${THEME.surfaces.card} p-4 md:col-span-2`}>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">Metrics</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <p className="text-sm text-slate-300">Sessions: {snapshot?.metrics.sessions ?? 0}</p>
            <p className="text-sm text-slate-300">Launches: {snapshot?.metrics.totalLaunches ?? 0}</p>
            <p className="text-sm text-slate-300">
              Play time: {formatDuration(snapshot?.metrics.totalPlaySeconds ?? 0)}
            </p>
          </div>
        </article>
      </section>

      <section className={`${THEME.surfaces.card} space-y-3 p-4`}>
        <h2 className="text-lg font-black text-slate-100">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openConfirmModal("reset_trial")} className={arcade.secondaryButton}>
            Reset Trial
          </button>
          <button type="button" onClick={() => openConfirmModal("reset_timer")} className={arcade.secondaryButton}>
            Reset Timer Today
          </button>
          <button type="button" onClick={() => openConfirmModal("reset_progress")} className={arcade.secondaryButton}>
            Reset Progress
          </button>
          <button type="button" onClick={() => openConfirmModal("reset_metrics")} className={arcade.secondaryButton}>
            Reset Metrics
          </button>
          <button type="button" onClick={() => openConfirmModal("reset_everything")} className={arcade.dangerButton}>
            Reset EVERYTHING
          </button>
          <button type="button" onClick={exportJson} className={arcade.primaryButton}>
            Export pp_* JSON
          </button>
        </div>
      </section>

      <section className={`${THEME.surfaces.card} space-y-3 p-4`}>
        <h2 className="text-lg font-black text-slate-100">Import (Optional)</h2>
        <p className="text-sm text-slate-300">Paste a JSON object with `pp_*` keys.</p>
        <textarea
          value={importInput}
          onChange={(event) => setImportInput(event.target.value)}
          rows={6}
          placeholder='{"pp_stars_total":"12","pp_metrics_global":{"sessions":1}}'
          className="w-full rounded-xl border border-slate-200/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-100/40"
        />
        <button type="button" onClick={() => openConfirmModal("import_json")} className={arcade.secondaryButton}>
          Import JSON (PIN)
        </button>
      </section>

      {message ? (
        <p className="rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {confirmModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold text-white">Confirm Parent PIN</h2>
            <p className="mt-1 text-sm text-slate-300">Required to run this debug action.</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              className="mt-3 w-full rounded-lg border border-white/20 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-white/40"
            />
            {confirmError ? <p className="mt-2 text-sm text-amber-200">{confirmError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={applyAction} className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmModalOpen(false);
                  setConfirmPin("");
                  setConfirmError(null);
                }}
                className="rounded-lg border border-white/20 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

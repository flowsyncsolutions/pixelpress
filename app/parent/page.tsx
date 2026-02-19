"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addExtraMinutes,
  getTimeState,
  loadTimeSettings,
  resetIfNewDay,
  resetTodayUsage,
  setTimeSettings,
} from "@/src/lib/timeLimit";
import {
  getTrialStatus,
  isTrialOverrideUnlocked,
  resetTrial,
  setTrialOverrideUnlocked,
} from "@/src/lib/trial";

const PIN_KEY = "pp_pin";
const EXIT_PIN_KEY = "pp_exit_requires_pin";

type Message = {
  type: "success" | "error";
  text: string;
};

type PinAction =
  | "save_time_settings"
  | "reset_today"
  | "add_extra_time"
  | "reset_trial"
  | "set_trial_override";

const LIMIT_OPTIONS = [5, 10, 15, 30, 60] as const;

export default function ParentPage() {
  const [pinInput, setPinInput] = useState("");
  const [pinSet, setPinSet] = useState(false);

  const [timeEnabledDraft, setTimeEnabledDraft] = useState(false);
  const [timeLimitMinutesDraft, setTimeLimitMinutesDraft] = useState<number>(30);
  const [timeUsedTodaySeconds, setTimeUsedTodaySeconds] = useState(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);

  const [trialOverrideEnabled, setTrialOverrideEnabled] = useState(false);
  const [pendingTrialOverride, setPendingTrialOverride] = useState(false);
  const [trialHasStarted, setTrialHasStarted] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(14);

  const [message, setMessage] = useState<Message | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalInput, setPinModalInput] = useState("");
  const [pinModalMessage, setPinModalMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PinAction>("save_time_settings");

  const refreshTimeSummary = useCallback(() => {
    resetIfNewDay();
    const timeState = getTimeState();
    setTimeUsedTodaySeconds(timeState.usedSeconds);
    setTimeRemainingSeconds(timeState.remainingSeconds);
  }, []);

  const refreshTimeSettingsDraft = useCallback(() => {
    const settings = loadTimeSettings();
    setTimeEnabledDraft(settings.enabled);
    setTimeLimitMinutesDraft(settings.limitMinutes);
  }, []);

  const refreshTrialSummary = useCallback(() => {
    const trial = getTrialStatus();
    setTrialHasStarted(trial.hasStarted);
    setTrialExpired(trial.isExpired);
    setTrialDaysRemaining(trial.daysRemaining);
    setTrialOverrideEnabled(isTrialOverrideUnlocked());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existingPin = window.localStorage.getItem(PIN_KEY);
    setPinSet(Boolean(existingPin && /^\d{4}$/.test(existingPin)));

    // Exit should not be PIN-gated in this phase.
    window.localStorage.setItem(EXIT_PIN_KEY, "false");

    const syncParentView = () => {
      refreshTimeSettingsDraft();
      refreshTimeSummary();
      refreshTrialSummary();
    };

    syncParentView();
    const intervalId = window.setInterval(syncParentView, 1000);
    window.addEventListener("storage", syncParentView);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", syncParentView);
    };
  }, [refreshTimeSettingsDraft, refreshTimeSummary, refreshTrialSummary]);

  const savePin = () => {
    if (!/^\d{4}$/.test(pinInput)) {
      setMessage({ type: "error", text: "PIN must be exactly 4 digits." });
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PIN_KEY, pinInput);
    setPinSet(true);
    setPinInput("");
    setMessage({ type: "success", text: "PIN saved." });
  };

  const openPinModalForAction = (action: PinAction) => {
    if (!pinSet) {
      setMessage({ type: "error", text: "Set a PIN first to change parent settings." });
      return;
    }
    setPendingAction(action);
    setPinModalInput("");
    setPinModalMessage(null);
    setPinModalOpen(true);
  };

  const applyPendingAction = () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPin = window.localStorage.getItem(PIN_KEY);
    if (!storedPin || !/^\d{4}$/.test(storedPin)) {
      setPinModalMessage("Set a PIN first.");
      return;
    }

    if (pinModalInput !== storedPin) {
      setPinModalMessage("Incorrect PIN.");
      return;
    }

    if (pendingAction === "save_time_settings") {
      setTimeSettings(timeEnabledDraft, timeLimitMinutesDraft);
      setMessage({ type: "success", text: "Time settings updated." });
    } else if (pendingAction === "reset_today") {
      resetTodayUsage();
      setMessage({ type: "success", text: "Today’s usage reset." });
    } else if (pendingAction === "add_extra_time") {
      addExtraMinutes(10);
      setMessage({ type: "success", text: "Added 10 more minutes for today." });
    } else if (pendingAction === "reset_trial") {
      resetTrial();
      setMessage({ type: "success", text: "Trial reset. It will restart on next /play visit." });
    } else if (pendingAction === "set_trial_override") {
      setTrialOverrideUnlocked(pendingTrialOverride);
      setTrialOverrideEnabled(pendingTrialOverride);
      setMessage({ type: "success", text: "Trial override updated." });
    }

    refreshTimeSettingsDraft();
    refreshTimeSummary();
    refreshTrialSummary();
    setPinModalOpen(false);
    setPinModalInput("");
    setPinModalMessage(null);
  };

  const usedMinutesLabel = useMemo(() => Math.floor(timeUsedTodaySeconds / 60), [timeUsedTodaySeconds]);
  const remainingMinutesLabel = useMemo(
    () => Math.ceil(timeRemainingSeconds / 60),
    [timeRemainingSeconds],
  );

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Parent Mode</h1>
        <p className="text-zinc-400">Time controls are local to this device and protected by PIN.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Parent PIN</h2>
        <p className="text-sm text-zinc-400">{pinSet ? "PIN is set." : "Set a 4-digit PIN to manage settings."}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, "");
              setPinInput(digitsOnly.slice(0, 4));
            }}
            placeholder="4-digit PIN"
            className="w-full rounded-lg border border-white/20 bg-black px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-white/40"
          />
          <button
            type="button"
            onClick={savePin}
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Save PIN
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Time Limit</h2>
          <p className="text-sm text-zinc-400">Changes to time settings require parent PIN confirmation.</p>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-zinc-200">Enable daily time limit</span>
          <input
            type="checkbox"
            checked={timeEnabledDraft}
            onChange={(event) => {
              const checked = event.target.checked;
              if (checked && !pinSet) {
                setMessage({ type: "error", text: "Set a PIN before enabling the time limit." });
                return;
              }
              setTimeEnabledDraft(checked);
            }}
            className="h-5 w-5 accent-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-zinc-200">Daily limit</span>
          <select
            value={timeLimitMinutesDraft}
            onChange={(event) => setTimeLimitMinutesDraft(Number(event.target.value))}
            className="w-full rounded-lg border border-white/20 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-white/40"
          >
            {LIMIT_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 rounded-lg border border-white/10 px-4 py-3 sm:grid-cols-2">
          <p className="text-sm text-zinc-200">Time used today: {usedMinutesLabel} min</p>
          <p className="text-sm text-zinc-200">Time remaining: {remainingMinutesLabel} min</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => openPinModalForAction("save_time_settings")}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Save Time Settings
          </button>
          <button
            type="button"
            onClick={() => openPinModalForAction("reset_today")}
            className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Reset Today
          </button>
          <button
            type="button"
            onClick={() => openPinModalForAction("add_extra_time")}
            className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
          >
            Add Extra 10 Minutes
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Trial Controls (Testing)</h2>
          <p className="text-sm text-zinc-400">All trial changes require PIN confirmation.</p>
        </div>

        <div className="rounded-lg border border-white/10 px-4 py-3">
          <p className="text-sm text-zinc-200">
            Trial status:{" "}
            {trialHasStarted ? (trialExpired ? "Expired" : `Active (${trialDaysRemaining} days left)`) : "Not started"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => openPinModalForAction("reset_trial")}
            className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20"
          >
            Reset Trial
          </button>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-zinc-200">Force Unlock (testing)</span>
          <input
            type="checkbox"
            checked={trialOverrideEnabled}
            onChange={(event) => {
              setPendingTrialOverride(event.target.checked);
              openPinModalForAction("set_trial_override");
            }}
            className="h-5 w-5 accent-white"
          />
        </label>
      </div>

      {message ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {pinModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold text-white">Parent PIN Required</h2>
            <p className="mt-1 text-sm text-slate-300">Confirm your PIN to apply this change.</p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinModalInput}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, "");
                setPinModalInput(digitsOnly.slice(0, 4));
              }}
              placeholder="Enter 4-digit PIN"
              className="mt-3 w-full rounded-lg border border-white/20 bg-black px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-white/40"
            />

            {pinModalMessage ? <p className="mt-2 text-sm text-amber-200">{pinModalMessage}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={applyPendingAction}
                className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinModalOpen(false);
                  setPinModalInput("");
                  setPinModalMessage(null);
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

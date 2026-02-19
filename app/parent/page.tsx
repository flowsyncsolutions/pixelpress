"use client";

import { useEffect, useState } from "react";

const PIN_KEY = "pp_pin";
const EXIT_PIN_KEY = "pp_exit_requires_pin";
const SOUND_KEY = "pp_sound";
const TIME_LIMIT_KEY = "pp_time_limit_enabled";
const UNLOCKED_KEY = "pp_unlocked";

type Message = {
  type: "success" | "error";
  text: string;
};

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) {
    return fallback;
  }
  return value === "true";
}

export default function ParentPage() {
  const [pinInput, setPinInput] = useState("");
  const [pinSet, setPinSet] = useState(false);
  const [exitRequiresPin, setExitRequiresPin] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [unlockedTesting, setUnlockedTesting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existingPin = window.localStorage.getItem(PIN_KEY);
    setPinSet(Boolean(existingPin && /^\d{4}$/.test(existingPin)));
    setExitRequiresPin(parseBoolean(window.localStorage.getItem(EXIT_PIN_KEY), true));
    setSoundEnabled(parseBoolean(window.localStorage.getItem(SOUND_KEY), true));
    setTimeLimitEnabled(parseBoolean(window.localStorage.getItem(TIME_LIMIT_KEY), false));
    setUnlockedTesting(parseBoolean(window.localStorage.getItem(UNLOCKED_KEY), false));
  }, []);

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

  const updateToggle = (key: string, value: boolean, label: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, String(value));
    setMessage({ type: "success", text: `${label} updated.` });
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Parent Mode</h1>
        <p className="text-zinc-400">
          Controls for a kid-safe session. Settings are stored on this device.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Exit PIN</h2>
        <p className="text-sm text-zinc-400">
          {pinSet ? "A PIN is currently set." : "No PIN set yet."}
        </p>
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

      <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
        <h2 className="text-lg font-semibold text-white">Settings</h2>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-zinc-200">Require PIN to exit games</span>
          <input
            type="checkbox"
            checked={exitRequiresPin}
            onChange={(event) => {
              const checked = event.target.checked;
              setExitRequiresPin(checked);
              updateToggle(EXIT_PIN_KEY, checked, "Exit PIN rule");
            }}
            className="h-5 w-5 accent-white"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-zinc-200">Sound enabled</span>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(event) => {
              const checked = event.target.checked;
              setSoundEnabled(checked);
              updateToggle(SOUND_KEY, checked, "Sound");
            }}
            className="h-5 w-5 accent-white"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-zinc-200">Enable session time limit (UI only)</span>
          <input
            type="checkbox"
            checked={timeLimitEnabled}
            onChange={(event) => {
              const checked = event.target.checked;
              setTimeLimitEnabled(checked);
              updateToggle(TIME_LIMIT_KEY, checked, "Time limit");
            }}
            className="h-5 w-5 accent-white"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-zinc-200">Unlocked (testing)</span>
          <input
            type="checkbox"
            checked={unlockedTesting}
            onChange={(event) => {
              const checked = event.target.checked;
              setUnlockedTesting(checked);
              updateToggle(UNLOCKED_KEY, checked, "Testing unlock");
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
    </section>
  );
}

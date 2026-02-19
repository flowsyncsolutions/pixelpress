"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { addExtraMinutes, getTimeState } from "@/src/lib/timeLimit";

type TimeUpOverlayProps = {
  fixed?: boolean;
  backHref?: string;
  onResume?: () => void;
};

export default function TimeUpOverlay({
  fixed = false,
  backHref = "/play",
  onResume,
}: TimeUpOverlayProps) {
  const [pinOpen, setPinOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTimeUp = () => {
      const state = getTimeState();
      setIsTimeUp(state.enabled && state.remainingSeconds <= 0);
    };

    syncTimeUp();
    const intervalId = window.setInterval(syncTimeUp, 1000);
    window.addEventListener("storage", syncTimeUp);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", syncTimeUp);
    };
  }, []);

  const handleAddTime = () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPin = window.localStorage.getItem("pp_pin");
    if (!storedPin || !/^\d{4}$/.test(storedPin)) {
      setMessage("Set a PIN in Parent Mode first.");
      return;
    }

    if (pinInput !== storedPin) {
      setMessage("Incorrect PIN.");
      return;
    }

    addExtraMinutes(10);
    setPinOpen(false);
    setPinInput("");
    setMessage(null);
    setIsTimeUp(false);
    onResume?.();
  };

  if (!isTimeUp) {
    return null;
  }

  return (
    <div
      className={`z-[90] flex items-center justify-center bg-slate-950/88 p-4 backdrop-blur-sm ${
        fixed ? "fixed inset-0" : "absolute inset-0"
      }`}
    >
      <div className={`${arcade.gameFrame} w-full max-w-md`}>
        <h2 className={`text-2xl font-black ${arcade.glowText}`}>Time&apos;s up</h2>
        <p className={`mt-2 text-sm ${arcade.subtleText}`}>Ask a parent for more time.</p>

        {!pinOpen ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={backHref} className={`${arcade.secondaryButton} flex-1 text-center`}>
              Back to Games
            </Link>
            <button type="button" onClick={() => setPinOpen(true)} className={`${arcade.primaryButton} flex-1`}>
              Parent Add Time
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-slate-200">Enter parent PIN to add 10 more minutes.</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, "");
                setPinInput(digitsOnly.slice(0, 4));
              }}
              className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-violet-300/60"
              placeholder="Enter 4-digit PIN"
            />

            {message ? <p className="text-sm text-amber-100">{message}</p> : null}

            <div className="flex gap-2">
              <button type="button" onClick={handleAddTime} className={`${arcade.primaryButton} flex-1`}>
                Add 10 Minutes
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinOpen(false);
                  setPinInput("");
                  setMessage(null);
                }}
                className={`${arcade.secondaryButton} flex-1`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

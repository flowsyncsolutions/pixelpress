"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { getTrialStatus, isTrialOverrideUnlocked, startTrial } from "@/src/lib/trial";

type TrialSnapshot = {
  isExpired: boolean;
  daysRemaining: number;
  hasStarted: boolean;
};

export default function PlaySoftGate() {
  const [blocked, setBlocked] = useState(false);
  const [trial, setTrial] = useState<TrialSnapshot>({
    isExpired: false,
    daysRemaining: 14,
    hasStarted: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncGate = () => {
      startTrial();
      const status = getTrialStatus();
      const overrideUnlocked = isTrialOverrideUnlocked();
      setTrial({
        isExpired: status.isExpired,
        daysRemaining: status.daysRemaining,
        hasStarted: status.hasStarted,
      });
      setBlocked(status.isExpired && !overrideUnlocked);
    };

    syncGate();
    const intervalId = window.setInterval(syncGate, 1000);

    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === "pp_trial_started_at" ||
        event.key === "pp_trial_days" ||
        event.key === "pp_trial_override_unlocked"
      ) {
        syncGate();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!blocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className={`${arcade.gameFrame} w-full max-w-md`}>
        <h2 className={`text-2xl font-black ${arcade.glowText}`}>Your trial has ended</h2>
        <p className={`mt-2 text-sm ${arcade.subtleText}`}>PixelPress is ad-free and parent-supported.</p>
        {trial.hasStarted ? (
          <p className="mt-2 text-xs text-slate-400">
            Trial days remaining: {trial.daysRemaining}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled
            className={`${arcade.primaryButton} flex-1 cursor-not-allowed opacity-80`}
          >
            Join for $3.99/month (Coming Soon)
          </button>
          <Link href="/parent" className={`${arcade.secondaryButton} flex-1 text-center`}>
            Parent Mode
          </Link>
        </div>
      </div>
    </div>
  );
}

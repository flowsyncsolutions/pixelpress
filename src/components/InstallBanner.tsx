"use client";

import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { safeGet, safeSet } from "@/src/lib/storageGuard";
import { usePwaInstall } from "@/src/lib/usePwaInstall";

const DISMISSED_KEY = "pp_install_dismissed";

type InstallBannerProps = {
  showWhenDismissed?: boolean;
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 12v7h14v-7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 3h10a2 2 0 0 1 2 2v4" />
      <path d="M7 7h8" />
      <path d="M14 14h7" />
      <path d="M17.5 10.5v7" />
      <rect x="3" y="11" width="10" height="10" rx="2" />
    </svg>
  );
}

export default function InstallBanner({ showWhenDismissed = false }: InstallBannerProps) {
  const { isInstalled, isIosSafari, canPromptInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [pendingInstall, setPendingInstall] = useState(false);

  useEffect(() => {
    setDismissed(safeGet(DISMISSED_KEY, "false") === "true");
  }, []);

  const dismiss = () => {
    safeSet(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (isInstalled) {
    return null;
  }

  if (!showWhenDismissed && dismissed) {
    return null;
  }

  if (!canPromptInstall && !isIosSafari) {
    return null;
  }

  const handleInstall = async () => {
    if (pendingInstall) {
      return;
    }
    setPendingInstall(true);
    try {
      await promptInstall();
    } finally {
      setPendingInstall(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/20 bg-slate-950/94 p-4 shadow-[0_16px_34px_rgba(2,6,23,0.58)] backdrop-blur">
        {canPromptInstall ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-white">Install PixelPress as an app</p>
              <p className="text-xs text-slate-300">Faster launch and full-screen play.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleInstall}
                disabled={pendingInstall}
                className={`${arcade.primaryButton} min-w-[100px]`}
              >
                {pendingInstall ? "Opening..." : "Install"}
              </button>
              <button type="button" onClick={dismiss} className={arcade.secondaryButton}>
                Not now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-white">Install PixelPress</p>
              <p className="text-xs text-slate-300">Add it to your Home Screen on iPhone.</p>
            </div>
            <div className="grid gap-2 text-sm text-slate-100 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/15 bg-slate-900/80 px-3 py-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/20 bg-slate-800 text-cyan-200">
                  <ShareIcon />
                </span>
                <span>Step 1: Tap Share</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/15 bg-slate-900/80 px-3 py-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/20 bg-slate-800 text-emerald-200">
                  <HomeIcon />
                </span>
                <span>Step 2: Add to Home Screen</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={dismiss} className={arcade.primaryButton}>
                Got it
              </button>
              <button type="button" onClick={dismiss} className={arcade.secondaryButton}>
                Not now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { markInstalled, snoozeInstallNudge } from "@/src/lib/installNudge";
import { usePwaInstall } from "@/src/lib/usePwaInstall";

type InstallNudgeProps = {
  onDone?: () => void;
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 12v7h14v-7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8.5 12 3l8 5.5" />
      <path d="M6.5 10.5V20h11v-9.5" />
      <path d="M10 20v-5h4v5" />
      <path d="M18 5.5v5.5h5.5" />
    </svg>
  );
}

export default function InstallNudge({ onDone }: InstallNudgeProps) {
  const { isInstalled, isIosSafari, canPromptInstall, promptInstall, platform } = usePwaInstall();
  const [step, setStep] = useState<1 | 2>(1);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!isInstalled) {
      return;
    }
    markInstalled();
    onDone?.();
  }, [isInstalled, onDone]);

  const closeWithSnooze = (days: number) => {
    snoozeInstallNudge(days);
    onDone?.();
  };

  const handleInstall = async () => {
    if (!canPromptInstall || isInstalling) {
      return;
    }
    setIsInstalling(true);
    try {
      await promptInstall();
      snoozeInstallNudge(3);
      onDone?.();
    } finally {
      setIsInstalling(false);
    }
  };

  const showAndroid = platform === "android" && canPromptInstall;
  const showIos = platform === "ios" && isIosSafari;

  if (!showAndroid && !showIos) {
    return null;
  }

  return (
    <>
      {showIos && step === 1 ? (
        <div className="pointer-events-none fixed inset-x-5 bottom-0 z-30 h-14 rounded-t-2xl border-2 border-cyan-300/60 bg-cyan-300/12 shadow-[0_0_20px_rgba(34,211,238,0.28)] animate-pulse" />
      ) : null}

      <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-4">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200/20 bg-slate-950/95 p-4 shadow-[0_18px_36px_rgba(2,6,23,0.6)] backdrop-blur">
          {showAndroid ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-white">Install PixelPress</p>
                <p className="text-xs text-slate-300">Add PixelPress to your device for a better app-like experience.</p>
              </div>

              <ul className="space-y-1 text-sm text-slate-100">
                <li>• Full-screen play</li>
                <li>• Offline support</li>
                <li>• Faster access</li>
              </ul>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleInstall} disabled={isInstalling} className={arcade.primaryButton}>
                  {isInstalling ? "Opening..." : "Install"}
                </button>
                <button type="button" onClick={() => closeWithSnooze(3)} className={arcade.secondaryButton}>
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-white">Install PixelPress</p>
                <p className="text-xs text-slate-300">Quick setup on iPhone with two steps.</p>
              </div>

              <div className="relative min-h-[104px] overflow-hidden rounded-xl border border-slate-200/15 bg-slate-900/80 p-3">
                <div
                  key={`step-${step}`}
                  className="pp-install-step flex items-center gap-3"
                >
                  {step === 1 ? (
                    <>
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/45 bg-cyan-300/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.34)] animate-pulse">
                        <ShareIcon />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">Step 1: Tap Share</p>
                        <p className="text-xs text-slate-300">Use the Share button in Safari&apos;s bottom bar.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200/45 bg-emerald-300/15 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                        <HomeIcon />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">Step 2: Add to Home Screen</p>
                        <p className="text-xs text-slate-300">Choose &quot;Add to Home Screen&quot;, then tap Add.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {step === 1 ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setStep(2)} className={arcade.primaryButton}>
                    I tapped Share
                  </button>
                  <button type="button" onClick={() => closeWithSnooze(3)} className={arcade.secondaryButton}>
                    Not now
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => closeWithSnooze(14)} className={arcade.primaryButton}>
                    Got it
                  </button>
                  <button type="button" onClick={() => closeWithSnooze(3)} className={arcade.secondaryButton}>
                    Not now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .pp-install-step {
          animation: pp-install-step-in 220ms ease-out;
        }

        @keyframes pp-install-step-in {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

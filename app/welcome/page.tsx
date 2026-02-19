"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { useInstallPrompt } from "@/src/lib/installPrompt";

const ONBOARDED_KEY = "pp_onboarded";
const INSTALL_DONE_KEY = "pp_install_done";

export default function WelcomePage() {
  const { canPromptInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [installDone, setInstallDone] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ONBOARDED_KEY, "true");
    const alreadyDone = window.localStorage.getItem(INSTALL_DONE_KEY) === "true";
    setInstallDone(alreadyDone || isStandalone);
  }, [isStandalone]);

  const markInstallStepComplete = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_DONE_KEY, "true");
      window.localStorage.setItem(ONBOARDED_KEY, "true");
    }

    setInstallDone(true);
    setInstallMessage("Install step marked complete.");
  };

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      markInstallStepComplete();
      setInstallMessage("PixelPress installed.");
      return;
    }

    setInstallMessage("Install prompt dismissed. You can still install later.");
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 pb-8 pt-2 sm:space-y-6">
      <header className="rounded-2xl border border-slate-200/15 bg-slate-900/90 p-5 shadow-[0_12px_32px_rgba(2,6,23,0.45)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Parent Setup</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Welcome to PixelPress</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Set up once in about a minute, then hand it to your kid with confidence.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/15 bg-slate-900/85 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Why parents choose PixelPress</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-200 sm:text-base">
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg">
              🛡️
            </span>
            <span>Ad-free, no weird stuff</span>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg">
              🕵️
            </span>
            <span>No tracking</span>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg">
              ⏱️
            </span>
            <span>Set playtime limits</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200/15 bg-slate-900/85 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Install PixelPress</h2>
          <span className={arcade.chip}>{installDone ? "Step complete" : "Recommended"}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/75 p-3">
            <p className="text-sm font-semibold text-white">iPhone</p>
            <p className="mt-1 text-sm text-slate-300">Safari → Share → Add to Home Screen</p>
          </div>
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/75 p-3">
            <p className="text-sm font-semibold text-white">Android</p>
            <p className="mt-1 text-sm text-slate-300">Chrome menu → Install app</p>
          </div>
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/75 p-3">
            <p className="text-sm font-semibold text-white">Desktop</p>
            <p className="mt-1 text-sm text-slate-300">Use the install icon in the address bar</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {canPromptInstall && !isStandalone ? (
            <button type="button" onClick={handleInstallClick} className={arcade.primaryButton}>
              Install App
            </button>
          ) : null}
          <button type="button" onClick={markInstallStepComplete} className={arcade.secondaryButton}>
            I installed it
          </button>
        </div>

        {isIOS ? (
          <p className="mt-3 text-sm text-slate-300">
            iOS note: the install prompt button is not available in Safari. Use the Share menu steps above.
          </p>
        ) : null}
        {installMessage ? <p className="mt-3 text-sm text-slate-200">{installMessage}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200/15 bg-slate-900/85 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Set a timer</h2>
        <p className="mt-2 text-sm text-slate-300">
          Add a daily time limit before play starts. You can always add extra minutes with your PIN.
        </p>
        <div className="mt-4">
          <Link href="/parent" className={arcade.secondaryButton}>
            Set a timer
          </Link>
        </div>
      </section>

      <div className="rounded-2xl border border-violet-200/20 bg-violet-400/10 p-5 text-center sm:p-6">
        <h2 className="text-xl font-bold text-white">All set?</h2>
        <p className="mt-2 text-sm text-slate-200">Open the game shelf and start exploring.</p>
        <div className="mt-4">
          <Link
            href="/play"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(ONBOARDED_KEY, "true");
              }
            }}
            className={arcade.primaryButton}
          >
            Start playing
          </Link>
        </div>
      </div>
    </section>
  );
}

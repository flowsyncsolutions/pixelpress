"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEME } from "@/src/lib/theme";

export default function ExitGate() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const goHome = () => {
    setIsOpen(false);
    setPinInput("");
    setMessage(null);
    router.push("/");
  };

  const handleExitClick = () => {
    if (typeof window === "undefined") {
      return;
    }

    const requiresPinRaw = window.localStorage.getItem("pp_exit_requires_pin");
    const requiresPin = requiresPinRaw === null ? true : requiresPinRaw === "true";

    if (!requiresPin) {
      goHome();
      return;
    }

    setMessage(null);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPin = window.localStorage.getItem("pp_pin");
    if (!storedPin || !/^\d{4}$/.test(storedPin)) {
      setMessage("Set a PIN in Parent Mode");
      return;
    }

    if (pinInput === storedPin) {
      goHome();
      return;
    }

    setMessage("Incorrect PIN");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExitClick}
        className={`fixed right-4 top-20 z-40 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_10px_22px_rgba(2,6,23,0.4)] transition focus-visible:outline-2 focus-visible:outline-offset-2 ${THEME.brandColors.secondaryButton}`}
      >
        Exit
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/70 p-4 pt-24">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200/20 bg-slate-900 p-4 shadow-[0_18px_36px_rgba(15,23,42,0.8)]">
            <h2 className="mb-3 text-base font-semibold text-white">Parent PIN</h2>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, "");
                setPinInput(digitsOnly.slice(0, 4));
              }}
              className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2.5 text-base text-white outline-none ring-0 placeholder:text-slate-500 focus:border-violet-300/60"
              placeholder="Enter 4-digit PIN"
            />

            {message ? <p className="mt-2 text-sm text-amber-100">{message}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${THEME.brandColors.primaryButton}`}
              >
                Confirm Exit
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setPinInput("");
                  setMessage(null);
                }}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

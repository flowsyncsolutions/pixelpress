"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        className="fixed right-4 top-20 z-40 rounded-lg border border-white/20 bg-black/80 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-zinc-900"
      >
        Exit
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-4 pt-24">
          <div className="w-full max-w-xs rounded-xl border border-white/15 bg-zinc-950 p-4">
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
              className="w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-base text-white outline-none ring-0 placeholder:text-zinc-500 focus:border-white/40"
              placeholder="Enter 4-digit PIN"
            />

            {message ? <p className="mt-2 text-sm text-amber-200">{message}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
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
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
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

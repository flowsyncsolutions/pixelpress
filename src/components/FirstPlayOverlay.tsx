"use client";

import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { safeGet, safeSet } from "@/src/lib/storageGuard";

type FirstPlayOverlayProps = {
  storageKey: string;
  text: string;
  title?: string;
  buttonLabel?: string;
};

export default function FirstPlayOverlay({
  storageKey,
  text,
  title = "How to Play",
  buttonLabel = "Let's Play",
}: FirstPlayOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (safeGet(storageKey, "false") !== "true") {
      setVisible(true);
    }
  }, [storageKey]);

  if (!visible) {
    return null;
  }

  const handleClose = () => {
    safeSet(storageKey, "true");
    setVisible(false);
  };

  return (
    <div
      className="absolute inset-0 z-[45] flex items-center justify-center bg-slate-950/72 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-100/20 bg-slate-900/92 p-4 shadow-[0_16px_32px_rgba(2,6,23,0.62)]">
        <h3 className={`text-xl font-black ${arcade.glowText}`}>{title}</h3>
        <p className={`mt-2 text-sm ${arcade.subtleText}`}>{text}</p>

        <button type="button" onClick={handleClose} className={`${arcade.primaryButton} mt-4 w-full`}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

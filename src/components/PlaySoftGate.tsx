"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { getPlaysCount, incrementPlay } from "@/src/lib/progress";

const UNLOCKED_KEY = "pp_unlocked";
const PLAY_LIMIT = 10;

type PlaySoftGateProps = {
  trackPlayVisit?: boolean;
  notNowHref?: string;
};

export default function PlaySoftGate({
  trackPlayVisit = false,
  notNowHref = "/play",
}: PlaySoftGateProps) {
  const [blocked, setBlocked] = useState(false);
  const [playsCount, setPlaysCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncGate = () => {
      const unlocked = window.localStorage.getItem(UNLOCKED_KEY) === "true";
      let plays = getPlaysCount();

      if (trackPlayVisit && !unlocked && plays < PLAY_LIMIT) {
        plays = incrementPlay();
      }

      setPlaysCount(plays);
      setBlocked(!unlocked && plays >= PLAY_LIMIT);
    };

    syncGate();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === UNLOCKED_KEY || event.key === "pp_plays_count") {
        syncGate();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [trackPlayVisit]);

  if (!blocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className={`${arcade.gameFrame} w-full max-w-md`}>
        <h2 className={`text-2xl font-black ${arcade.glowText}`}>Parent Unlock Required</h2>
        <p className={`mt-2 text-sm ${arcade.subtleText}`}>PixelPress is ad-free and parent-supported.</p>
        <p className="mt-2 text-xs text-slate-400">Free plays used: {playsCount}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/parent" className={`${arcade.primaryButton} flex-1 text-center`}>
            Go to Parent Mode
          </Link>
          <Link href={notNowHref} className={`${arcade.secondaryButton} flex-1 text-center`}>
            Not now
          </Link>
        </div>
      </div>
    </div>
  );
}

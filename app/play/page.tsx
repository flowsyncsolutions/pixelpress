"use client";

import { useEffect, useRef, useState } from "react";
import InstallNudge from "@/src/components/InstallNudge";
import GameBrowse from "@/src/components/GameBrowse";
import {
  markInstalled,
  shouldShowInstallNudge,
  recordInstallPromptShown,
} from "@/src/lib/installNudge";
import { metricsGetAll } from "@/src/lib/metrics";
import { getLastPlayDate, getStarsTotal, getStreak, getTodayKey } from "@/src/lib/progress";
import { usePwaInstall } from "@/src/lib/usePwaInstall";

export default function PlayPage() {
  const [showInstallNudge, setShowInstallNudge] = useState(false);
  const promptRecordedRef = useRef(false);
  const { isInstalled, platform, isIosSafari, canPromptInstall } = usePwaInstall();

  useEffect(() => {
    if (isInstalled) {
      markInstalled();
    }
  }, [isInstalled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncNudge = () => {
      const platformEligible =
        (platform === "ios" && isIosSafari) || (platform === "android" && canPromptInstall);

      if (!platformEligible) {
        setShowInstallNudge(false);
        return;
      }

      const hasPlayedToday = getLastPlayDate() === getTodayKey();
      const launches = metricsGetAll().global.totalGameLaunches;

      const shouldShow = shouldShowInstallNudge({
        isInstalled,
        stars: getStarsTotal(),
        streak: getStreak(),
        hasPlayedToday,
        totalGameLaunches: launches,
      });

      setShowInstallNudge(shouldShow);
    };

    syncNudge();
    const intervalId = window.setInterval(syncNudge, 5000);
    window.addEventListener("storage", syncNudge);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", syncNudge);
    };
  }, [canPromptInstall, isInstalled, isIosSafari, platform]);

  useEffect(() => {
    if (showInstallNudge && !promptRecordedRef.current) {
      recordInstallPromptShown();
      promptRecordedRef.current = true;
      return;
    }

    if (!showInstallNudge) {
      promptRecordedRef.current = false;
    }
  }, [showInstallNudge]);

  return (
    <>
      {showInstallNudge ? <InstallNudge onDone={() => setShowInstallNudge(false)} /> : null}
      <GameBrowse category="all" showDailyPicks />
    </>
  );
}

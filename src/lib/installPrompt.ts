"use client";

import { useCallback, useEffect, useState } from "react";

export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIOSDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsIOS(isIOSDevice());
    setIsStandalone(isStandaloneDisplayMode());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    const handleDisplayModeChange = () => {
      setIsStandalone(isStandaloneDisplayMode());
    };

    const displayModeMedia = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayModeMedia.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayModeMedia.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      setIsStandalone(true);
      return true;
    }

    return false;
  }, [deferredPrompt]);

  return {
    canPromptInstall: Boolean(deferredPrompt),
    isIOS,
    isStandalone,
    promptInstall,
  };
}

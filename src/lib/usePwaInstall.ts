"use client";

import { useCallback, useEffect, useState } from "react";

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function detectInstalled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function detectIosSafari(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0;

  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  if (!isIOS) {
    return false;
  }

  const isSafariToken = /Safari/i.test(ua);
  const blockedBrowsers =
    /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|UCBrowser|DuckDuckGo|GSA|Brave/i.test(ua);
  return isSafariToken && !blockedBrowsers;
}

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsInstalled(detectInstalled());
    setIsIosSafari(detectIosSafari());

    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const legacyDisplayModeQuery = displayModeQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleDisplayMode = () => {
      setIsInstalled(detectInstalled());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);
    if (typeof displayModeQuery.addEventListener === "function") {
      displayModeQuery.addEventListener("change", handleDisplayMode);
    } else if (typeof legacyDisplayModeQuery.addListener === "function") {
      legacyDisplayModeQuery.addListener(handleDisplayMode);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
      if (typeof displayModeQuery.removeEventListener === "function") {
        displayModeQuery.removeEventListener("change", handleDisplayMode);
      } else if (typeof legacyDisplayModeQuery.removeListener === "function") {
        legacyDisplayModeQuery.removeListener(handleDisplayMode);
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<void> => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setIsInstalled(detectInstalled());
    }
  }, [deferredPrompt]);

  return {
    isInstalled,
    isIosSafari,
    canPromptInstall: Boolean(deferredPrompt) && !isInstalled,
    promptInstall,
  };
}

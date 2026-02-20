"use client";

import type { TouchEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addStars, markPlayedToday } from "@/src/lib/progress";
import { safeGet, safeSet } from "@/src/lib/storageGuard";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";

type RoundState = "idle" | "waiting" | "ready" | "result";
type ResultType = "success" | "tooSoon" | null;

const BEST_KEY = "pp_reaction_best_ms";
const MIN_WAIT_MS = 1200;
const MAX_WAIT_MS = 3200;
const STAR_TARGET_MS = 350;
const SHAKE_MS = 380;
const CONFETTI_MS = 900;

function parseBest(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function randomWaitMs(): number {
  return MIN_WAIT_MS + Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS + 1));
}

type ReactionTapProps = {
  onComplete?: (payload?: { best?: number }) => void;
};

export default function ReactionTap({ onComplete }: ReactionTapProps) {
  const router = useRouter();

  const [roundState, setRoundState] = useState<RoundState>("idle");
  const [resultType, setResultType] = useState<ResultType>(null);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [earnedStar, setEarnedStar] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeCircle, setShakeCircle] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const roundStateRef = useRef<RoundState>("idle");
  const bestMsRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const waitTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const hasResolvedRoundRef = useRef(false);
  const hasAwardedRoundRef = useRef(false);

  const transitionRound = useCallback((nextState: RoundState) => {
    roundStateRef.current = nextState;
    setRoundState(nextState);
  }, []);

  const clearWaitTimer = useCallback(() => {
    if (waitTimerRef.current !== null) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  }, []);

  const clearShakeTimer = useCallback(() => {
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
  }, []);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const triggerShake = useCallback(() => {
    setShakeCircle(true);
    clearShakeTimer();
    shakeTimerRef.current = window.setTimeout(() => {
      setShakeCircle(false);
      shakeTimerRef.current = null;
    }, SHAKE_MS);
  }, [clearShakeTimer]);

  const saveBest = useCallback((nextBest: number) => {
    bestMsRef.current = nextBest;
    setBestMs(nextBest);
    safeSet(BEST_KEY, String(nextBest));
  }, []);

  const resetRoundTransientState = useCallback(() => {
    clearWaitTimer();
    clearShakeTimer();
    readyAtRef.current = null;
    hasResolvedRoundRef.current = false;
    hasAwardedRoundRef.current = false;
    setResultType(null);
    setReactionMs(null);
    setShakeCircle(false);
    setNewBest(false);
    setEarnedStar(false);
  }, [clearShakeTimer, clearWaitTimer]);

  const startRound = useCallback(() => {
    if (isTimeUp) {
      return;
    }

    resetRoundTransientState();
    clearConfettiTimer();
    setShowConfetti(false);
    transitionRound("waiting");

    waitTimerRef.current = window.setTimeout(() => {
      waitTimerRef.current = null;
      readyAtRef.current = Date.now();
      transitionRound("ready");
    }, randomWaitMs());
  }, [clearConfettiTimer, isTimeUp, resetRoundTransientState, transitionRound]);

  const resolveTooSoon = useCallback(() => {
    if (hasResolvedRoundRef.current) {
      return;
    }

    hasResolvedRoundRef.current = true;
    clearWaitTimer();
    readyAtRef.current = null;
    transitionRound("result");
    setResultType("tooSoon");
    setReactionMs(null);
    setNewBest(false);
    setEarnedStar(false);
    triggerShake();
  }, [clearWaitTimer, transitionRound, triggerShake]);

  const resolveSuccess = useCallback(() => {
    if (hasResolvedRoundRef.current) {
      return;
    }

    const startedAt = readyAtRef.current;
    if (startedAt === null) {
      return;
    }

    hasResolvedRoundRef.current = true;
    clearWaitTimer();
    readyAtRef.current = null;

    const measuredMs = Math.max(1, Date.now() - startedAt);
    transitionRound("result");
    setResultType("success");
    setReactionMs(measuredMs);
    onComplete?.({ best: measuredMs });

    const previousBest = bestMsRef.current;
    const isNewBest = previousBest === null || measuredMs < previousBest;
    setNewBest(isNewBest);
    if (isNewBest) {
      saveBest(measuredMs);
      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, CONFETTI_MS);
    }

    if (measuredMs < STAR_TARGET_MS && !hasAwardedRoundRef.current) {
      addStars(1);
      markPlayedToday();
      hasAwardedRoundRef.current = true;
      setEarnedStar(true);
    }
  }, [clearConfettiTimer, clearWaitTimer, onComplete, saveBest, transitionRound]);

  const handleTap = useCallback(() => {
    if (isTimeUp) {
      return;
    }

    const state = roundStateRef.current;
    if (state === "idle") {
      startRound();
      return;
    }
    if (state === "waiting") {
      resolveTooSoon();
      return;
    }
    if (state === "ready") {
      resolveSuccess();
      return;
    }
  }, [isTimeUp, resolveSuccess, resolveTooSoon, startRound]);

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (roundState === "waiting" || roundState === "ready") {
      event.preventDefault();
    }
  };

  const statusText = useMemo(() => {
    if (roundState === "waiting") {
      return "WAIT";
    }
    if (roundState === "ready") {
      return "TAP NOW";
    }
    if (roundState === "result" && resultType === "tooSoon") {
      return "Too Soon!";
    }
    if (roundState === "result" && newBest) {
      return "New Best!";
    }
    if (roundState === "result") {
      return "Result";
    }
    return "Wait → Tap";
  }, [newBest, resultType, roundState]);

  const statusTone =
    roundState === "ready"
      ? arcade.badgeLive
      : resultType === "tooSoon"
        ? arcade.badgeSoon
        : newBest
          ? arcade.badgeLive
          : "";

  const instruction = useMemo(() => {
    if (roundState === "waiting") {
      return "Wait for green...";
    }
    if (roundState === "ready") {
      return "TAP!";
    }
    if (roundState === "result") {
      if (resultType === "tooSoon") {
        return "Too soon! Tap Play Again.";
      }
      if (reactionMs !== null) {
        return `Reaction time: ${reactionMs}ms`;
      }
    }
    return "Wait for green, then tap as fast as you can.";
  }, [reactionMs, resultType, roundState]);

  const circleTone = useMemo(() => {
    if (roundState === "waiting") {
      return "bg-rose-500/75 border-rose-200/60 text-rose-50";
    }
    if (roundState === "ready") {
      return "bg-emerald-400/85 border-emerald-100/75 text-emerald-950";
    }
    if (resultType === "tooSoon") {
      return "bg-amber-400/80 border-amber-100/75 text-amber-950";
    }
    if (resultType === "success") {
      return "bg-violet-400/85 border-violet-100/75 text-violet-950";
    }
    return "bg-slate-800 border-slate-300/35 text-slate-100";
  }, [resultType, roundState]);

  useEffect(() => {
    const raw = safeGet(BEST_KEY, "");
    const parsed = parseBest(raw);
    if (raw && parsed === null) {
      safeSet(BEST_KEY, "");
    }
    bestMsRef.current = parsed;
    setBestMs(parsed);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncBestFromStorage = () => {
      const parsed = parseBest(safeGet(BEST_KEY, ""));
      bestMsRef.current = parsed;
      setBestMs(parsed);
    };

    window.addEventListener("storage", syncBestFromStorage);
    return () => {
      window.removeEventListener("storage", syncBestFromStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTimeState = () => {
      resetIfNewDay();
      const timeState = getTimeState();
      setIsTimeUp(timeState.enabled && timeState.remainingSeconds <= 0);
    };

    syncTimeState();
    const intervalId = window.setInterval(syncTimeState, 1000);
    window.addEventListener("storage", syncTimeState);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", syncTimeState);
    };
  }, []);

  useEffect(() => {
    if (!isTimeUp) {
      return;
    }

    resetRoundTransientState();
    clearConfettiTimer();
    setShowConfetti(false);
    transitionRound("idle");
  }, [clearConfettiTimer, isTimeUp, resetRoundTransientState, transitionRound]);

  useEffect(() => {
    if (isTimeUp || (roundState !== "waiting" && roundState !== "ready")) {
      return;
    }

    resetIfNewDay();
    return startSessionTick();
  }, [isTimeUp, roundState]);

  useEffect(() => {
    return () => {
      clearWaitTimer();
      clearShakeTimer();
      clearConfettiTimer();
    };
  }, [clearConfettiTimer, clearShakeTimer, clearWaitTimer]);

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow relative`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Reaction Tap</h2>
              <p className={`text-sm ${arcade.subtleText}`}>WAIT for green, then TAP fast.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusTone}`}>{statusText}</span>
              <span className={arcade.chip}>
                Best: <strong className="font-black text-cyan-100">{bestMs ? `${bestMs}ms` : "--"}</strong>
              </span>
              <span className={arcade.chip}>
                Earn a star under <strong className="font-black text-amber-200">{STAR_TARGET_MS}ms</strong>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={startRound} className={arcade.primaryButton}>
              Play Again
            </button>
            <span className={arcade.chip}>Tap the circle only</span>
          </div>
        </div>

        <div className={`${arcade.panel} relative mt-4`}>
          <ConfettiBurst active={showConfetti} className="rounded-2xl" />

          <div
            className="flex min-h-[350px] flex-col items-center justify-center gap-6 p-4 text-center sm:min-h-[420px]"
            onTouchMove={handleTouchMove}
            style={{
              touchAction:
                roundState === "waiting" || roundState === "ready" ? "none" : "manipulation",
            }}
          >
            <p className="text-base font-semibold text-slate-100 sm:text-lg">{instruction}</p>

            <button
              type="button"
              onClick={handleTap}
              disabled={isTimeUp}
              className={`relative flex h-[220px] w-[220px] items-center justify-center rounded-full border-4 text-xl font-black shadow-[0_18px_35px_rgba(2,6,23,0.5)] transition active:scale-[0.98] sm:h-[290px] sm:w-[290px] sm:text-2xl ${circleTone} ${
                roundState === "waiting" ? "pp-wait-pulse" : ""
              } ${roundState === "ready" ? "pp-ready-flash" : ""} ${shakeCircle ? "pp-shake" : ""}`}
              aria-label="Reaction button"
            >
              <span className="px-4">
                {roundState === "ready"
                  ? "TAP!"
                  : roundState === "waiting"
                    ? "WAIT"
                    : resultType === "tooSoon"
                      ? "TOO SOON"
                      : resultType === "success" && reactionMs !== null
                        ? `${reactionMs}ms`
                        : "START"}
              </span>
            </button>
          </div>

          {roundState === "result" ? (
            <GameEndOverlay
              title={resultType === "tooSoon" ? "Too soon!" : "Result"}
              subtitle={
                resultType === "tooSoon"
                  ? "Wait for green before you tap."
                  : newBest
                    ? "New best! Fast reaction."
                    : "Good run. Try to beat your best."
              }
              stats={[
                { label: "Reaction", value: reactionMs !== null ? `${reactionMs}ms` : "--" },
                { label: "Best", value: bestMs !== null ? `${bestMs}ms` : "--" },
                { label: "New Best", value: newBest ? "Yes" : "No" },
                {
                  label: "Star",
                  value:
                    resultType === "success"
                      ? earnedStar
                        ? `Earned (<${STAR_TARGET_MS}ms)`
                        : `Target ${STAR_TARGET_MS}ms`
                      : "--",
                },
              ]}
              onPrimary={startRound}
              onSecondary={() => router.push("/play")}
            />
          ) : null}
        </div>

        {isTimeUp ? <TimeUpOverlay backHref="/play" /> : null}
      </div>

      <style jsx>{`
        .pp-wait-pulse {
          animation: pp-wait-pulse 1.35s ease-in-out infinite;
        }

        .pp-ready-flash {
          animation: pp-ready-flash 0.3s ease-out infinite alternate;
        }

        .pp-shake {
          animation: pp-shake 320ms ease-in-out;
        }

        @keyframes pp-wait-pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 18px 35px rgba(2, 6, 23, 0.5);
          }
          50% {
            transform: scale(1.035);
            box-shadow: 0 24px 45px rgba(244, 63, 94, 0.24);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 18px 35px rgba(2, 6, 23, 0.5);
          }
        }

        @keyframes pp-ready-flash {
          0% {
            box-shadow:
              0 0 0 0 rgba(74, 222, 128, 0.42),
              0 18px 35px rgba(2, 6, 23, 0.5);
          }
          100% {
            box-shadow:
              0 0 0 16px rgba(74, 222, 128, 0.05),
              0 24px 44px rgba(16, 185, 129, 0.34);
          }
        }

        @keyframes pp-shake {
          0% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          50% {
            transform: translateX(10px);
          }
          75% {
            transform: translateX(-6px);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

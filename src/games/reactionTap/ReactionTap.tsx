"use client";

import type { TouchEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";

type RoundState = "idle" | "waiting" | "ready" | "result";
type ResultType = "success" | "tooSoon" | null;

const BEST_KEY = "pp_reaction_best_ms";
const MIN_WAIT_MS = 1200;
const MAX_WAIT_MS = 3200;

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

export default function ReactionTap() {
  const router = useRouter();

  const [roundState, setRoundState] = useState<RoundState>("idle");
  const [resultType, setResultType] = useState<ResultType>(null);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeCircle, setShakeCircle] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const waitTimerRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);

  const statusText =
    roundState === "waiting"
      ? "Wait"
      : roundState === "ready"
        ? "Tap!"
        : roundState === "result"
          ? "Result"
          : "Tap to start";

  const statusTone =
    roundState === "ready"
      ? arcade.badgeLive
      : resultType === "tooSoon"
        ? arcade.badgeSoon
        : resultType === "success"
          ? arcade.badgeLive
          : "";

  const instruction = useMemo(() => {
    if (roundState === "waiting") {
      return "Wait for green...";
    }
    if (roundState === "ready") {
      return "Tap now!";
    }
    if (roundState === "result") {
      if (resultType === "tooSoon") {
        return "Too soon! Wait for green.";
      }
      if (reactionMs !== null) {
        return `Reaction time: ${reactionMs}ms`;
      }
    }
    return "Tap start, then wait for green.";
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

  const startRound = useCallback(() => {
    clearWaitTimer();
    clearShakeTimer();

    setRoundState("waiting");
    setResultType(null);
    setReactionMs(null);
    setNewBest(false);
    setShakeCircle(false);
    readyAtRef.current = null;

    const waitMs = MIN_WAIT_MS + Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS + 1));
    waitTimerRef.current = window.setTimeout(() => {
      readyAtRef.current = Date.now();
      setRoundState("ready");
      waitTimerRef.current = null;
    }, waitMs);
  }, [clearShakeTimer, clearWaitTimer]);

  const saveBest = useCallback((nextBest: number) => {
    setBestMs(nextBest);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BEST_KEY, String(nextBest));
    }
  }, []);

  const handleTap = () => {
    if (isTimeUp) {
      return;
    }

    if (roundState === "idle") {
      startRound();
      return;
    }

    if (roundState === "waiting") {
      clearWaitTimer();
      setRoundState("result");
      setResultType("tooSoon");
      setReactionMs(null);
      setNewBest(false);
      setShakeCircle(true);
      clearShakeTimer();
      shakeTimerRef.current = window.setTimeout(() => {
        setShakeCircle(false);
        shakeTimerRef.current = null;
      }, 380);
      return;
    }

    if (roundState !== "ready") {
      return;
    }

    const startedAt = readyAtRef.current;
    if (!startedAt) {
      return;
    }

    const measuredMs = Math.max(1, Date.now() - startedAt);
    setReactionMs(measuredMs);
    setRoundState("result");
    setResultType("success");

    const isNewBest = bestMs === null || measuredMs < bestMs;
    setNewBest(isNewBest);
    if (isNewBest) {
      saveBest(measuredMs);
      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, 900);
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (roundState === "waiting" || roundState === "ready") {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setBestMs(parseBest(window.localStorage.getItem(BEST_KEY)));
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
              <p className={`text-sm ${arcade.subtleText}`}>Wait for green, then tap as fast as you can.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusTone}`}>{statusText}</span>
              <span className={arcade.chip}>
                Best: <strong className="font-black text-cyan-100">{bestMs ? `${bestMs}ms` : "--"}</strong>
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
                { label: "Status", value: resultType === "tooSoon" ? "Too soon" : "Valid tap" },
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
          animation: pp-wait-pulse 1.2s ease-in-out infinite;
        }

        .pp-ready-flash {
          animation: pp-ready-flash 0.45s ease-out infinite alternate;
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
            transform: scale(1.03);
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
              0 0 0 14px rgba(74, 222, 128, 0.04),
              0 22px 40px rgba(16, 185, 129, 0.35);
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

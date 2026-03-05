"use client";

import type { TouchEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addXP } from "@/src/lib/level";
import { safeGet, safeSet } from "@/src/lib/storageGuard";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";

type Difficulty = "easy" | "fast";
type GameState = "ready" | "playing" | "game_over";

type WhackAMoleProps = {
  onComplete?: (payload?: { best?: number }) => void;
};

const ROUND_SECONDS = 30;
const HOLE_COUNT = 9;
const CONFETTI_MS = 900;
const TICK_MS = 100;

const DIFFICULTY_META: Record<
  Difficulty,
  {
    moleVisibleMs: number;
    minGapMs: number;
    maxGapMs: number;
    label: string;
  }
> = {
  easy: {
    moleVisibleMs: 850,
    minGapMs: 200,
    maxGapMs: 520,
    label: "Easy",
  },
  fast: {
    moleVisibleMs: 520,
    minGapMs: 120,
    maxGapMs: 380,
    label: "Fast",
  },
};

function getBestKey(difficulty: Difficulty): string {
  return `pp_whack_best_${difficulty}`;
}

function readBestScore(difficulty: Difficulty): number {
  const raw = safeGet(getBestKey(difficulty), "0");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    safeSet(getBestKey(difficulty), "0");
    return 0;
  }
  const normalized = Math.floor(parsed);
  if (raw !== String(normalized)) {
    safeSet(getBestKey(difficulty), String(normalized));
  }
  return normalized;
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function randomInRange(min: number, max: number): number {
  return Math.floor(min + Math.random() * Math.max(0, max - min));
}

function pickNextHole(previous: number | null): number {
  if (HOLE_COUNT <= 1) {
    return 0;
  }

  let next = randomInt(HOLE_COUNT);
  if (previous !== null) {
    while (next === previous) {
      next = randomInt(HOLE_COUNT);
    }
  }
  return next;
}

export default function WhackAMole({ onComplete }: WhackAMoleProps) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [newBest, setNewBest] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const difficultyRef = useRef<Difficulty>(difficulty);
  const gameStateRef = useRef<GameState>(gameState);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);
  const activeHoleRef = useRef<number | null>(null);
  const roundEndsAtRef = useRef<number | null>(null);
  const hasFinishedRoundRef = useRef(false);
  const hasAwardedXpRef = useRef(false);

  const tickTimerRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const hideMoleTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);

  const difficultyMeta = DIFFICULTY_META[difficulty];

  const clearTickTimer = useCallback(() => {
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const clearMoleTimers = useCallback(() => {
    if (spawnTimerRef.current !== null) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (hideMoleTimerRef.current !== null) {
      window.clearTimeout(hideMoleTimerRef.current);
      hideMoleTimerRef.current = null;
    }
  }, []);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const resetRoundState = useCallback(() => {
    clearTickTimer();
    clearMoleTimers();
    clearConfettiTimer();

    activeHoleRef.current = null;
    roundEndsAtRef.current = null;
    hasFinishedRoundRef.current = false;
    hasAwardedXpRef.current = false;
    scoreRef.current = 0;

    setScore(0);
    setActiveHole(null);
    setTimeLeft(ROUND_SECONDS);
    setNewBest(false);
    setShowConfetti(false);
  }, [clearConfettiTimer, clearMoleTimers, clearTickTimer]);

  const scheduleNextMole = useCallback((delayMs?: number) => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    clearMoleTimers();
    const meta = DIFFICULTY_META[difficultyRef.current];
    const gapMs =
      typeof delayMs === "number"
        ? Math.max(0, Math.floor(delayMs))
        : randomInRange(meta.minGapMs, meta.maxGapMs);

    spawnTimerRef.current = window.setTimeout(() => {
      if (gameStateRef.current !== "playing") {
        return;
      }

      const nextHole = pickNextHole(activeHoleRef.current);
      activeHoleRef.current = nextHole;
      setActiveHole(nextHole);

      hideMoleTimerRef.current = window.setTimeout(() => {
        if (gameStateRef.current !== "playing") {
          return;
        }
        activeHoleRef.current = null;
        setActiveHole(null);
        scheduleNextMole();
      }, meta.moleVisibleMs);
    }, gapMs);
  }, [clearMoleTimers]);

  const finishRound = useCallback(() => {
    if (hasFinishedRoundRef.current) {
      return;
    }
    hasFinishedRoundRef.current = true;

    clearTickTimer();
    clearMoleTimers();
    activeHoleRef.current = null;
    setActiveHole(null);
    setTimeLeft(0);

    gameStateRef.current = "game_over";
    setGameState("game_over");

    const finalScore = scoreRef.current;
    if (!hasAwardedXpRef.current) {
      addXP(10);
      hasAwardedXpRef.current = true;
    }
    onComplete?.({ best: finalScore });

    const previousBest = bestScoreRef.current;
    const isNewBest = finalScore > previousBest;
    setNewBest(isNewBest);

    if (isNewBest) {
      bestScoreRef.current = finalScore;
      setBestScore(finalScore);
      safeSet(getBestKey(difficultyRef.current), String(finalScore));

      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, CONFETTI_MS);
    } else {
      setShowConfetti(false);
    }
  }, [clearConfettiTimer, clearMoleTimers, clearTickTimer, onComplete]);

  const startRound = useCallback(() => {
    if (isTimeUp) {
      return;
    }

    resetRoundState();
    gameStateRef.current = "playing";
    setGameState("playing");

    roundEndsAtRef.current = Date.now() + ROUND_SECONDS * 1000;

    tickTimerRef.current = window.setInterval(() => {
      const endsAt = roundEndsAtRef.current;
      if (endsAt === null) {
        return;
      }

      const remainingMs = Math.max(0, endsAt - Date.now());
      const nextTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(nextTimeLeft);

      if (remainingMs <= 0) {
        finishRound();
      }
    }, TICK_MS);

    scheduleNextMole(220);
  }, [finishRound, isTimeUp, resetRoundState, scheduleNextMole]);

  const handleHoleTap = useCallback((index: number) => {
    if (isTimeUp) {
      return;
    }

    if (gameStateRef.current === "ready") {
      startRound();
      return;
    }

    if (gameStateRef.current !== "playing") {
      return;
    }

    if (activeHoleRef.current !== index) {
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }

    activeHoleRef.current = null;
    setActiveHole(null);
    if (hideMoleTimerRef.current !== null) {
      window.clearTimeout(hideMoleTimerRef.current);
      hideMoleTimerRef.current = null;
    }

    scoreRef.current += 1;
    setScore(scoreRef.current);
    scheduleNextMole(95);
  }, [isTimeUp, scheduleNextMole, startRound]);

  const handleDifficultyChange = useCallback((nextDifficulty: Difficulty) => {
    if (gameStateRef.current === "playing") {
      return;
    }

    difficultyRef.current = nextDifficulty;
    setDifficulty(nextDifficulty);
    const storedBest = readBestScore(nextDifficulty);
    bestScoreRef.current = storedBest;
    setBestScore(storedBest);
    resetRoundState();
    gameStateRef.current = "ready";
    setGameState("ready");
  }, [resetRoundState]);

  const handlePlayAgain = useCallback(() => {
    startRound();
  }, [startRound]);

  const handleBack = useCallback(() => {
    router.push("/play");
  }, [router]);

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (gameState === "playing") {
      event.preventDefault();
    }
  };

  const statusText = useMemo(() => {
    if (gameState === "ready") {
      return "Tap a hole to start";
    }
    if (gameState === "game_over") {
      return newBest ? "New Best!" : "Round complete";
    }
    return "Whack the mole!";
  }, [gameState, newBest]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const storedBest = readBestScore(difficulty);
    bestScoreRef.current = storedBest;
    setBestScore(storedBest);
  }, [difficulty]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncBest = () => {
      const latest = readBestScore(difficultyRef.current);
      bestScoreRef.current = latest;
      setBestScore(latest);
    };

    window.addEventListener("storage", syncBest);
    return () => {
      window.removeEventListener("storage", syncBest);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTimeState = () => {
      resetIfNewDay();
      const state = getTimeState();
      setIsTimeUp(state.enabled && state.remainingSeconds <= 0);
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
    if (isTimeUp || gameState !== "playing") {
      return;
    }

    resetIfNewDay();
    return startSessionTick();
  }, [gameState, isTimeUp]);

  useEffect(() => {
    return () => {
      clearTickTimer();
      clearMoleTimers();
      clearConfettiTimer();
    };
  }, [clearConfettiTimer, clearMoleTimers, clearTickTimer]);

  return (
    <div className={arcade.pageWrap}>
      <TimeUpOverlay fixed backHref="/play" />
      <div className={`${arcade.gameFrame} relative`}>
        <ConfettiBurst active={showConfetti} />

        <div className={`${arcade.headerBar} mb-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${arcade.chip} ${newBest ? "border-emerald-200/50 bg-emerald-300/15 text-emerald-100" : ""}`}>
              Score: {score}
            </span>
            <span className={arcade.chip}>Time: {timeLeft}s</span>
            <span className={arcade.chip}>Best: {bestScore}</span>
            <span className={arcade.chip}>Mode: {difficultyMeta.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${arcade.secondaryButton} ${difficulty === "easy" ? "border-cyan-200/45 bg-cyan-300/18 text-cyan-100" : ""}`}
              onClick={() => handleDifficultyChange("easy")}
              disabled={gameState === "playing"}
            >
              Easy
            </button>
            <button
              type="button"
              className={`${arcade.secondaryButton} ${difficulty === "fast" ? "border-cyan-200/45 bg-cyan-300/18 text-cyan-100" : ""}`}
              onClick={() => handleDifficultyChange("fast")}
              disabled={gameState === "playing"}
            >
              Fast
            </button>
            <span className={`${arcade.chip} text-[11px]`}>{statusText}</span>
          </div>
        </div>

        <div
          className="relative rounded-2xl border border-slate-200/20 bg-slate-950/80 p-3"
          style={{ touchAction: gameState === "playing" ? "none" : "manipulation" }}
          onTouchMove={handleTouchMove}
        >
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: HOLE_COUNT }).map((_, index) => {
              const isActive = activeHole === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleHoleTap(index)}
                  className={`${arcade.tileButton} min-h-[86px] overflow-hidden border-slate-400/22 bg-slate-900/92 sm:min-h-[94px] ${isActive ? "border-emerald-200/60 shadow-[0_0_0_1px_rgba(74,222,128,0.35),0_0_22px_rgba(16,185,129,0.35)]" : ""}`}
                  aria-label={isActive ? "Mole up, tap now" : "Empty hole"}
                >
                  <span className="absolute inset-x-2 bottom-2 h-4 rounded-full bg-slate-950/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
                  {isActive ? (
                    <span className="relative z-10 text-4xl [text-shadow:0_0_14px_rgba(16,185,129,0.65)]">
                      🐹
                    </span>
                  ) : (
                    <span className="relative z-10 text-2xl text-slate-500/45">•</span>
                  )}
                </button>
              );
            })}
          </div>

          {gameState === "ready" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-slate-200/25 bg-slate-900/88 px-4 py-3 text-center shadow-[0_8px_20px_rgba(2,6,23,0.55)]">
                <p className="text-sm font-semibold text-cyan-100">Tap any hole to start</p>
                <p className="mt-1 text-xs text-slate-300">30 seconds. Whack as many moles as you can.</p>
              </div>
            </div>
          ) : null}

          {gameState === "game_over" ? (
            <GameEndOverlay
              title={newBest ? "New Best Score!" : "Time's up!"}
              subtitle="Play again and beat your score."
              stats={[
                { label: "Score", value: score },
                { label: "Best", value: bestScore },
                { label: "Mode", value: difficultyMeta.label },
              ]}
              onPrimary={handlePlayAgain}
              onSecondary={handleBack}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

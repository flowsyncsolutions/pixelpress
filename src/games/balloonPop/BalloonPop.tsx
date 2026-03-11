"use client";

import type { TouchEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import FirstPlayOverlay from "@/src/components/FirstPlayOverlay";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addXP } from "@/src/lib/level";
import { safeGet, safeSet } from "@/src/lib/storageGuard";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";

type GameState = "ready" | "playing" | "game_over";

type Balloon = {
  id: number;
  xBasePct: number;
  y: number;
  age: number;
  size: number;
  speed: number;
  swayAmplitude: number;
  swayFrequency: number;
  phase: number;
  special: boolean;
};

type BalloonPopProps = {
  onComplete?: (payload?: { best?: number }) => void;
};

const BEST_SCORE_KEY = "pp_balloon_pop_best_score";
const ROUND_SECONDS = 30;
const ROUND_MS = ROUND_SECONDS * 1000;
const MAX_BALLOONS = 6;
const SPECIAL_BALLOON_CHANCE = 0.12;
const ARENA_HEIGHT = 360;
const ARENA_MIN_WIDTH = 280;
const CONFETTI_MS = 900;
const DEFAULT_NEXT_SPAWN_MS = 450;
const MIN_SPAWN_MS = 260;
const MAX_SPAWN_MS = 860;
const FIRST_PLAY_KEY = "pp_seen_help_balloon_pop";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min);
}

function randomSpawnDelay(): number {
  return randomRange(MIN_SPAWN_MS, MAX_SPAWN_MS);
}

function readBestScore(): number {
  const raw = safeGet(BEST_SCORE_KEY, "0");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    safeSet(BEST_SCORE_KEY, "0");
    return 0;
  }
  const normalized = Math.floor(parsed);
  if (raw !== String(normalized)) {
    safeSet(BEST_SCORE_KEY, String(normalized));
  }
  return normalized;
}

function createBalloon(id: number): Balloon {
  const special = Math.random() < SPECIAL_BALLOON_CHANCE;
  const size = special ? randomRange(62, 74) : randomRange(50, 66);
  return {
    id,
    xBasePct: randomRange(12, 88),
    y: -size,
    age: 0,
    size,
    speed: special ? randomRange(64, 82) : randomRange(78, 108),
    swayAmplitude: randomRange(2.5, 6.5),
    swayFrequency: randomRange(1.2, 2.2),
    phase: randomRange(0, Math.PI * 2),
    special,
  };
}

export default function BalloonPop({ onComplete }: BalloonPopProps) {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [newBest, setNewBest] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const gameStateRef = useRef<GameState>("ready");
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);
  const balloonsRef = useRef<Balloon[]>([]);
  const lastFrameAtRef = useRef<number | null>(null);
  const roundEndsAtRef = useRef<number | null>(null);
  const spawnElapsedMsRef = useRef(0);
  const nextSpawnMsRef = useRef(DEFAULT_NEXT_SPAWN_MS);
  const balloonIdRef = useRef(0);
  const hasFinishedRoundRef = useRef(false);
  const hasAwardedXpRef = useRef(false);

  const rafRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameAtRef.current = null;
  }, []);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const resetRound = useCallback(() => {
    stopLoop();
    clearConfettiTimer();
    hasFinishedRoundRef.current = false;
    hasAwardedXpRef.current = false;
    roundEndsAtRef.current = null;
    spawnElapsedMsRef.current = 0;
    nextSpawnMsRef.current = DEFAULT_NEXT_SPAWN_MS;
    balloonsRef.current = [];
    scoreRef.current = 0;

    setBalloons([]);
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setNewBest(false);
    setShowConfetti(false);
  }, [clearConfettiTimer, stopLoop]);

  const syncBalloons = useCallback((next: Balloon[]) => {
    balloonsRef.current = next;
    setBalloons(next);
  }, []);

  const spawnBalloon = useCallback(() => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    const current = balloonsRef.current;
    if (current.length >= MAX_BALLOONS) {
      return;
    }

    const nextBalloon = createBalloon(balloonIdRef.current);
    balloonIdRef.current += 1;
    syncBalloons([...current, nextBalloon]);
  }, [syncBalloons]);

  const finishRound = useCallback(() => {
    if (hasFinishedRoundRef.current) {
      return;
    }
    hasFinishedRoundRef.current = true;

    stopLoop();
    setTimeLeft(0);
    gameStateRef.current = "game_over";
    setGameState("game_over");

    if (!hasAwardedXpRef.current) {
      addXP(10);
      hasAwardedXpRef.current = true;
    }

    const finalScore = scoreRef.current;
    onComplete?.({ best: finalScore });

    const previousBest = bestScoreRef.current;
    const isNewBest = finalScore > previousBest;
    setNewBest(isNewBest);

    if (isNewBest) {
      bestScoreRef.current = finalScore;
      setBestScore(finalScore);
      safeSet(BEST_SCORE_KEY, String(finalScore));

      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, CONFETTI_MS);
    } else {
      setShowConfetti(false);
    }
  }, [clearConfettiTimer, onComplete, stopLoop]);

  const updateFrame = useCallback(
    (frameNow: number) => {
      if (gameStateRef.current !== "playing") {
        return;
      }

      const previousFrameAt = lastFrameAtRef.current ?? frameNow;
      const deltaMs = Math.min(48, Math.max(0, frameNow - previousFrameAt));
      lastFrameAtRef.current = frameNow;

      const roundEndsAt = roundEndsAtRef.current;
      if (roundEndsAt !== null) {
        const remainingMs = Math.max(0, roundEndsAt - frameNow);
        const nextTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));
        setTimeLeft(nextTimeLeft);
        if (remainingMs <= 0) {
          finishRound();
          return;
        }
      }

      spawnElapsedMsRef.current += deltaMs;
      if (spawnElapsedMsRef.current >= nextSpawnMsRef.current) {
        spawnElapsedMsRef.current = 0;
        nextSpawnMsRef.current = randomSpawnDelay();
        spawnBalloon();
      }

      if (balloonsRef.current.length > 0) {
        const deltaSeconds = deltaMs / 1000;
        const nextBalloons: Balloon[] = [];
        for (const balloon of balloonsRef.current) {
          const nextAge = balloon.age + deltaSeconds;
          const nextY = balloon.y + balloon.speed * deltaSeconds;
          if (nextY - balloon.size > ARENA_HEIGHT + 10) {
            continue;
          }
          nextBalloons.push({
            ...balloon,
            age: nextAge,
            y: nextY,
          });
        }
        if (nextBalloons.length !== balloonsRef.current.length) {
          syncBalloons(nextBalloons);
        } else if (nextBalloons.length > 0) {
          balloonsRef.current = nextBalloons;
          setBalloons(nextBalloons);
        }
      }

      rafRef.current = window.requestAnimationFrame(updateFrame);
    },
    [finishRound, spawnBalloon, syncBalloons],
  );

  const startRound = useCallback(() => {
    if (isTimeUp) {
      return;
    }

    resetRound();
    gameStateRef.current = "playing";
    setGameState("playing");
    roundEndsAtRef.current = performance.now() + ROUND_MS;
    spawnElapsedMsRef.current = 0;
    nextSpawnMsRef.current = 140;
    spawnBalloon();
    rafRef.current = window.requestAnimationFrame(updateFrame);
  }, [isTimeUp, resetRound, spawnBalloon, updateFrame]);

  const handlePopBalloon = useCallback((id: number) => {
    if (gameStateRef.current === "ready") {
      startRound();
      return;
    }
    if (gameStateRef.current !== "playing") {
      return;
    }

    const target = balloonsRef.current.find((balloon) => balloon.id === id);
    if (!target) {
      return;
    }

    const points = target.special ? 3 : 1;
    const nextScore = scoreRef.current + points;
    scoreRef.current = nextScore;
    setScore(nextScore);

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(target.special ? [8, 24, 8] : 10);
    }

    syncBalloons(balloonsRef.current.filter((balloon) => balloon.id !== id));
  }, [startRound, syncBalloons]);

  const handleArenaTap = useCallback(() => {
    if (gameStateRef.current === "ready") {
      startRound();
    }
  }, [startRound]);

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
      return "Tap to start";
    }
    if (gameState === "game_over") {
      return newBest ? "New Best!" : "Round complete";
    }
    return "Pop every balloon!";
  }, [gameState, newBest]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const best = readBestScore();
    bestScoreRef.current = best;
    setBestScore(best);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncBest = () => {
      const nextBest = readBestScore();
      bestScoreRef.current = nextBest;
      setBestScore(nextBest);
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
    if (isTimeUp && gameState === "playing") {
      finishRound();
    }
  }, [finishRound, gameState, isTimeUp]);

  useEffect(() => {
    if (isTimeUp || gameState !== "playing") {
      return;
    }

    resetIfNewDay();
    return startSessionTick();
  }, [gameState, isTimeUp]);

  useEffect(() => {
    return () => {
      stopLoop();
      clearConfettiTimer();
    };
  }, [clearConfettiTimer, stopLoop]);

  return (
    <div className={arcade.pageWrap}>
      <TimeUpOverlay fixed backHref="/play" />
      <div className={`${arcade.gameFrame} relative`}>
        <ConfettiBurst active={showConfetti} />

        <div className={`${arcade.headerBar} mb-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${arcade.chip} ${newBest ? "border-emerald-200/55 bg-emerald-300/15 text-emerald-100" : ""}`}>
              Score: {score}
            </span>
            <span className={arcade.chip}>Time: {timeLeft}s</span>
            <span className={arcade.chip}>Best: {bestScore}</span>
            <span className={arcade.chip}>Golden: +3</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{statusText}</p>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-slate-200/20 bg-gradient-to-b from-sky-500/22 via-indigo-500/18 to-slate-950/88"
          style={{
            height: `${ARENA_HEIGHT}px`,
            minWidth: `${ARENA_MIN_WIDTH}px`,
            touchAction: gameState === "playing" ? "none" : "manipulation",
          }}
          onClick={handleArenaTap}
          onTouchMove={handleTouchMove}
        >
          <FirstPlayOverlay
            storageKey={FIRST_PLAY_KEY}
            text="Pop balloons before they float away."
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-500/25 to-transparent" />

          {balloons.map((balloon) => {
            const sway = Math.sin(balloon.age * balloon.swayFrequency * Math.PI * 2 + balloon.phase);
            const xPct = clamp(balloon.xBasePct + sway * balloon.swayAmplitude, 8, 92);
            const pointsLabel = balloon.special ? "+3" : "+1";
            return (
              <button
                key={balloon.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePopBalloon(balloon.id);
                }}
                className={`absolute -translate-x-1/2 rounded-full border shadow-[0_12px_22px_rgba(2,6,23,0.4)] transition active:scale-95 ${balloon.special ? "border-amber-100/90 bg-gradient-to-b from-amber-300 to-amber-500" : "border-rose-100/75 bg-gradient-to-b from-rose-300 to-rose-500"}`}
                style={{
                  width: `${balloon.size}px`,
                  height: `${balloon.size * 1.08}px`,
                  left: `${xPct}%`,
                  bottom: `${balloon.y}px`,
                }}
                aria-label={balloon.special ? "Golden balloon" : "Balloon"}
              >
                <span
                  className={`pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full ${balloon.special ? "bg-amber-100/75" : "bg-rose-100/70"}`}
                  style={{
                    width: `${Math.max(7, balloon.size * 0.18)}px`,
                    height: `${Math.max(7, balloon.size * 0.18)}px`,
                  }}
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] font-black text-slate-900/85">
                  {pointsLabel}
                </span>
              </button>
            );
          })}

          {gameState === "ready" ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <div className="rounded-xl border border-slate-200/25 bg-slate-900/85 px-4 py-3 text-center shadow-[0_8px_20px_rgba(2,6,23,0.6)]">
                <p className="text-sm font-semibold text-rose-100">Tap to start popping balloons</p>
                <p className="mt-1 text-xs text-slate-300">30 seconds. Gold balloons are worth extra.</p>
              </div>
            </div>
          ) : null}

          {gameState === "game_over" ? (
            <GameEndOverlay
              title={newBest ? "New Best Score!" : "Round Complete"}
              subtitle="Pop again and beat your best."
              stats={[
                { label: "Score", value: score },
                { label: "Best", value: bestScore },
                { label: "Time", value: `${ROUND_SECONDS}s` },
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

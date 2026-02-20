"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addStars, markPlayedToday } from "@/src/lib/progress";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";

type RunnerState = "ready" | "playing" | "crashing" | "game_over";
type ObstacleVariant = "small" | "big";

type Obstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  rotation: number;
  variant: ObstacleVariant;
  icon: "☄️" | "🪨";
};

type TrailParticle = {
  id: number;
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
  driftX: number;
  driftY: number;
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const HIGH_SCORE_KEY = "pp_space_runner_high_score";
const DEFAULT_ARENA_HEIGHT = 360;
const DEFAULT_ARENA_WIDTH = 720;
const CONFETTI_SCORE_THRESHOLD = 80;

const GROUND_HEIGHT = 56;
const PLAYER_SIZE = 52;
const PLAYER_X = 42;
const GRAVITY = 1800;
const JUMP_VELOCITY = -640;

const BASE_SPEED = 250;
const MAX_SPEED = 430;
const LEVEL_INTERVAL_SECONDS = 10;
const SPEED_PER_LEVEL = 18;
const SPEED_BLEND_FACTOR = 7;
const SCORE_RATE = 12;
const SCORE_LEVEL_MULTIPLIER = 0.08;

const TRAIL_PARTICLE_MAX = 25;
const TRAIL_SPAWN_INTERVAL = 0.035;

const CRASH_SHAKE_DURATION_MS = 250;
const CRASH_FLASH_DURATION_MS = 150;
const CRASH_OVERLAY_DELAY_MS = 260;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hasOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

type SpaceRunnerProps = {
  onComplete?: (payload?: { best?: number }) => void;
};

export default function SpaceRunner({ onComplete }: SpaceRunnerProps) {
  const router = useRouter();

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const arenaHeightRef = useRef(DEFAULT_ARENA_HEIGHT);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const obstacleIdRef = useRef(0);
  const playerYRef = useRef(DEFAULT_ARENA_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE);
  const playerVelocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const spawnTimerRef = useRef(0);
  const nextSpawnMsRef = useRef(980);
  const speedRef = useRef(BASE_SPEED);
  const speedDisplayRef = useRef(BASE_SPEED);
  const levelRef = useRef(1);
  const survivedSecondsRef = useRef(0);
  const scoreFloatRef = useRef(0);
  const scoreRef = useRef(0);
  const trailIdRef = useRef(0);
  const trailSpawnTimerRef = useRef(0);
  const trailParticlesRef = useRef<TrailParticle[]>([]);
  const gameStateRef = useRef<RunnerState>("ready");
  const hasAwardedRoundRef = useRef(false);
  const highScoreRef = useRef(0);
  const roundStartHighScoreRef = useRef(0);
  const hasNewBestRef = useRef(false);
  const confettiTimerRef = useRef<number | null>(null);
  const crashTimerRef = useRef<number | null>(null);
  const crashFlashTimerRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<RunnerState>("ready");
  const [arenaHeight, setArenaHeight] = useState(DEFAULT_ARENA_HEIGHT);
  const [playerY, setPlayerY] = useState(DEFAULT_ARENA_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE);
  const [playerTilt, setPlayerTilt] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [score, setScore] = useState(0);
  const [scorePopping, setScorePopping] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [speedDisplay, setSpeedDisplay] = useState(BASE_SPEED);
  const [hasNewBest, setHasNewBest] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showCrashFlash, setShowCrashFlash] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const statusText = useMemo(() => {
    if (gameState === "ready") {
      return "Tap to start";
    }
    if (gameState === "crashing") {
      return "Boom!";
    }
    if (gameState === "game_over") {
      return "Crashed! Try again.";
    }
    return "You got this";
  }, [gameState]);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const clearCrashTimers = useCallback(() => {
    if (crashTimerRef.current !== null) {
      window.clearTimeout(crashTimerRef.current);
      crashTimerRef.current = null;
    }
    if (crashFlashTimerRef.current !== null) {
      window.clearTimeout(crashFlashTimerRef.current);
      crashFlashTimerRef.current = null;
    }
  }, []);

  const syncRenderableState = useCallback(() => {
    setPlayerY(playerYRef.current);
    setPlayerTilt(clamp(playerVelocityRef.current / 22, -16, 16));
    setObstacles([...obstaclesRef.current]);
    setTrailParticles([...trailParticlesRef.current]);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }, []);

  const getPlayerGroundY = useCallback(() => {
    return Math.max(0, arenaHeightRef.current - GROUND_HEIGHT - PLAYER_SIZE);
  }, []);

  const resetRound = useCallback(() => {
    const groundY = getPlayerGroundY();

    playerYRef.current = groundY;
    playerVelocityRef.current = 0;
    obstaclesRef.current = [];
    obstacleIdRef.current = 0;
    spawnTimerRef.current = 0;
    nextSpawnMsRef.current = 900 + Math.random() * 350;

    speedRef.current = BASE_SPEED;
    speedDisplayRef.current = BASE_SPEED;
    levelRef.current = 1;
    survivedSecondsRef.current = 0;

    scoreFloatRef.current = 0;
    scoreRef.current = 0;

    trailIdRef.current = 0;
    trailSpawnTimerRef.current = 0;
    trailParticlesRef.current = [];

    hasAwardedRoundRef.current = false;
    hasNewBestRef.current = false;

    clearCrashTimers();
    setIsShaking(false);
    setShowCrashFlash(false);

    clearConfettiTimer();
    setShowConfetti(false);

    setPlayerY(groundY);
    setPlayerTilt(0);
    setObstacles([]);
    setTrailParticles([]);
    setScore(0);
    setScorePopping(false);
    setLevel(1);
    setSpeedDisplay(BASE_SPEED);
    setHasNewBest(false);
  }, [clearConfettiTimer, clearCrashTimers, getPlayerGroundY]);

  const finishRound = useCallback(() => {
    gameStateRef.current = "game_over";
    setGameState("game_over");
    setIsShaking(false);
    setShowCrashFlash(false);

    const finalScore = scoreRef.current;
    if (finalScore > highScoreRef.current) {
      highScoreRef.current = finalScore;
      setHighScore(finalScore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
      }
    }

    if (hasNewBestRef.current || finalScore >= CONFETTI_SCORE_THRESHOLD) {
      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, 900);
    }

    onComplete?.({ best: finalScore });
  }, [clearConfettiTimer, onComplete]);

  const triggerCrash = useCallback(() => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    stopLoop();
    clearCrashTimers();
    gameStateRef.current = "crashing";
    setGameState("crashing");
    setIsShaking(true);
    setShowCrashFlash(true);

    crashFlashTimerRef.current = window.setTimeout(() => {
      setShowCrashFlash(false);
      crashFlashTimerRef.current = null;
    }, CRASH_FLASH_DURATION_MS);

    crashTimerRef.current = window.setTimeout(() => {
      setIsShaking(false);
      crashTimerRef.current = null;
      finishRound();
    }, CRASH_OVERLAY_DELAY_MS);
  }, [clearCrashTimers, finishRound, stopLoop]);

  const tick = useCallback(
    (time: number) => {
      if (gameStateRef.current !== "playing") {
        return;
      }

      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = time;
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const deltaMs = Math.min(40, time - lastFrameTimeRef.current);
      lastFrameTimeRef.current = time;
      const delta = deltaMs / 1000;

      const groundTop = arenaHeightRef.current - GROUND_HEIGHT;
      const groundY = groundTop - PLAYER_SIZE;

      playerVelocityRef.current += GRAVITY * delta;
      playerYRef.current += playerVelocityRef.current * delta;
      if (playerYRef.current > groundY) {
        playerYRef.current = groundY;
        playerVelocityRef.current = 0;
      }

      survivedSecondsRef.current += delta;
      const nextLevel = Math.floor(survivedSecondsRef.current / LEVEL_INTERVAL_SECONDS) + 1;
      if (nextLevel !== levelRef.current) {
        levelRef.current = nextLevel;
        setLevel(nextLevel);
      }

      const levelProgress = (survivedSecondsRef.current % LEVEL_INTERVAL_SECONDS) / LEVEL_INTERVAL_SECONDS;
      const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + (nextLevel - 1 + levelProgress) * SPEED_PER_LEVEL);
      speedRef.current += (targetSpeed - speedRef.current) * Math.min(1, delta * SPEED_BLEND_FACTOR);

      const roundedSpeed = Math.round(speedRef.current);
      if (roundedSpeed !== speedDisplayRef.current) {
        speedDisplayRef.current = roundedSpeed;
        setSpeedDisplay(roundedSpeed);
      }

      const currentSpeed = speedRef.current;
      obstaclesRef.current = obstaclesRef.current
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - currentSpeed * delta }))
        .filter((obstacle) => obstacle.x + obstacle.width > -24);

      spawnTimerRef.current += deltaMs;
      if (spawnTimerRef.current >= nextSpawnMsRef.current) {
        spawnTimerRef.current = 0;
        const arenaWidth = arenaRef.current?.clientWidth ?? DEFAULT_ARENA_WIDTH;
        const variant: ObstacleVariant = Math.random() > 0.58 ? "big" : "small";
        const isBig = variant === "big";
        const width = isBig ? 52 + Math.random() * 12 : 30 + Math.random() * 8;
        const height = isBig ? 62 + Math.random() * 10 : 40 + Math.random() * 10;

        obstaclesRef.current.push({
          id: obstacleIdRef.current++,
          x: arenaWidth + 24,
          width,
          height,
          rotation: -20 + Math.random() * 40,
          variant,
          icon: isBig ? "🪨" : "☄️",
        });

        const speedOffset = (speedRef.current - BASE_SPEED) * 1.35;
        nextSpawnMsRef.current = Math.max(560, 1040 + Math.random() * 420 - speedOffset);
      }

      trailSpawnTimerRef.current += delta;
      while (trailSpawnTimerRef.current >= TRAIL_SPAWN_INTERVAL) {
        trailSpawnTimerRef.current -= TRAIL_SPAWN_INTERVAL;

        const maxLife = 0.26 + Math.random() * 0.18;
        trailParticlesRef.current.push({
          id: trailIdRef.current++,
          x: PLAYER_X + 10 + Math.random() * 8,
          y: playerYRef.current + PLAYER_SIZE * 0.58 + (Math.random() - 0.5) * 10,
          size: 4 + Math.random() * 4,
          life: maxLife,
          maxLife,
          opacity: 0.85,
          driftX: -42 - Math.random() * 42,
          driftY: (Math.random() - 0.5) * 26,
        });
      }

      if (trailParticlesRef.current.length > TRAIL_PARTICLE_MAX) {
        trailParticlesRef.current = trailParticlesRef.current.slice(-TRAIL_PARTICLE_MAX);
      }

      trailParticlesRef.current = trailParticlesRef.current
        .map((particle) => {
          const nextLife = particle.life - delta;
          if (nextLife <= 0) {
            return null;
          }
          const ratio = nextLife / particle.maxLife;
          return {
            ...particle,
            life: nextLife,
            x: particle.x + particle.driftX * delta,
            y: particle.y + particle.driftY * delta,
            opacity: ratio * 0.8,
          };
        })
        .filter((particle): particle is TrailParticle => particle !== null);

      const scoreRate = SCORE_RATE * (1 + (levelRef.current - 1) * SCORE_LEVEL_MULTIPLIER);
      scoreFloatRef.current += scoreRate * delta;
      const nextScore = Math.floor(scoreFloatRef.current);
      if (nextScore !== scoreRef.current) {
        scoreRef.current = nextScore;
        setScore(nextScore);

        if (!hasNewBestRef.current && nextScore > roundStartHighScoreRef.current) {
          hasNewBestRef.current = true;
          setHasNewBest(true);
        }
      }

      const playerHitbox: Box = {
        x: PLAYER_X + 8,
        y: playerYRef.current + 8,
        width: PLAYER_SIZE - 16,
        height: PLAYER_SIZE - 16,
      };

      const collided = obstaclesRef.current.some((obstacle) => {
        const insetX = obstacle.variant === "big" ? 11 : 8;
        const insetY = obstacle.variant === "big" ? 12 : 8;
        const obstacleHitbox: Box = {
          x: obstacle.x + insetX,
          y: Math.max(0, groundTop - obstacle.height + insetY),
          width: Math.max(16, obstacle.width - insetX * 2),
          height: Math.max(16, obstacle.height - insetY * 2),
        };
        return hasOverlap(playerHitbox, obstacleHitbox);
      });

      if (collided) {
        syncRenderableState();
        triggerCrash();
        return;
      }

      syncRenderableState();
      rafRef.current = window.requestAnimationFrame(tick);
    },
    [syncRenderableState, triggerCrash],
  );

  const startRound = useCallback(() => {
    stopLoop();
    clearCrashTimers();
    resetRound();

    roundStartHighScoreRef.current = highScoreRef.current;
    gameStateRef.current = "playing";
    setGameState("playing");
    rafRef.current = window.requestAnimationFrame(tick);
  }, [clearCrashTimers, resetRound, stopLoop, tick]);

  const triggerJump = useCallback(() => {
    if (gameStateRef.current === "game_over" || gameStateRef.current === "crashing") {
      return;
    }

    if (gameStateRef.current === "ready") {
      startRound();
    }

    if (gameStateRef.current !== "playing") {
      return;
    }

    const groundY = getPlayerGroundY();
    if (playerYRef.current < groundY - 1.5) {
      return;
    }

    playerVelocityRef.current = JUMP_VELOCITY;
    setPlayerTilt(-15);
  }, [getPlayerGroundY, startRound]);

  const handleAreaPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (gameState === "game_over" || gameState === "crashing") {
      return;
    }
    event.preventDefault();
    triggerJump();
  };

  const handleAreaKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (gameState !== "game_over" && gameState !== "crashing") {
      triggerJump();
    }
  };

  const handleAreaTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (gameState === "playing" || gameState === "crashing") {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (score === 0 || gameState !== "playing") {
      return;
    }
    setScorePopping(true);
    const timer = window.setTimeout(() => setScorePopping(false), 150);
    return () => window.clearTimeout(timer);
  }, [score, gameState]);

  useEffect(() => {
    if (gameState !== "game_over" || score < 25 || hasAwardedRoundRef.current) {
      return;
    }

    addStars(1);
    markPlayedToday();
    hasAwardedRoundRef.current = true;
  }, [gameState, score]);

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
    if (isTimeUp || gameState !== "playing") {
      return;
    }

    resetIfNewDay();
    return startSessionTick();
  }, [gameState, isTimeUp]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = Number(window.localStorage.getItem(HIGH_SCORE_KEY) ?? "0");
    const parsed = Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 0;

    highScoreRef.current = parsed;
    roundStartHighScoreRef.current = parsed;
    setHighScore(parsed);
  }, []);

  useEffect(() => {
    const element = arenaRef.current;
    if (!element) {
      return;
    }

    const syncArenaMetrics = () => {
      const nextHeight = element.clientHeight || DEFAULT_ARENA_HEIGHT;
      arenaHeightRef.current = nextHeight;
      setArenaHeight(nextHeight);
      if (gameStateRef.current !== "playing") {
        const groundY = Math.max(0, nextHeight - GROUND_HEIGHT - PLAYER_SIZE);
        playerYRef.current = groundY;
        setPlayerY(groundY);
      }
    };

    syncArenaMetrics();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(syncArenaMetrics);
      observer.observe(element);
    } else {
      window.addEventListener("resize", syncArenaMetrics);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncArenaMetrics);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopLoop();
      clearConfettiTimer();
      clearCrashTimers();
    };
  }, [clearConfettiTimer, clearCrashTimers, stopLoop]);

  const statusClass =
    gameState === "playing"
      ? arcade.badgeLive
      : gameState === "game_over" || gameState === "crashing"
        ? arcade.badgeSoon
        : "";

  const highChipClass = hasNewBest ? "pp-high-chip-new" : "";
  const lockTouchScroll = gameState === "playing" || gameState === "crashing";

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow relative`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Space Runner</h2>
              <p className={`text-sm ${arcade.subtleText}`}>Jump clean, dodge asteroids, beat your best.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusClass}`}>{statusText}</span>
              <span className={arcade.chip}>
                Score: <strong className={`font-black text-white ${scorePopping ? "pp-score-pop" : ""}`}>{score}</strong>
              </span>
              <span className={arcade.chip}>
                Level: <strong className="font-black text-cyan-100">{level}</strong>
              </span>
              <span className={arcade.chip}>
                Speed: <strong className="font-black text-cyan-100">{speedDisplay}</strong>
              </span>
              <span className={`${arcade.chip} ${highChipClass}`}>
                High: <strong className={`font-black ${hasNewBest ? "text-amber-100" : "text-cyan-100"}`}>{Math.max(highScore, score)}</strong>
                {hasNewBest ? <span className="pp-new-best-tag">New Best!</span> : null}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={startRound} className={arcade.primaryButton}>
              Play Again
            </button>
            <span className={arcade.chip}>Tap anywhere to jump</span>
          </div>
        </div>

        <div className={`${arcade.panel} relative mt-4`}>
          <ConfettiBurst active={showConfetti} className="rounded-2xl" />

          <div
            ref={arenaRef}
            role="button"
            tabIndex={0}
            aria-label={
              gameState === "game_over"
                ? "Space Runner game over"
                : gameState === "crashing"
                  ? "Space Runner crash"
                  : "Space Runner game area"
            }
            onPointerDown={handleAreaPointerDown}
            onKeyDown={handleAreaKeyDown}
            onTouchMove={handleAreaTouchMove}
            className={`relative h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200/15 bg-slate-950 sm:h-[400px] ${
              lockTouchScroll ? "touch-none overscroll-none" : "touch-pan-y"
            } ${isShaking ? "pp-screen-shake" : ""}`}
            style={{ touchAction: lockTouchScroll ? "none" : "pan-y" }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.2),transparent_42%),radial-gradient(circle_at_78%_4%,rgba(168,85,247,0.2),transparent_46%),linear-gradient(180deg,rgba(12,19,52,0.96)_0%,rgba(2,6,23,0.98)_100%)]" />
              <div className="pp-stars-layer pp-stars-layer-one absolute inset-0" />
              <div className="pp-stars-layer pp-stars-layer-two absolute inset-0" />
            </div>

            {trailParticles.map((particle) => (
              <div
                key={particle.id}
                className="pointer-events-none absolute z-[19] rounded-full bg-cyan-200/80"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  opacity: particle.opacity,
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 10px rgba(103,232,249,0.55)",
                }}
              />
            ))}

            {obstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                className="absolute z-20 flex items-center justify-center rounded-2xl border border-amber-200/35 bg-gradient-to-br from-amber-200/25 to-rose-300/10 shadow-[0_8px_16px_rgba(2,6,23,0.45)]"
                style={{
                  left: `${obstacle.x}px`,
                  top: `${Math.max(4, arenaHeight - GROUND_HEIGHT - obstacle.height)}px`,
                  width: `${obstacle.width}px`,
                  height: `${obstacle.height}px`,
                  transform: `rotate(${obstacle.rotation}deg)`,
                }}
              >
                <span className={`select-none leading-none ${obstacle.variant === "big" ? "text-[1.65rem]" : "text-2xl"}`}>
                  {obstacle.icon}
                </span>
              </div>
            ))}

            <div
              className="absolute z-30 flex items-center justify-center rounded-2xl border border-cyan-200/40 bg-cyan-300/20 shadow-[0_10px_20px_rgba(34,211,238,0.35)] transition-transform duration-100"
              style={{
                left: `${PLAYER_X}px`,
                top: `${playerY}px`,
                width: `${PLAYER_SIZE}px`,
                height: `${PLAYER_SIZE}px`,
                transform: `rotate(${playerTilt}deg)`,
              }}
            >
              <span className="select-none text-3xl leading-none drop-shadow-[0_0_12px_rgba(103,232,249,0.75)]">🚀</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10 h-14 border-t border-cyan-100/25 bg-gradient-to-r from-indigo-800/55 via-slate-900/85 to-violet-800/55">
              <div className="mx-3 mt-2 h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
            </div>

            {showCrashFlash ? <div className="pp-boom-flash pointer-events-none absolute inset-0 z-40 bg-rose-100/35" /> : null}

            {gameState === "ready" ? (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4">
                <div className="rounded-2xl border border-slate-100/20 bg-slate-900/75 px-5 py-4 text-center shadow-[0_12px_28px_rgba(2,6,23,0.55)]">
                  <p className="text-base font-bold text-white">Tap to start</p>
                  <p className="mt-1 text-sm text-slate-300">Tap again to jump over asteroids.</p>
                </div>
              </div>
            ) : null}

            {gameState === "game_over" ? (
              <GameEndOverlay
                title="Crashed! Try again."
                subtitle={
                  hasNewBest
                    ? "New best! That run set a fresh record."
                    : score >= CONFETTI_SCORE_THRESHOLD
                      ? "Star run. That was a big score."
                      : "Reset and go for a longer run."
                }
                stats={[
                  { label: "Score", value: score },
                  { label: "High", value: Math.max(score, highScore) },
                  { label: "Level", value: level },
                ]}
                onPrimary={startRound}
                onSecondary={() => router.push("/play")}
              />
            ) : null}
          </div>
        </div>

        {isTimeUp ? <TimeUpOverlay backHref="/play" /> : null}
      </div>

      <style jsx>{`
        .pp-stars-layer {
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.78) 1px, transparent 1.35px);
          background-size: 26px 26px;
          opacity: 0.14;
        }

        .pp-stars-layer-one {
          animation: pp-stars-drift-a 32s linear infinite;
        }

        .pp-stars-layer-two {
          opacity: 0.08;
          background-size: 38px 38px;
          animation: pp-stars-drift-b 44s linear infinite;
        }

        .pp-score-pop {
          display: inline-block;
          animation: pp-score-pop 150ms ease-out both;
        }

        .pp-high-chip-new {
          border-color: rgba(250, 204, 21, 0.68);
          background: linear-gradient(130deg, rgba(120, 53, 15, 0.46), rgba(113, 63, 18, 0.3));
          box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.28), 0 0 20px rgba(250, 204, 21, 0.2);
        }

        .pp-new-best-tag {
          color: rgba(254, 240, 138, 0.98);
          text-shadow: 0 0 10px rgba(250, 204, 21, 0.56);
          animation: pp-new-best-pulse 780ms ease-in-out infinite;
        }

        .pp-screen-shake {
          animation: pp-screen-shake ${CRASH_SHAKE_DURATION_MS}ms ease-out both;
        }

        .pp-boom-flash {
          animation: pp-boom-flash ${CRASH_FLASH_DURATION_MS}ms ease-out both;
        }

        @keyframes pp-stars-drift-a {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-38px, 22px, 0);
          }
        }

        @keyframes pp-stars-drift-b {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(44px, 30px, 0);
          }
        }

        @keyframes pp-score-pop {
          0% {
            transform: scale(0.86);
            opacity: 0.75;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pp-new-best-pulse {
          0%,
          100% {
            opacity: 0.88;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes pp-screen-shake {
          0% {
            transform: translate3d(0, 0, 0);
          }
          20% {
            transform: translate3d(-8px, 2px, 0);
          }
          40% {
            transform: translate3d(7px, -2px, 0);
          }
          60% {
            transform: translate3d(-5px, 1px, 0);
          }
          80% {
            transform: translate3d(3px, -1px, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes pp-boom-flash {
          0% {
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

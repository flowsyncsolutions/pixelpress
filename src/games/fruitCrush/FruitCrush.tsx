"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import { arcade } from "@/src/lib/arcadeSkin";

type Coord = { r: number; c: number };
type Grid = string[][];
type GameStatus = "ready" | "playing" | "won" | "lost";

type FruitCrushParams = {
  size?: number;
  fruits?: string[];
  moves?: number;
  targetScore?: number;
};

type FruitCrushProps = {
  onComplete?: (payload?: { best?: number }) => void;
  params?: FruitCrushParams;
};

type MatchResult = {
  cleared: Set<string>;
  groups: Coord[][];
};

const DEFAULT_FRUITS = ["🍎", "🍌", "🍇", "🍓", "🍊", "🥝"];
const DEFAULT_SIZE = 8;
const DEFAULT_MOVES = 25;
const DEFAULT_TARGET_SCORE = 2500;
const SCORE_PER_TILE = 10;
const BONUS_FOR_BIG_GROUP = 20;
const MAX_CASCADE_LOOPS = 32;

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function keyOf(coord: Coord): string {
  return `${coord.r},${coord.c}`;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function randomFruit(fruits: string[]): string {
  const index = Math.floor(Math.random() * fruits.length);
  return fruits[index] ?? DEFAULT_FRUITS[0];
}

function normalizeFruits(input?: string[]): string[] {
  if (!Array.isArray(input)) {
    return DEFAULT_FRUITS;
  }

  const cleaned = Array.from(
    new Set(
      input
        .map((fruit) => (typeof fruit === "string" ? fruit.trim() : ""))
        .filter((fruit) => fruit.length > 0),
    ),
  );

  if (cleaned.length >= 4) {
    return cleaned;
  }

  const fallback = [...cleaned];
  for (const fruit of DEFAULT_FRUITS) {
    if (!fallback.includes(fruit)) {
      fallback.push(fruit);
    }
    if (fallback.length >= 4) {
      break;
    }
  }
  return fallback;
}

export function isAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function swap(grid: Grid, a: Coord, b: Coord): Grid {
  const next = cloneGrid(grid);
  const aFruit = next[a.r][a.c];
  next[a.r][a.c] = next[b.r][b.c];
  next[b.r][b.c] = aFruit;
  return next;
}

export function initGrid(size: number, fruits: string[]): Grid {
  const grid: Grid = Array.from({ length: size }, () => Array<string>(size).fill(""));

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      let next = randomFruit(fruits);
      let attempts = 0;

      while (attempts < 30) {
        const createsHorizontal =
          c >= 2 && grid[r][c - 1] === next && grid[r][c - 2] === next;
        const createsVertical =
          r >= 2 && grid[r - 1][c] === next && grid[r - 2][c] === next;

        if (!createsHorizontal && !createsVertical) {
          break;
        }

        next = randomFruit(fruits);
        attempts += 1;
      }

      grid[r][c] = next;
    }
  }

  return grid;
}

export function findMatches(grid: Grid): MatchResult {
  const size = grid.length;
  const cleared = new Set<string>();
  const groups: Coord[][] = [];

  for (let r = 0; r < size; r += 1) {
    let c = 0;
    while (c < size) {
      const value = grid[r][c];
      if (!value) {
        c += 1;
        continue;
      }

      let end = c;
      while (end + 1 < size && grid[r][end + 1] === value) {
        end += 1;
      }

      const runLength = end - c + 1;
      if (runLength >= 3) {
        const group: Coord[] = [];
        for (let index = c; index <= end; index += 1) {
          const coord = { r, c: index };
          group.push(coord);
          cleared.add(keyOf(coord));
        }
        groups.push(group);
      }

      c = end + 1;
    }
  }

  for (let c = 0; c < size; c += 1) {
    let r = 0;
    while (r < size) {
      const value = grid[r][c];
      if (!value) {
        r += 1;
        continue;
      }

      let end = r;
      while (end + 1 < size && grid[end + 1][c] === value) {
        end += 1;
      }

      const runLength = end - r + 1;
      if (runLength >= 3) {
        const group: Coord[] = [];
        for (let index = r; index <= end; index += 1) {
          const coord = { r: index, c };
          group.push(coord);
          cleared.add(keyOf(coord));
        }
        groups.push(group);
      }

      r = end + 1;
    }
  }

  return { cleared, groups };
}

export function collapse(grid: Grid, cleared: Set<string>, fruits: string[]): Grid {
  const size = grid.length;
  const next: Grid = Array.from({ length: size }, () => Array<string>(size).fill(""));

  for (let c = 0; c < size; c += 1) {
    let writeRow = size - 1;

    for (let r = size - 1; r >= 0; r -= 1) {
      if (cleared.has(`${r},${c}`)) {
        continue;
      }
      next[writeRow][c] = grid[r][c];
      writeRow -= 1;
    }

    while (writeRow >= 0) {
      next[writeRow][c] = randomFruit(fruits);
      writeRow -= 1;
    }
  }

  return next;
}

function resolveCascades(grid: Grid, fruits: string[]): { grid: Grid; scoreDelta: number } {
  let working = cloneGrid(grid);
  let scoreDelta = 0;
  let loops = 0;

  while (loops < MAX_CASCADE_LOOPS) {
    const matches = findMatches(working);
    if (matches.cleared.size === 0) {
      break;
    }

    let bonus = 0;
    for (const group of matches.groups) {
      if (group.length >= 4) {
        bonus += BONUS_FOR_BIG_GROUP;
      }
    }

    scoreDelta += matches.cleared.size * SCORE_PER_TILE + bonus;
    working = collapse(working, matches.cleared, fruits);
    loops += 1;
  }

  return { grid: working, scoreDelta };
}

export default function FruitCrush({ onComplete, params }: FruitCrushProps) {
  const router = useRouter();
  const fruits = useMemo(() => normalizeFruits(params?.fruits), [params?.fruits]);
  const size = useMemo(() => clampInt(params?.size ?? DEFAULT_SIZE, 6, 10), [params?.size]);
  const movesLimit = useMemo(
    () => clampInt(params?.moves ?? DEFAULT_MOVES, 5, 99),
    [params?.moves],
  );
  const targetScore = useMemo(
    () => clampInt(params?.targetScore ?? DEFAULT_TARGET_SCORE, 100, 99999),
    [params?.targetScore],
  );

  const [grid, setGrid] = useState<Grid>(() => initGrid(size, fruits));
  const [selected, setSelected] = useState<Coord | null>(null);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(movesLimit);
  const [resolving, setResolving] = useState(false);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [showConfetti, setShowConfetti] = useState(false);

  const statusRef = useRef<GameStatus>("ready");
  const resolvingRef = useRef(false);
  const hasReportedCompleteRef = useRef(false);
  const confettiTimerRef = useRef<number | null>(null);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const setStatusSafe = useCallback((nextStatus: GameStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const resetGame = useCallback(() => {
    clearConfettiTimer();
    setGrid(initGrid(size, fruits));
    setSelected(null);
    setScore(0);
    setMovesLeft(movesLimit);
    setResolving(false);
    setShowConfetti(false);
    setStatusSafe("ready");
    resolvingRef.current = false;
    hasReportedCompleteRef.current = false;
  }, [clearConfettiTimer, fruits, movesLimit, setStatusSafe, size]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    return () => {
      clearConfettiTimer();
    };
  }, [clearConfettiTimer]);

  const handleTileTap = (coord: Coord) => {
    if (resolvingRef.current) {
      return;
    }
    if (statusRef.current === "won" || statusRef.current === "lost") {
      return;
    }
    if (movesLeft <= 0 && statusRef.current !== "ready") {
      return;
    }

    if (statusRef.current === "ready") {
      setStatusSafe("playing");
    }

    if (!selected) {
      setSelected(coord);
      return;
    }

    if (selected.r === coord.r && selected.c === coord.c) {
      setSelected(null);
      return;
    }

    if (!isAdjacent(selected, coord)) {
      setSelected(coord);
      return;
    }

    const swapped = swap(grid, selected, coord);
    const immediateMatches = findMatches(swapped);
    if (immediateMatches.cleared.size === 0) {
      setSelected(coord);
      return;
    }

    resolvingRef.current = true;
    setResolving(true);

    const { grid: resolvedGrid, scoreDelta } = resolveCascades(swapped, fruits);
    const nextScore = score + scoreDelta;
    const nextMovesLeft = movesLeft - 1;

    setGrid(resolvedGrid);
    setScore(nextScore);
    setMovesLeft(nextMovesLeft);
    setSelected(null);

    let nextStatus: GameStatus = "playing";
    if (nextScore >= targetScore) {
      nextStatus = "won";
    } else if (nextMovesLeft <= 0) {
      nextStatus = "lost";
    }

    setStatusSafe(nextStatus);

    if (nextStatus === "won") {
      setShowConfetti(true);
      clearConfettiTimer();
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, 950);
    }

    if ((nextStatus === "won" || nextStatus === "lost") && !hasReportedCompleteRef.current) {
      hasReportedCompleteRef.current = true;
      onComplete?.({ best: nextScore });
    }

    resolvingRef.current = false;
    setResolving(false);
  };

  const statusChipClass =
    status === "won"
      ? arcade.badgeLive
      : status === "lost"
        ? arcade.badgeSoon
        : resolving
          ? "border-cyan-200/45 bg-cyan-300/15 text-cyan-100"
          : "";

  const statusLabel =
    status === "won"
      ? "Sweet win!"
      : status === "lost"
        ? "Out of moves"
        : resolving
          ? "Crushing..."
          : status === "ready"
            ? "Tap fruits to swap"
            : "Keep matching";

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow relative`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Fruit Crush</h2>
              <p className={`text-sm ${arcade.subtleText}`}>Match 3+ fruits. Reach the target before moves run out.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusChipClass}`}>{statusLabel}</span>
              <span className={arcade.chip}>
                Score: <strong className="font-black text-white">{score}</strong>
              </span>
              <span className={arcade.chip}>
                Moves: <strong className="font-black text-cyan-100">{movesLeft}</strong>
              </span>
              <span className={arcade.chip}>
                Target: <strong className="font-black text-rose-100">{targetScore}</strong>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={resetGame} className={arcade.primaryButton}>
              Play Again
            </button>
            <span className={arcade.chip}>Tap one fruit, then an adjacent fruit</span>
          </div>
        </div>

        <div className={`${arcade.panel} relative mt-4`}>
          <ConfettiBurst active={showConfetti && status === "won"} className="rounded-2xl" />

          <div
            className={`${resolving || status === "won" || status === "lost" ? "pointer-events-none" : ""} grid gap-1.5 sm:gap-2`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              touchAction: resolving ? "none" : "manipulation",
            }}
          >
            {grid.map((row, r) =>
              row.map((fruit, c) => {
                const isSelected = selected?.r === r && selected.c === c;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleTileTap({ r, c })}
                    disabled={resolving || status === "won" || status === "lost"}
                    className={`${arcade.tileButton} ${
                      isSelected
                        ? "border-rose-200/80 bg-rose-300/20 shadow-[0_0_0_1px_rgba(251,113,133,0.45),0_0_18px_rgba(244,63,94,0.34)]"
                        : ""
                    } min-h-[38px] text-2xl leading-none sm:min-h-[46px] sm:text-3xl`}
                    aria-label={`Fruit ${fruit} at row ${r + 1}, column ${c + 1}`}
                  >
                    <span className={isSelected ? "pp-fruit-selected" : ""}>{fruit}</span>
                  </button>
                );
              }),
            )}
          </div>

          {status === "won" || status === "lost" ? (
            <GameEndOverlay
              title={status === "won" ? "You win!" : "Out of moves"}
              subtitle={
                status === "won"
                  ? "Sweet crushing streak. Great job!"
                  : "Try a new run and chase the target."
              }
              stats={[
                { label: "Score", value: score },
                { label: "Target", value: targetScore },
                { label: "Moves Left", value: movesLeft },
                { label: "Result", value: status === "won" ? "Win" : "Loss" },
              ]}
              onPrimary={resetGame}
              onSecondary={() => router.push("/play")}
            />
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .pp-fruit-selected {
          animation: pp-fruit-bob 680ms ease-in-out infinite;
          display: inline-block;
        }

        @keyframes pp-fruit-bob {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

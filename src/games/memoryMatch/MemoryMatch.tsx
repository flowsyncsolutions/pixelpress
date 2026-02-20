"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addStars, markPlayedToday } from "@/src/lib/progress";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";
import { getUnlockedFeatures } from "@/src/lib/unlocks";
import { getMemoryMatchTheme } from "@/src/lib/variants";

type Difficulty = "easy" | "normal" | "hard";
type GameState = "ready" | "playing" | "won";

type Card = {
  id: string;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const DEFAULT_CARD_VALUES: Record<Difficulty, string[]> = {
  easy: ["🚀", "🌙", "⭐", "🪐", "☄️", "👽"],
  normal: ["🚀", "🌙", "⭐", "🪐", "☄️", "👽", "🛰️", "🌌"],
  hard: [
    "🚀",
    "🌙",
    "⭐",
    "🪐",
    "☄️",
    "👽",
    "🛰️",
    "🌌",
    "🌠",
    "🛸",
    "🔭",
    "🌍",
    "☀️",
    "⚡",
    "🌈",
    "🦄",
    "🐱",
    "🐶",
  ],
};

const BEST_KEYS: Record<Difficulty, string> = {
  easy: "pp_memory_best_easy",
  normal: "pp_memory_best_normal",
  hard: "pp_memory_best_hard",
};

function fisherYatesShuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

function getCardValuesForTheme(themeId?: string): Record<Difficulty, string[]> {
  const theme = getMemoryMatchTheme(themeId);
  if (!theme) {
    return DEFAULT_CARD_VALUES;
  }

  const merged = Array.from(new Set([...theme.emojis, ...DEFAULT_CARD_VALUES.hard]));
  const hard = merged.slice(0, DEFAULT_CARD_VALUES.hard.length);
  const normal = hard.slice(0, DEFAULT_CARD_VALUES.normal.length);
  const easy = hard.slice(0, DEFAULT_CARD_VALUES.easy.length);

  return { easy, normal, hard };
}

function buildDeck(difficulty: Difficulty, cardValues: Record<Difficulty, string[]>): Card[] {
  const cards = cardValues[difficulty].flatMap((value, pairIndex) => [
    {
      id: `${difficulty}-${value}-${pairIndex}-a`,
      value,
      isFlipped: false,
      isMatched: false,
    },
    {
      id: `${difficulty}-${value}-${pairIndex}-b`,
      value,
      isFlipped: false,
      isMatched: false,
    },
  ]);

  return fisherYatesShuffle(cards);
}

function parseStoredBest(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

type MemoryMatchProps = {
  onComplete?: (payload?: { best?: number }) => void;
  params?: { themeId?: string };
};

export default function MemoryMatch({ onComplete, params }: MemoryMatchProps) {
  const router = useRouter();

  const cardValues = useMemo(() => getCardValuesForTheme(params?.themeId), [params?.themeId]);

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState<Card[]>(() =>
    buildDeck("easy", getCardValuesForTheme(params?.themeId)),
  );
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [lockBoard, setLockBoard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [memoryHardUnlocked, setMemoryHardUnlocked] = useState(false);
  const [bestMoves, setBestMoves] = useState<Record<Difficulty, number | null>>({
    easy: null,
    normal: null,
    hard: null,
  });

  const cardsRef = useRef<Card[]>(cards);
  const flippedIndexesRef = useRef<number[]>(flippedIndexes);
  const movesRef = useRef(moves);
  const matchesRef = useRef(matches);
  const gameStateRef = useRef<GameState>(gameState);
  const lockBoardRef = useRef(lockBoard);
  const difficultyRef = useRef<Difficulty>(difficulty);
  const flipBackTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const hasAwardedWinRef = useRef(false);

  const totalPairs = cardValues[difficulty].length;
  const currentBest = bestMoves[difficulty];
  const gridClass =
    difficulty === "easy"
      ? "grid-cols-3 gap-2 sm:gap-3"
      : difficulty === "normal"
        ? "grid-cols-4 gap-2 sm:gap-3"
        : "grid-cols-6 gap-1.5 sm:gap-2";
  const cardSizeClass =
    difficulty === "easy"
      ? "aspect-[4/5] min-h-[88px]"
      : difficulty === "normal"
        ? "aspect-[4/5] min-h-[72px]"
        : "aspect-square min-h-[50px] sm:min-h-[56px]";

  const statusText = useMemo(() => {
    if (gameState === "won") {
      return "You win!";
    }
    if (gameState === "ready") {
      return "Tap to start";
    }
    return "You got this";
  }, [gameState]);

  const statusClass = gameState === "won" ? arcade.badgeLive : "";

  const clearFlipBackTimer = useCallback(() => {
    if (flipBackTimerRef.current !== null) {
      window.clearTimeout(flipBackTimerRef.current);
      flipBackTimerRef.current = null;
    }
  }, []);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const resetBoard = useCallback(
    (nextDifficulty: Difficulty) => {
      clearFlipBackTimer();
      clearConfettiTimer();

      const nextDeck = buildDeck(nextDifficulty, cardValues);
      cardsRef.current = nextDeck;
      flippedIndexesRef.current = [];
      movesRef.current = 0;
      matchesRef.current = 0;
      gameStateRef.current = "ready";
      lockBoardRef.current = false;

      setCards(nextDeck);
      setFlippedIndexes([]);
      setMoves(0);
      setMatches(0);
      setGameState("ready");
      setLockBoard(false);
      setShowConfetti(false);
      hasAwardedWinRef.current = false;
    },
    [cardValues, clearConfettiTimer, clearFlipBackTimer],
  );

  const saveBestIfNeeded = useCallback((mode: Difficulty, finalMoves: number) => {
    setBestMoves((previous) => {
      const existing = previous[mode];
      if (existing !== null && existing <= finalMoves) {
        return previous;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(BEST_KEYS[mode], String(finalMoves));
      }

      if (mode === "easy") {
        return { ...previous, easy: finalMoves };
      }
      if (mode === "normal") {
        return { ...previous, normal: finalMoves };
      }
      return { ...previous, hard: finalMoves };
    });
  }, []);

  const syncUnlockState = useCallback(() => {
    const unlocked = getUnlockedFeatures();
    setMemoryHardUnlocked(unlocked.memoryHardUnlocked);
  }, []);

  const handleDifficultyChange = (nextDifficulty: Difficulty) => {
    if (nextDifficulty === "normal" && !memoryHardUnlocked) {
      return;
    }

    if (nextDifficulty === difficultyRef.current) {
      return;
    }

    difficultyRef.current = nextDifficulty;
    setDifficulty(nextDifficulty);
    resetBoard(nextDifficulty);
  };

  const handleCardPress = (index: number) => {
    if (lockBoardRef.current || gameStateRef.current === "won" || isTimeUp) {
      return;
    }

    const currentCards = cardsRef.current;
    const selectedCard = currentCards[index];
    if (!selectedCard || selectedCard.isFlipped || selectedCard.isMatched) {
      return;
    }

    const currentlyFlipped = flippedIndexesRef.current;
    if (currentlyFlipped.length >= 2) {
      return;
    }

    if (gameStateRef.current === "ready") {
      gameStateRef.current = "playing";
      setGameState("playing");
    }

    const withFlip = currentCards.map((card, cardIndex) =>
      cardIndex === index ? { ...card, isFlipped: true } : card,
    );
    cardsRef.current = withFlip;
    setCards(withFlip);

    const nextFlipped = [...currentlyFlipped, index];
    flippedIndexesRef.current = nextFlipped;
    setFlippedIndexes(nextFlipped);

    if (nextFlipped.length < 2) {
      return;
    }

    const [firstIndex, secondIndex] = nextFlipped;
    const firstCard = withFlip[firstIndex];
    const secondCard = withFlip[secondIndex];
    if (!firstCard || !secondCard) {
      return;
    }

    const nextMoveCount = movesRef.current + 1;
    movesRef.current = nextMoveCount;
    setMoves(nextMoveCount);

    if (firstCard.value === secondCard.value) {
      const withMatch = withFlip.map((card, cardIndex) =>
        cardIndex === firstIndex || cardIndex === secondIndex ? { ...card, isMatched: true } : card,
      );
      cardsRef.current = withMatch;
      setCards(withMatch);

      flippedIndexesRef.current = [];
      setFlippedIndexes([]);

      const nextMatchCount = matchesRef.current + 1;
      matchesRef.current = nextMatchCount;
      setMatches(nextMatchCount);

      if (nextMatchCount === cardValues[difficultyRef.current].length) {
        gameStateRef.current = "won";
        lockBoardRef.current = true;
        setGameState("won");
        setLockBoard(true);

        setShowConfetti(true);
        clearConfettiTimer();
        confettiTimerRef.current = window.setTimeout(() => {
          setShowConfetti(false);
          confettiTimerRef.current = null;
        }, 900);

        if (!hasAwardedWinRef.current) {
          addStars(1);
          markPlayedToday();
          syncUnlockState();
          hasAwardedWinRef.current = true;
        }

        saveBestIfNeeded(difficultyRef.current, nextMoveCount);
        onComplete?.();
      }

      return;
    }

    lockBoardRef.current = true;
    setLockBoard(true);
    clearFlipBackTimer();
    flipBackTimerRef.current = window.setTimeout(() => {
      const resetFlipped = cardsRef.current.map((card, cardIndex) =>
        cardIndex === firstIndex || cardIndex === secondIndex
          ? card.isMatched
            ? card
            : { ...card, isFlipped: false }
          : card,
      );
      cardsRef.current = resetFlipped;
      flippedIndexesRef.current = [];
      lockBoardRef.current = false;

      setCards(resetFlipped);
      setFlippedIndexes([]);
      setLockBoard(false);
      flipBackTimerRef.current = null;
    }, 650);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    syncUnlockState();
    window.addEventListener("storage", syncUnlockState);

    setBestMoves({
      easy: parseStoredBest(window.localStorage.getItem(BEST_KEYS.easy)),
      normal: parseStoredBest(window.localStorage.getItem(BEST_KEYS.normal)),
      hard: parseStoredBest(window.localStorage.getItem(BEST_KEYS.hard)),
    });
    return () => {
      window.removeEventListener("storage", syncUnlockState);
    };
  }, [syncUnlockState]);

  useEffect(() => {
    difficultyRef.current = "easy";
    setDifficulty("easy");
    resetBoard("easy");
  }, [cardValues, resetBoard]);

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
    return () => {
      clearFlipBackTimer();
      clearConfettiTimer();
    };
  }, [clearConfettiTimer, clearFlipBackTimer]);

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow relative`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Memory Match</h2>
              <p className={`text-sm ${arcade.subtleText}`}>Flip cards and match every pair.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusClass}`}>{statusText}</span>
              <span className={arcade.chip}>
                Moves: <strong className="font-black text-white">{moves}</strong>
              </span>
              <span className={arcade.chip}>
                Matches: <strong className="font-black text-white">{matches}/{totalPairs}</strong>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => resetBoard(difficultyRef.current)}
              className={arcade.primaryButton}
            >
              Play Again
            </button>
            <div className="inline-flex rounded-xl border border-slate-200/20 bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() => handleDifficultyChange("easy")}
                aria-pressed={difficulty === "easy"}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  difficulty === "easy"
                    ? "bg-violet-400 text-violet-50 shadow-[0_0_12px_rgba(167,139,250,0.45)]"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                Easy
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("normal")}
                aria-pressed={difficulty === "normal"}
                disabled={!memoryHardUnlocked}
                title={!memoryHardUnlocked ? "Unlock at 10 stars" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  difficulty === "normal" && memoryHardUnlocked
                    ? "bg-violet-400 text-violet-50 shadow-[0_0_12px_rgba(167,139,250,0.45)]"
                    : memoryHardUnlocked
                      ? "text-slate-200 hover:bg-slate-800"
                      : "cursor-not-allowed text-slate-500"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span>Normal</span>
                  {!memoryHardUnlocked ? (
                    <span aria-hidden="true" className="text-xs text-amber-300">
                      🔒
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("hard")}
                aria-pressed={difficulty === "hard"}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  difficulty === "hard"
                    ? "bg-violet-400 text-violet-50 shadow-[0_0_12px_rgba(167,139,250,0.45)]"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                Hard
              </button>
            </div>
            <span className={arcade.chip}>
              Best: <strong className="font-black text-cyan-100">{currentBest ?? "--"}</strong>
            </span>
          </div>
        </div>

        <div className={`${arcade.panel} relative mt-4`}>
          <ConfettiBurst active={showConfetti} className="rounded-2xl" />

          <div className={`grid ${gridClass} ${lockBoard || isTimeUp ? "pointer-events-none" : ""}`}>
            {cards.map((card, index) => {
              const isFaceUp = card.isFlipped || card.isMatched;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardPress(index)}
                  disabled={lockBoard || card.isMatched || card.isFlipped || gameState === "won" || isTimeUp}
                  className={`${arcade.tileButton} ${
                    isFaceUp ? arcade.tileButtonPressed : ""
                  } ${cardSizeClass} overflow-hidden ${
                    card.isMatched
                      ? "border-emerald-200/75 bg-emerald-300/15 shadow-[0_0_0_1px_rgba(110,231,183,0.5),0_0_18px_rgba(52,211,153,0.3)]"
                      : ""
                  }`}
                  aria-label={
                    isFaceUp ? `Card ${index + 1}, ${card.value}` : `Card ${index + 1}, hidden memory card`
                  }
                >
                  <span className={`pp-memory-inner ${isFaceUp ? "is-open" : ""}`}>
                    <span className="pp-memory-face pp-memory-front">
                      <span className={`${difficulty === "hard" ? "text-base" : "text-xl"} text-violet-100/90`}>
                        ✦
                      </span>
                    </span>
                    <span className="pp-memory-face pp-memory-back">
                      <span className={`${difficulty === "hard" ? "text-2xl sm:text-3xl" : "text-4xl"} leading-none`}>
                        {card.value}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {gameState === "won" ? (
            <GameEndOverlay
              title="You win!"
              subtitle="All pairs found. Nice memory run."
              stats={[
                { label: "Moves", value: moves },
                { label: "Pairs", value: `${matches}/${totalPairs}` },
                { label: "Best", value: currentBest ?? "--" },
                { label: "Mode", value: difficulty },
              ]}
              onPrimary={() => resetBoard(difficultyRef.current)}
              onSecondary={() => router.push("/play")}
            />
          ) : null}
        </div>

        {isTimeUp ? <TimeUpOverlay backHref="/play" /> : null}
      </div>

      <style jsx>{`
        .pp-memory-inner {
          position: relative;
          height: 100%;
          width: 100%;
          transform-style: preserve-3d;
          transition: transform 220ms ease;
        }

        .pp-memory-inner.is-open {
          transform: rotateY(180deg);
        }

        .pp-memory-face {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          border-radius: 0.85rem;
        }

        .pp-memory-front {
          background:
            radial-gradient(circle at 22% 22%, rgba(167, 139, 250, 0.28), transparent 42%),
            radial-gradient(circle at 78% 78%, rgba(34, 211, 238, 0.2), transparent 46%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(2, 6, 23, 0.95) 100%);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
        }

        .pp-memory-back {
          transform: rotateY(180deg);
          background: linear-gradient(180deg, rgba(88, 28, 135, 0.34) 0%, rgba(15, 23, 42, 0.96) 100%);
          box-shadow: inset 0 0 0 1px rgba(196, 181, 253, 0.28);
        }
      `}</style>
    </div>
  );
}

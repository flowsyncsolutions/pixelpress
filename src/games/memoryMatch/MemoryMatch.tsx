"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { addStars, markPlayedToday } from "@/src/lib/progress";

type Difficulty = "easy" | "normal" | "hard";
type GameState = "ready" | "playing" | "won";

type Card = {
  id: string;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const CARD_VALUES: Record<Difficulty, string[]> = {
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

const CONFETTI_PIECES = [
  { left: "6%", color: "#f472b6", delay: "0ms", duration: "850ms", rotate: -12 },
  { left: "13%", color: "#f59e0b", delay: "40ms", duration: "900ms", rotate: 18 },
  { left: "21%", color: "#a78bfa", delay: "80ms", duration: "860ms", rotate: -20 },
  { left: "30%", color: "#22d3ee", delay: "20ms", duration: "920ms", rotate: 14 },
  { left: "38%", color: "#34d399", delay: "60ms", duration: "880ms", rotate: -16 },
  { left: "47%", color: "#fde047", delay: "100ms", duration: "890ms", rotate: 22 },
  { left: "56%", color: "#fb7185", delay: "130ms", duration: "840ms", rotate: -14 },
  { left: "64%", color: "#38bdf8", delay: "70ms", duration: "910ms", rotate: 12 },
  { left: "72%", color: "#c4b5fd", delay: "120ms", duration: "900ms", rotate: -18 },
  { left: "80%", color: "#f59e0b", delay: "90ms", duration: "870ms", rotate: 20 },
  { left: "88%", color: "#34d399", delay: "150ms", duration: "920ms", rotate: -10 },
  { left: "94%", color: "#60a5fa", delay: "110ms", duration: "860ms", rotate: 16 },
];

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

function buildDeck(difficulty: Difficulty): Card[] {
  const cards = CARD_VALUES[difficulty].flatMap((value, pairIndex) => [
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

export default function MemoryMatch() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [cards, setCards] = useState<Card[]>(() => buildDeck("easy"));
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [lockBoard, setLockBoard] = useState(false);
  const [recentMatch, setRecentMatch] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
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
  const statusTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const hasAwardedWinRef = useRef(false);

  const totalPairs = CARD_VALUES[difficulty].length;
  const currentBest = bestMoves[difficulty];
  const gridClass =
    difficulty === "easy" ? "grid-cols-3 gap-2 sm:gap-3" : difficulty === "normal" ? "grid-cols-4 gap-2 sm:gap-3" : "grid-cols-6 gap-1.5 sm:gap-2";
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
    if (recentMatch) {
      return "Nice match!";
    }
    return "Find the pairs!";
  }, [gameState, recentMatch]);

  const statusTone =
    gameState === "won"
      ? "border-emerald-200/45 bg-emerald-300/15 text-emerald-100"
      : recentMatch
        ? "border-cyan-200/45 bg-cyan-300/15 text-cyan-100"
        : "";

  const clearFlipBackTimer = useCallback(() => {
    if (flipBackTimerRef.current !== null) {
      window.clearTimeout(flipBackTimerRef.current);
      flipBackTimerRef.current = null;
    }
  }, []);

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
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
      clearStatusTimer();
      clearConfettiTimer();

      const nextDeck = buildDeck(nextDifficulty);
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
      setRecentMatch(false);
      setShowConfetti(false);
      hasAwardedWinRef.current = false;
    },
    [clearConfettiTimer, clearFlipBackTimer, clearStatusTimer],
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

  const handleDifficultyChange = (nextDifficulty: Difficulty) => {
    if (nextDifficulty === difficultyRef.current) {
      return;
    }

    difficultyRef.current = nextDifficulty;
    setDifficulty(nextDifficulty);
    resetBoard(nextDifficulty);
  };

  const handleCardPress = (index: number) => {
    if (lockBoardRef.current || gameStateRef.current === "won") {
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

      setRecentMatch(true);
      clearStatusTimer();
      statusTimerRef.current = window.setTimeout(() => {
        setRecentMatch(false);
        statusTimerRef.current = null;
      }, 700);

      if (nextMatchCount === CARD_VALUES[difficultyRef.current].length) {
        gameStateRef.current = "won";
        lockBoardRef.current = true;
        setGameState("won");
        setLockBoard(true);
        setRecentMatch(false);

        setShowConfetti(true);
        clearConfettiTimer();
        confettiTimerRef.current = window.setTimeout(() => {
          setShowConfetti(false);
          confettiTimerRef.current = null;
        }, 900);

        if (!hasAwardedWinRef.current) {
          addStars(1);
          markPlayedToday();
          hasAwardedWinRef.current = true;
        }

        saveBestIfNeeded(difficultyRef.current, nextMoveCount);
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

    setBestMoves({
      easy: parseStoredBest(window.localStorage.getItem(BEST_KEYS.easy)),
      normal: parseStoredBest(window.localStorage.getItem(BEST_KEYS.normal)),
      hard: parseStoredBest(window.localStorage.getItem(BEST_KEYS.hard)),
    });
  }, []);

  useEffect(() => {
    return () => {
      clearFlipBackTimer();
      clearStatusTimer();
      clearConfettiTimer();
    };
  }, [clearConfettiTimer, clearFlipBackTimer, clearStatusTimer]);

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Memory Match</h2>
              <p className={`text-sm ${arcade.subtleText}`}>Flip cards and find every pair.</p>
            </div>
            <span className={`${arcade.chip} ${statusTone}`}>{statusText}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={arcade.chip}>
              Moves: <strong className="font-black text-white">{moves}</strong>
            </span>
            <span className={arcade.chip}>
              Matches:{" "}
              <strong className="font-black text-white">
                {matches}/{totalPairs}
              </strong>
            </span>
            <span className={arcade.chip}>
              Best: <strong className="font-black text-cyan-100">{currentBest ?? "--"}</strong>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                Easy (3x4)
              </button>
              <button
                type="button"
                onClick={() => handleDifficultyChange("normal")}
                aria-pressed={difficulty === "normal"}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  difficulty === "normal"
                    ? "bg-violet-400 text-violet-50 shadow-[0_0_12px_rgba(167,139,250,0.45)]"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                Normal (4x4)
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
                Hard (6x6)
              </button>
            </div>
            <button
              type="button"
              onClick={() => resetBoard(difficultyRef.current)}
              className={arcade.secondaryButton}
            >
              Reset
            </button>
          </div>
        </div>

        {gameState === "won" ? (
          <div className="mt-3 rounded-xl border border-emerald-200/40 bg-emerald-300/15 px-4 py-3 text-center text-sm font-semibold text-emerald-100">
            You matched all pairs in {moves} moves!
          </div>
        ) : null}

        <div className={`${arcade.panel} relative mt-4`}>
          {showConfetti ? (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
              {CONFETTI_PIECES.map((piece, index) => (
                <span
                  key={index}
                  className="confetti-piece absolute top-0 h-2.5 w-2 rounded-sm"
                  style={{
                    left: piece.left,
                    backgroundColor: piece.color,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    transform: `rotate(${piece.rotate}deg)`,
                  }}
                />
              ))}
            </div>
          ) : null}

          <div className={`grid ${gridClass} ${lockBoard ? "pointer-events-none" : ""}`}>
            {cards.map((card, index) => {
              const isFaceUp = card.isFlipped || card.isMatched;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardPress(index)}
                  disabled={lockBoard || card.isMatched || card.isFlipped || gameState === "won"}
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
                  <span className={`memory-inner ${isFaceUp ? "is-open" : ""}`}>
                    <span className="memory-face memory-front">
                      <span className={`${difficulty === "hard" ? "text-base" : "text-xl"} text-violet-100/90`}>✦</span>
                    </span>
                    <span className="memory-face memory-back">
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
            <div className="mt-4">
              <button
                type="button"
                onClick={() => resetBoard(difficultyRef.current)}
                className={`${arcade.primaryButton} w-full py-3 text-base`}
              >
                Play Again
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .memory-inner {
          position: relative;
          height: 100%;
          width: 100%;
          transform-style: preserve-3d;
          transition: transform 220ms ease;
        }

        .memory-inner.is-open {
          transform: rotateY(180deg);
        }

        .memory-face {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          border-radius: 0.85rem;
        }

        .memory-front {
          background:
            radial-gradient(circle at 22% 22%, rgba(167, 139, 250, 0.28), transparent 42%),
            radial-gradient(circle at 78% 78%, rgba(34, 211, 238, 0.2), transparent 46%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(2, 6, 23, 0.95) 100%);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
        }

        .memory-back {
          transform: rotateY(180deg);
          background: linear-gradient(180deg, rgba(88, 28, 135, 0.34) 0%, rgba(15, 23, 42, 0.96) 100%);
          box-shadow: inset 0 0 0 1px rgba(196, 181, 253, 0.28);
        }

        .confetti-piece {
          animation-name: confetti-fall;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
          opacity: 0;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-8px) rotate(0deg);
            opacity: 0;
          }
          14% {
            opacity: 1;
          }
          100% {
            transform: translateY(220px) rotate(200deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

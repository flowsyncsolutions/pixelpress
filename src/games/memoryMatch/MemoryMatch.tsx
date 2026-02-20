"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addStars, markPlayedToday } from "@/src/lib/progress";
import { safeGet, safeSet } from "@/src/lib/storageGuard";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";
import { getUnlockedFeatures } from "@/src/lib/unlocks";
import { getMemoryMatchTheme } from "@/src/lib/variants";

type Difficulty = "easy" | "normal" | "hard";
type GameState = "ready" | "playing" | "won";
type FeedbackState = "match" | "mismatch" | null;
type BestRecord = Record<Difficulty, number | null>;

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

const BEST_MOVES_KEYS: Record<Difficulty, string> = {
  easy: "pp_memory_best_easy_moves",
  normal: "pp_memory_best_normal_moves",
  hard: "pp_memory_best_hard_moves",
};

const BEST_TIME_KEYS: Record<Difficulty, string> = {
  easy: "pp_memory_best_easy_time",
  normal: "pp_memory_best_normal_time",
  hard: "pp_memory_best_hard_time",
};

const LEGACY_BEST_KEYS: Record<Difficulty, string> = {
  easy: "pp_memory_best_easy",
  normal: "pp_memory_best_normal",
  hard: "pp_memory_best_hard",
};

const MISMATCH_FLIP_BACK_MS = 650;
const FEEDBACK_DURATION_MS = 620;
const ELAPSED_TICK_MS = 100;

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

function pickUnique(values: string[], count: number, fallback: string[]): string[] {
  const unique = Array.from(new Set(values));
  if (unique.length >= count) {
    return unique.slice(0, count);
  }

  for (const candidate of fallback) {
    if (!unique.includes(candidate)) {
      unique.push(candidate);
    }
    if (unique.length >= count) {
      break;
    }
  }

  return unique.slice(0, count);
}

function getCardValuesForTheme(themeId?: string): Record<Difficulty, string[]> {
  const theme = getMemoryMatchTheme(themeId);
  if (!theme) {
    return DEFAULT_CARD_VALUES;
  }

  const hard = pickUnique(theme.emojis, DEFAULT_CARD_VALUES.hard.length, DEFAULT_CARD_VALUES.hard);
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

function parseStoredPositiveInt(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function readBestMoves(mode: Difficulty): number | null {
  const current = parseStoredPositiveInt(safeGet(BEST_MOVES_KEYS[mode], ""));
  if (current !== null) {
    return current;
  }

  const legacy = parseStoredPositiveInt(safeGet(LEGACY_BEST_KEYS[mode], ""));
  if (legacy !== null) {
    safeSet(BEST_MOVES_KEYS[mode], String(legacy));
  }
  return legacy;
}

function readBestTime(mode: Difficulty): number | null {
  return parseStoredPositiveInt(safeGet(BEST_TIME_KEYS[mode], ""));
}

function createEmptyBestRecord(): BestRecord {
  return { easy: null, normal: null, hard: null };
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
  const [elapsedMs, setElapsedMs] = useState(0);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>(null);
  const [lockBoard, setLockBoard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [memoryHardUnlocked, setMemoryHardUnlocked] = useState(false);
  const [bestMoves, setBestMoves] = useState<BestRecord>(createEmptyBestRecord);
  const [bestTimes, setBestTimes] = useState<BestRecord>(createEmptyBestRecord);

  const cardsRef = useRef<Card[]>(cards);
  const flippedIndexesRef = useRef<number[]>(flippedIndexes);
  const movesRef = useRef(moves);
  const matchesRef = useRef(matches);
  const elapsedMsRef = useRef(elapsedMs);
  const gameStateRef = useRef<GameState>(gameState);
  const lockBoardRef = useRef(lockBoard);
  const difficultyRef = useRef<Difficulty>(difficulty);
  const bestMovesRef = useRef<BestRecord>(createEmptyBestRecord());
  const bestTimesRef = useRef<BestRecord>(createEmptyBestRecord());

  const flipBackTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const confettiTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const tapFrameGuardRef = useRef(false);
  const hasAwardedWinRef = useRef(false);
  const hasReportedCompleteRef = useRef(false);

  const totalPairs = cardValues[difficulty].length;
  const currentBestMoves = bestMoves[difficulty];
  const currentBestTime = bestTimes[difficulty];
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
    if (feedbackState === "match") {
      return "Nice match!";
    }
    if (feedbackState === "mismatch") {
      return "Try again!";
    }
    if (gameState === "ready") {
      return "Find the pairs!";
    }
    return "Keep matching!";
  }, [feedbackState, gameState]);

  const statusClass = useMemo(() => {
    if (gameState === "won" || feedbackState === "match") {
      return arcade.badgeLive;
    }
    if (feedbackState === "mismatch") {
      return "border-amber-200/45 bg-amber-400/15 text-amber-100";
    }
    return "";
  }, [feedbackState, gameState]);

  const clearFlipBackTimer = useCallback(() => {
    if (flipBackTimerRef.current !== null) {
      window.clearTimeout(flipBackTimerRef.current);
      flipBackTimerRef.current = null;
    }
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const clearConfettiTimer = useCallback(() => {
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
  }, []);

  const clearElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const stopElapsedTimer = useCallback(() => {
    clearElapsedTimer();
    startedAtRef.current = null;
  }, [clearElapsedTimer]);

  const getElapsedNow = useCallback(() => {
    if (startedAtRef.current === null) {
      return elapsedMsRef.current;
    }
    return Math.max(0, Date.now() - startedAtRef.current);
  }, []);

  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current !== null) {
      return;
    }

    startedAtRef.current = Date.now() - elapsedMsRef.current;
    elapsedTimerRef.current = window.setInterval(() => {
      if (startedAtRef.current === null) {
        return;
      }
      const nextElapsed = Math.max(0, Date.now() - startedAtRef.current);
      elapsedMsRef.current = nextElapsed;
      setElapsedMs(nextElapsed);
    }, ELAPSED_TICK_MS);
  }, []);

  const showFeedback = useCallback(
    (nextFeedback: FeedbackState) => {
      clearFeedbackTimer();
      setFeedbackState(nextFeedback);
      if (!nextFeedback) {
        return;
      }

      feedbackTimerRef.current = window.setTimeout(() => {
        setFeedbackState(null);
        feedbackTimerRef.current = null;
      }, FEEDBACK_DURATION_MS);
    },
    [clearFeedbackTimer],
  );

  const loadBestRecords = useCallback(() => {
    const nextBestMoves: BestRecord = {
      easy: readBestMoves("easy"),
      normal: readBestMoves("normal"),
      hard: readBestMoves("hard"),
    };
    const nextBestTimes: BestRecord = {
      easy: readBestTime("easy"),
      normal: readBestTime("normal"),
      hard: readBestTime("hard"),
    };

    bestMovesRef.current = nextBestMoves;
    bestTimesRef.current = nextBestTimes;
    setBestMoves(nextBestMoves);
    setBestTimes(nextBestTimes);
  }, []);

  const saveBestIfNeeded = useCallback((mode: Difficulty, finalMoves: number, finalElapsedMs: number) => {
    const currentMoves = bestMovesRef.current[mode];
    const currentTime = bestTimesRef.current[mode];
    const nextElapsed = Math.max(1, Math.floor(finalElapsedMs));

    if (currentMoves === null || finalMoves < currentMoves) {
      const nextMoves = { ...bestMovesRef.current, [mode]: finalMoves };
      bestMovesRef.current = nextMoves;
      setBestMoves(nextMoves);
      safeSet(BEST_MOVES_KEYS[mode], String(finalMoves));
    }

    if (currentTime === null || nextElapsed < currentTime) {
      const nextTimes = { ...bestTimesRef.current, [mode]: nextElapsed };
      bestTimesRef.current = nextTimes;
      setBestTimes(nextTimes);
      safeSet(BEST_TIME_KEYS[mode], String(nextElapsed));
    }
  }, []);

  const syncUnlockState = useCallback(() => {
    const unlocked = getUnlockedFeatures();
    setMemoryHardUnlocked(unlocked.memoryHardUnlocked);
  }, []);

  const resetBoard = useCallback(
    (nextDifficulty: Difficulty) => {
      clearFlipBackTimer();
      clearFeedbackTimer();
      clearConfettiTimer();
      stopElapsedTimer();

      const nextDeck = buildDeck(nextDifficulty, cardValues);
      cardsRef.current = nextDeck;
      flippedIndexesRef.current = [];
      movesRef.current = 0;
      matchesRef.current = 0;
      elapsedMsRef.current = 0;
      gameStateRef.current = "ready";
      lockBoardRef.current = false;

      setCards(nextDeck);
      setFlippedIndexes([]);
      setMoves(0);
      setMatches(0);
      setElapsedMs(0);
      setGameState("ready");
      setFeedbackState(null);
      setLockBoard(false);
      setShowConfetti(false);
      hasAwardedWinRef.current = false;
      hasReportedCompleteRef.current = false;
    },
    [cardValues, clearConfettiTimer, clearFeedbackTimer, clearFlipBackTimer, stopElapsedTimer],
  );

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
    if (tapFrameGuardRef.current) {
      return;
    }
    tapFrameGuardRef.current = true;
    window.requestAnimationFrame(() => {
      tapFrameGuardRef.current = false;
    });

    if (lockBoardRef.current || gameStateRef.current === "won" || isTimeUp) {
      return;
    }

    const currentCards = cardsRef.current;
    const selectedCard = currentCards[index];
    if (!selectedCard || selectedCard.isFlipped || selectedCard.isMatched) {
      return;
    }

    const currentlyFlipped = flippedIndexesRef.current;
    if (currentlyFlipped.length >= 2 || currentlyFlipped.includes(index)) {
      return;
    }

    if (gameStateRef.current === "ready") {
      gameStateRef.current = "playing";
      setGameState("playing");
      startElapsedTimer();
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
      showFeedback("match");

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
        const finalElapsed = getElapsedNow();
        elapsedMsRef.current = finalElapsed;
        setElapsedMs(finalElapsed);
        stopElapsedTimer();

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

        saveBestIfNeeded(difficultyRef.current, nextMoveCount, finalElapsed);

        if (!hasReportedCompleteRef.current) {
          hasReportedCompleteRef.current = true;
          onComplete?.();
        }
      }

      return;
    }

    showFeedback("mismatch");
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
    }, MISMATCH_FLIP_BACK_MS);
  };

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    flippedIndexesRef.current = flippedIndexes;
  }, [flippedIndexes]);

  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  useEffect(() => {
    elapsedMsRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    lockBoardRef.current = lockBoard;
  }, [lockBoard]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromStorage = () => {
      syncUnlockState();
      loadBestRecords();
    };

    syncFromStorage();
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [loadBestRecords, syncUnlockState]);

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
    if (!isTimeUp) {
      return;
    }
    stopElapsedTimer();
  }, [isTimeUp, stopElapsedTimer]);

  useEffect(() => {
    return () => {
      clearFlipBackTimer();
      clearFeedbackTimer();
      clearConfettiTimer();
      stopElapsedTimer();
    };
  }, [clearConfettiTimer, clearFeedbackTimer, clearFlipBackTimer, stopElapsedTimer]);

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow relative`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Memory Match</h2>
              <p className={`text-sm ${arcade.subtleText}`}>Find the pairs! Flip cards and match every icon.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusClass}`}>{statusText}</span>
              <span className={arcade.chip}>
                Moves: <strong className="font-black text-white">{moves}</strong>
              </span>
              <span className={arcade.chip}>
                Time: <strong className="font-black text-white">{formatDuration(elapsedMs)}</strong>
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
              Best Moves:{" "}
              <strong className="font-black text-cyan-100">{currentBestMoves ?? "--"}</strong>
            </span>
            <span className={arcade.chip}>
              Best Time:{" "}
              <strong className="font-black text-cyan-100">
                {currentBestTime ? formatDuration(currentBestTime) : "--"}
              </strong>
            </span>
          </div>
        </div>

        <div className={`${arcade.panel} relative mt-4`}>
          <ConfettiBurst active={showConfetti} className="rounded-2xl" />

          <div
            className={`grid ${gridClass} ${lockBoard || isTimeUp ? "pointer-events-none" : ""}`}
            style={{ touchAction: gameState === "playing" ? "none" : "manipulation" }}
          >
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
                  } ${cardSizeClass} overflow-hidden ${card.isMatched ? "pp-memory-matched" : ""}`}
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
              subtitle="All pairs found. Great matching!"
              stats={[
                { label: "Moves", value: moves },
                { label: "Time", value: formatDuration(elapsedMs) },
                { label: "Best Moves", value: currentBestMoves ?? "--" },
                { label: "Best Time", value: currentBestTime ? formatDuration(currentBestTime) : "--" },
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
          transition: transform 260ms cubic-bezier(0.22, 0.85, 0.3, 1);
          will-change: transform;
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
          border-radius: 0.85rem;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .pp-memory-front {
          position: relative;
          background:
            radial-gradient(circle at 18% 18%, rgba(167, 139, 250, 0.26), transparent 46%),
            radial-gradient(circle at 82% 82%, rgba(34, 211, 238, 0.2), transparent 48%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.98) 100%);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
          overflow: hidden;
        }

        .pp-memory-front::after {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 0.65rem;
          background:
            repeating-linear-gradient(
              135deg,
              rgba(167, 139, 250, 0.16) 0 8px,
              rgba(34, 211, 238, 0.08) 8px 16px
            );
          opacity: 0.55;
        }

        .pp-memory-front > span {
          position: relative;
          z-index: 1;
        }

        .pp-memory-back {
          transform: rotateY(180deg);
          background: linear-gradient(180deg, rgba(88, 28, 135, 0.34) 0%, rgba(15, 23, 42, 0.96) 100%);
          box-shadow: inset 0 0 0 1px rgba(196, 181, 253, 0.3);
        }

        .pp-memory-matched {
          border-color: rgba(167, 243, 208, 0.9);
          background: rgba(16, 185, 129, 0.12);
          box-shadow:
            0 0 0 1px rgba(110, 231, 183, 0.45),
            0 0 22px rgba(52, 211, 153, 0.26);
          animation: pp-memory-lock-in 260ms ease-out;
        }

        @keyframes pp-memory-lock-in {
          0% {
            transform: scale(0.98);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

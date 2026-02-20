"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfettiBurst from "@/src/components/ConfettiBurst";
import GameEndOverlay from "@/src/components/GameEndOverlay";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { arcade } from "@/src/lib/arcadeSkin";
import { addStars, markPlayedToday } from "@/src/lib/progress";
import { getTimeState, resetIfNewDay, startSessionTick } from "@/src/lib/timeLimit";

type Mark = "X" | "O" | null;
type Winner = "X" | "O" | null;
type Board = Mark[];
type Difficulty = "easy";
type PlayerMark = Exclude<Mark, null>;

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const INITIAL_BOARD: Board = Array(9).fill(null);

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function getOpponent(mark: PlayerMark): PlayerMark {
  return mark === "X" ? "O" : "X";
}

export function calculateWinner(board: Board): { winner: Winner; line: number[] | null } {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

export function getAvailableMoves(board: Board): number[] {
  return board
    .map((value, index) => (value === null ? index : -1))
    .filter((index) => index !== -1);
}

function getEasyAiMove(board: Board, aiMark: PlayerMark, playerMark: PlayerMark): number | null {
  const availableMoves = getAvailableMoves(board);

  for (const move of availableMoves) {
    const testBoard = [...board];
    testBoard[move] = aiMark;
    if (calculateWinner(testBoard).winner === aiMark) {
      return move;
    }
  }

  for (const move of availableMoves) {
    const testBoard = [...board];
    testBoard[move] = playerMark;
    if (calculateWinner(testBoard).winner === playerMark) {
      return move;
    }
  }

  if (board[4] === null) {
    return 4;
  }

  const corners = [0, 2, 6, 8].filter((corner) => board[corner] === null);
  const randomCorner = pickRandom(corners);
  if (randomCorner !== null) {
    return randomCorner;
  }

  return pickRandom(availableMoves);
}

function countMarks(board: Board, mark: PlayerMark): number {
  return board.filter((cell) => cell === mark).length;
}

function isTurnForMark(board: Board, mark: PlayerMark): boolean {
  const xCount = countMarks(board, "X");
  const oCount = countMarks(board, "O");
  return mark === "X" ? xCount === oCount : xCount > oCount;
}

function MarkPiece({ mark }: { mark: PlayerMark }) {
  if (mark === "X") {
    return (
      <div className="pp-mark-pop relative h-12 w-12 sm:h-14 sm:w-14" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-2.5 w-full -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.75)]" />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-full -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.75)]" />
      </div>
    );
  }

  return (
    <div
      className="pp-mark-pop h-12 w-12 rounded-full border-[8px] border-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)] sm:h-14 sm:w-14"
      aria-hidden="true"
    />
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: "120ms" }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: "240ms" }} />
    </span>
  );
}

export default function TicTacToe() {
  const router = useRouter();
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [playerMark, setPlayerMark] = useState<PlayerMark>("X");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const confettiTimerRef = useRef<number | null>(null);
  const hasAwardedWinRef = useRef(false);

  const aiMark = useMemo(() => getOpponent(playerMark), [playerMark]);
  const winnerData = useMemo(() => calculateWinner(board), [board]);
  const availableMoves = useMemo(() => getAvailableMoves(board), [board]);
  const hasStarted = useMemo(() => board.some((cell) => cell !== null), [board]);
  const isDraw = !winnerData.winner && availableMoves.length === 0;
  const isGameOver = Boolean(winnerData.winner) || isDraw;
  const movesPlayed = 9 - availableMoves.length;

  const statusText = useMemo(() => {
    if (winnerData.winner === playerMark) {
      return "You win!";
    }
    if (winnerData.winner === aiMark) {
      return "Good try!";
    }
    if (isDraw) {
      return "Draw — rematch?";
    }
    if (isAiThinking) {
      return "Bot thinking...";
    }
    if (!hasStarted) {
      return "Tap to start";
    }
    return "You got this";
  }, [winnerData.winner, playerMark, aiMark, isDraw, isAiThinking, hasStarted]);

  const statusClass =
    winnerData.winner === playerMark
      ? arcade.badgeLive
      : winnerData.winner === aiMark || isDraw
        ? arcade.badgeSoon
        : isAiThinking
          ? "border-cyan-200/40 bg-cyan-300/15 text-cyan-100"
          : "";

  useEffect(() => {
    if (isGameOver || isAiThinking) {
      return;
    }
    if (!isTurnForMark(board, aiMark)) {
      return;
    }
    setIsAiThinking(true);
  }, [board, aiMark, isAiThinking, isGameOver]);

  useEffect(() => {
    if (!isAiThinking || isGameOver) {
      return;
    }

    const delay = 260 + Math.floor(Math.random() * 181);
    const timer = window.setTimeout(() => {
      const move = getEasyAiMove(board, aiMark, playerMark);
      if (move !== null) {
        setBoard((previous) => {
          if (previous[move] !== null) {
            return previous;
          }
          const next = [...previous];
          next[move] = aiMark;
          return next;
        });
      }
      setIsAiThinking(false);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [board, isAiThinking, isGameOver, aiMark, playerMark, difficulty]);

  useEffect(() => {
    if (winnerData.winner !== playerMark) {
      return;
    }

    setShowConfetti(true);
    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
    }
    confettiTimerRef.current = window.setTimeout(() => {
      setShowConfetti(false);
      confettiTimerRef.current = null;
    }, 900);
  }, [winnerData.winner, playerMark]);

  useEffect(() => {
    if (winnerData.winner !== playerMark || hasAwardedWinRef.current) {
      return;
    }

    addStars(1);
    markPlayedToday();
    hasAwardedWinRef.current = true;
  }, [winnerData.winner, playerMark]);

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
    if (isTimeUp || !hasStarted || isGameOver) {
      return;
    }

    resetIfNewDay();
    return startSessionTick();
  }, [isTimeUp, hasStarted, isGameOver]);

  useEffect(() => {
    return () => {
      if (confettiTimerRef.current !== null) {
        window.clearTimeout(confettiTimerRef.current);
      }
    };
  }, []);

  const handleCellPress = (index: number) => {
    if (isAiThinking || isGameOver || board[index] !== null || isTimeUp) {
      return;
    }
    if (!isTurnForMark(board, playerMark)) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = playerMark;
    setBoard(nextBoard);

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  };

  const handleReset = () => {
    setBoard(INITIAL_BOARD);
    setIsAiThinking(false);
    setShowConfetti(false);
    setDifficulty("easy");
    hasAwardedWinRef.current = false;
  };

  const handleSwapSides = () => {
    setPlayerMark((previous) => (previous === "X" ? "O" : "X"));
    setBoard(INITIAL_BOARD);
    setIsAiThinking(false);
    setShowConfetti(false);
    hasAwardedWinRef.current = false;
  };

  return (
    <div className={arcade.pageWrap}>
      <div className={`${arcade.gameFrame} arcade-glow relative`}>
        <div className={arcade.headerBar}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={`text-xl font-black ${arcade.glowText}`}>Tic Tac Toe</h2>
              <p className={`text-sm ${arcade.subtleText}`}>Classic 3x3 strategy rounds.</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={`${arcade.chip} ${statusClass}`}>
                <span>{statusText}</span>
                {isAiThinking ? <ThinkingDots /> : null}
              </span>
              <span className={arcade.chip}>
                Moves: <strong className="font-black text-white">{movesPlayed}</strong>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleReset} className={arcade.primaryButton}>
              Play Again
            </button>
            <div className="inline-flex rounded-xl border border-slate-200/20 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setDifficulty("easy")}
                aria-pressed={difficulty === "easy"}
                className="rounded-md bg-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-950"
              >
                Easy
              </button>
            </div>
            <button type="button" onClick={handleSwapSides} className={arcade.secondaryButton}>
              Swap Sides
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`${arcade.chip} border-violet-200/35 bg-violet-300/15 text-violet-100`}>
              <span className="h-2 w-2 rounded-full bg-violet-300" />
              You: {playerMark}
            </span>
            <span className={`${arcade.chip} border-cyan-200/35 bg-cyan-300/15 text-cyan-100`}>
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Bot: {aiMark}
            </span>
          </div>
        </div>

        <div className={`${arcade.panel} relative mt-4`}>
          <ConfettiBurst active={showConfetti} className="rounded-2xl" />

          <div className={`grid grid-cols-3 gap-3 ${isAiThinking || isTimeUp ? "pointer-events-none opacity-90" : ""}`}>
            {board.map((cell, index) => {
              const isWinningCell = winnerData.line?.includes(index) ?? false;
              const cellPressed = cell !== null;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleCellPress(index)}
                  disabled={isAiThinking || isGameOver || cell !== null || isTimeUp}
                  className={`${arcade.tileButton} ${
                    cellPressed ? arcade.tileButtonPressed : ""
                  } ${
                    isWinningCell
                      ? "border-emerald-200 bg-emerald-400/25 shadow-[0_0_0_1px_rgba(110,231,183,0.6),0_0_22px_rgba(52,211,153,0.45)]"
                      : ""
                  } ${isAiThinking || isGameOver || cell !== null || isTimeUp ? "cursor-default" : "cursor-pointer"}`}
                  aria-label={`Cell ${index + 1}`}
                >
                  {cell ? <MarkPiece mark={cell} /> : null}
                </button>
              );
            })}
          </div>

          {isGameOver ? (
            <GameEndOverlay
              title={
                winnerData.winner === playerMark
                  ? "You win!"
                  : winnerData.winner === aiMark
                    ? "Good try!"
                    : "Draw — rematch?"
              }
              subtitle={
                winnerData.winner === playerMark
                  ? "Great strategy round."
                  : winnerData.winner === aiMark
                    ? "The bot got this one."
                    : "Even match. Run it back."
              }
              stats={[
                { label: "Moves", value: movesPlayed },
                { label: "You", value: playerMark },
                { label: "Bot", value: aiMark },
              ]}
              onPrimary={handleReset}
              onSecondary={() => router.push("/play")}
            />
          ) : null}
        </div>

        {isTimeUp ? <TimeUpOverlay backHref="/play" /> : null}
      </div>

      <style jsx>{`
        .pp-mark-pop {
          animation: pp-mark-pop 180ms ease-out both;
        }

        @keyframes pp-mark-pop {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

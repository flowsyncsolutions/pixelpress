"use client";

import { useEffect, useMemo, useState } from "react";

type Mark = "X" | "O" | null;
type Winner = "X" | "O" | null;
type Board = Mark[];
type Difficulty = "easy";

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

const CONFETTI_PIECES = [
  { left: "6%", color: "#f472b6", delay: "0ms", duration: "980ms", rotate: -18 },
  { left: "12%", color: "#f59e0b", delay: "40ms", duration: "920ms", rotate: 12 },
  { left: "18%", color: "#a78bfa", delay: "80ms", duration: "1020ms", rotate: -8 },
  { left: "26%", color: "#22d3ee", delay: "20ms", duration: "960ms", rotate: 16 },
  { left: "31%", color: "#fb7185", delay: "120ms", duration: "900ms", rotate: -12 },
  { left: "38%", color: "#34d399", delay: "60ms", duration: "1080ms", rotate: 22 },
  { left: "44%", color: "#fde047", delay: "30ms", duration: "950ms", rotate: -22 },
  { left: "50%", color: "#38bdf8", delay: "90ms", duration: "1030ms", rotate: 10 },
  { left: "56%", color: "#f472b6", delay: "160ms", duration: "860ms", rotate: -16 },
  { left: "62%", color: "#22d3ee", delay: "50ms", duration: "980ms", rotate: 14 },
  { left: "68%", color: "#a78bfa", delay: "100ms", duration: "1060ms", rotate: -14 },
  { left: "74%", color: "#f59e0b", delay: "140ms", duration: "940ms", rotate: 18 },
  { left: "80%", color: "#34d399", delay: "70ms", duration: "1000ms", rotate: -10 },
  { left: "86%", color: "#fb7185", delay: "110ms", duration: "900ms", rotate: 20 },
  { left: "92%", color: "#fde047", delay: "150ms", duration: "1040ms", rotate: -20 },
];

const INITIAL_BOARD: Board = Array(9).fill(null);

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
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

function getEasyAiMove(board: Board): number | null {
  const availableMoves = getAvailableMoves(board);

  for (const move of availableMoves) {
    const testBoard = [...board];
    testBoard[move] = "O";
    if (calculateWinner(testBoard).winner === "O") {
      return move;
    }
  }

  for (const move of availableMoves) {
    const testBoard = [...board];
    testBoard[move] = "X";
    if (calculateWinner(testBoard).winner === "X") {
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

function MarkPiece({ mark }: { mark: Exclude<Mark, null> }) {
  if (mark === "X") {
    return (
      <div className="mark-pop relative h-12 w-12 sm:h-14 sm:w-14" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-full -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.7)]" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-full -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.7)]" />
      </div>
    );
  }

  return (
    <div
      className="mark-pop h-12 w-12 rounded-full border-[8px] border-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.7)] sm:h-14 sm:w-14"
      aria-hidden="true"
    />
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true">
      <span
        className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  );
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasCelebratedWin, setHasCelebratedWin] = useState(false);

  const winnerData = useMemo(() => calculateWinner(board), [board]);
  const availableMoves = useMemo(() => getAvailableMoves(board), [board]);
  const isDraw = !winnerData.winner && availableMoves.length === 0;
  const isGameOver = Boolean(winnerData.winner) || isDraw;

  const statusText = useMemo(() => {
    if (winnerData.winner === "X") {
      return "You win!";
    }
    if (winnerData.winner === "O") {
      return "Nice try!";
    }
    if (isDraw) {
      return "Draw";
    }
    if (isAiThinking) {
      return "Bot thinking...";
    }
    return "Your turn";
  }, [winnerData.winner, isDraw, isAiThinking]);

  const resultSubtitle = useMemo(() => {
    if (winnerData.winner === "X") {
      return "Great move! You outsmarted the bot.";
    }
    if (winnerData.winner === "O") {
      return "Good effort. One more round?";
    }
    if (isDraw) {
      return "So close. Try a different opening.";
    }
    return null;
  }, [winnerData.winner, isDraw]);

  useEffect(() => {
    if (!isAiThinking || isGameOver) {
      return;
    }

    const delay = 250 + Math.floor(Math.random() * 201);
    const timer = window.setTimeout(() => {
      const move = getEasyAiMove(board);
      if (move !== null) {
        setBoard((previous) => {
          if (previous[move] !== null) {
            return previous;
          }
          const next = [...previous];
          next[move] = "O";
          return next;
        });
      }
      setIsAiThinking(false);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [board, isAiThinking, isGameOver, difficulty]);

  useEffect(() => {
    if (winnerData.winner !== "X" || hasCelebratedWin) {
      return;
    }

    setHasCelebratedWin(true);
    setShowConfetti(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 1100);

    return () => window.clearTimeout(timer);
  }, [winnerData.winner, hasCelebratedWin]);

  const handleCellPress = (index: number) => {
    if (isAiThinking || isGameOver || board[index] !== null) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = "X";
    setBoard(nextBoard);

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }

    const nextWinner = calculateWinner(nextBoard).winner;
    const nextMoves = getAvailableMoves(nextBoard);
    if (!nextWinner && nextMoves.length > 0) {
      setIsAiThinking(true);
    }
  };

  const handleReset = () => {
    setBoard(INITIAL_BOARD);
    setIsAiThinking(false);
    setDifficulty("easy");
    setShowConfetti(false);
    setHasCelebratedWin(false);
  };

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-2xl border border-slate-200/15 bg-slate-900/95 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.45)] sm:p-5">
      <div className="mb-4 rounded-xl border border-slate-200/15 bg-slate-950/65 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Difficulty
              </span>
              <div className="inline-flex rounded-lg border border-slate-200/20 bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setDifficulty("easy")}
                  aria-pressed={difficulty === "easy"}
                  className="rounded-md bg-emerald-300 px-3 py-1 text-sm font-semibold text-emerald-950"
                >
                  Easy
                </button>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
              <span>{statusText}</span>
              {isAiThinking ? <ThinkingDots /> : null}
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-violet-50 transition hover:bg-violet-400 active:scale-[0.98]"
          >
            Play again
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/35 bg-violet-300/15 px-3 py-1 text-xs font-semibold text-violet-100">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-300" />
            You: X
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-300/15 px-3 py-1 text-xs font-semibold text-cyan-100">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-300" />
            Bot: O
          </span>
        </div>
      </div>

      {resultSubtitle ? (
        <p className="mb-3 text-center text-sm font-medium text-slate-200">{resultSubtitle}</p>
      ) : null}

      <div className="relative rounded-2xl border border-slate-200/20 bg-slate-950/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {showConfetti ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
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

        <div
          className={`grid grid-cols-3 gap-3 ${
            isAiThinking ? "pointer-events-none opacity-90" : ""
          }`}
        >
          {board.map((cell, index) => {
            const isWinningCell = winnerData.line?.includes(index) ?? false;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleCellPress(index)}
                disabled={isAiThinking || isGameOver || cell !== null}
                className={`relative flex aspect-square items-center justify-center rounded-2xl border-2 transition ${
                  isWinningCell
                    ? "border-emerald-200 bg-emerald-400/25 shadow-[0_0_0_1px_rgba(110,231,183,0.6),0_0_22px_rgba(52,211,153,0.45)]"
                    : "border-slate-300/25 bg-slate-900/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_16px_rgba(2,6,23,0.45)] hover:border-violet-300/70 hover:shadow-[0_0_0_1px_rgba(196,181,253,0.35),0_0_18px_rgba(139,92,246,0.3)] active:scale-[0.97]"
                } ${isAiThinking || isGameOver || cell !== null ? "cursor-default" : "cursor-pointer"}`}
                aria-label={`Cell ${index + 1}`}
              >
                {cell ? <MarkPiece mark={cell} /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .mark-pop {
          animation: mark-pop 220ms ease-out both;
        }

        .confetti-piece {
          animation-name: confetti-fall;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
          opacity: 0;
        }

        @keyframes mark-pop {
          0% {
            transform: scale(0.55);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-8px) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translateY(220px) rotate(190deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

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

const INITIAL_BOARD: Board = Array(9).fill(null);

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isAiThinking, setIsAiThinking] = useState(false);

  const winnerData = useMemo(() => calculateWinner(board), [board]);
  const availableMoves = useMemo(() => getAvailableMoves(board), [board]);
  const isDraw = !winnerData.winner && availableMoves.length === 0;
  const isGameOver = Boolean(winnerData.winner) || isDraw;

  const statusText = useMemo(() => {
    if (winnerData.winner === "X") {
      return "You win!";
    }
    if (winnerData.winner === "O") {
      return "You lose!";
    }
    if (isDraw) {
      return "Draw";
    }
    if (isAiThinking) {
      return "Thinking...";
    }
    return "Your turn";
  }, [winnerData.winner, isDraw, isAiThinking]);

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

  const handleCellPress = (index: number) => {
    if (isAiThinking || isGameOver || board[index] !== null) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = "X";
    setBoard(nextBoard);

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
  };

  return (
    <div className="rounded-2xl border border-slate-200/15 bg-slate-900/90 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">Difficulty</span>
          <div className="inline-flex rounded-xl border border-slate-200/20 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setDifficulty("easy")}
              aria-pressed={difficulty === "easy"}
              className="rounded-lg bg-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-950"
            >
              Easy
            </button>
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-100">{statusText}</p>
      </div>

      <div className="mx-auto grid w-full max-w-[420px] grid-cols-3 gap-3">
        {board.map((cell, index) => {
          const isWinningCell = winnerData.line?.includes(index) ?? false;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleCellPress(index)}
              disabled={isAiThinking || isGameOver || cell !== null}
              className={`aspect-square rounded-2xl border text-4xl font-black transition sm:text-5xl ${
                isWinningCell
                  ? "border-emerald-200/60 bg-emerald-400/25 text-emerald-100"
                  : "border-slate-200/20 bg-slate-950/80 text-slate-100 hover:bg-slate-800 active:scale-[0.98]"
              } ${isAiThinking || isGameOver || cell !== null ? "cursor-default" : "cursor-pointer"}`}
              aria-label={`Cell ${index + 1}`}
            >
              {cell ?? ""}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-violet-50 transition hover:bg-violet-400"
        >
          Play again
        </button>
      </div>
    </div>
  );
}

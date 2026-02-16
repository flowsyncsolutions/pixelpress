"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ExitGate from "@/src/components/ExitGate";
import {
  CATEGORIES,
  getAllGames,
  getCategoryCounts,
  getGamesByCategory,
  type GameCategory,
} from "@/src/lib/games";

const CATEGORY_LABELS: Record<GameCategory | "all", string> = {
  all: "All",
  kids: "Kids",
  classics: "Classics",
  educational: "Educational",
  puzzles: "Puzzles",
};

export default function PlayPage() {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const counts = getCategoryCounts();

  const games = useMemo(() => {
    if (selectedCategory === "all") {
      return getAllGames();
    }
    return getGamesByCategory(selectedCategory);
  }, [selectedCategory]);

  return (
    <section className="space-y-6">
      <ExitGate />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Play</h1>
        <p className="text-zinc-400">
          Kid-safe picks, trusted classics, and quick brain games in one catalog.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            selectedCategory === "all"
              ? "border-white bg-white text-black"
              : "border-white/20 text-zinc-200 hover:bg-white/10"
          }`}
        >
          {CATEGORY_LABELS.all} ({counts.all})
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              selectedCategory === category
                ? "border-white bg-white text-black"
                : "border-white/20 text-zinc-200 hover:bg-white/10"
            }`}
          >
            {CATEGORY_LABELS[category]} ({counts[category]})
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <Link
            key={game.slug}
            href={`/play/${game.slug}`}
            className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 transition hover:border-white/30 hover:bg-zinc-900/70"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-medium text-white">{game.title}</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-200">
                  {CATEGORY_LABELS[game.category]}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    game.status === "live"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {game.status === "live" ? "Live" : "Coming Soon"}
                </span>
              </div>
            </div>

            <p className="mb-4 text-sm text-zinc-400">{game.description}</p>

            <div className="flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

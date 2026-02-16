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

const CATEGORY_META: Record<GameCategory | "all", { label: string; icon: string }> = {
  all: { label: "All", icon: "🎮" },
  kids: { label: "Kids", icon: "🧸" },
  classics: { label: "Classics", icon: "🕹️" },
  educational: { label: "Educational", icon: "📚" },
  puzzles: { label: "Puzzles", icon: "🧩" },
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
    <section className="relative isolate space-y-6 pb-4">
      <ExitGate />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_16px_70px_rgba(8,145,178,0.2)]">
        <div className="pointer-events-none absolute -left-8 -top-16 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            PixelPress Catalog
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Play</h1>
          <p className="max-w-2xl text-slate-300">
            Kid-safe picks, trusted classics, and quick brain games in one catalog.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
              selectedCategory === "all"
                ? "bg-cyan-400 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.35)]"
                : "bg-slate-950/70 text-slate-200 hover:bg-slate-800"
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{CATEGORY_META.all.icon}</span>
              {CATEGORY_META.all.label}
            </span>
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{counts.all}</span>
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedCategory === category
                  ? "bg-cyan-400 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.35)]"
                  : "bg-slate-950/70 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{CATEGORY_META[category].icon}</span>
                {CATEGORY_META[category].label}
              </span>
              <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">
                {counts[category]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <Link
            key={game.slug}
            href={`/play/${game.slug}`}
            className="group flex min-h-56 flex-col rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_8px_30px_rgba(2,6,23,0.45)] transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:shadow-[0_16px_36px_rgba(34,211,238,0.2)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-200/30 bg-cyan-300/10 text-2xl">
                  <span aria-hidden="true">{game.icon}</span>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">{game.title}</h2>
                  <span className="mt-1 inline-flex rounded-full border border-cyan-200/25 bg-cyan-400/10 px-2 py-0.5 text-xs font-medium text-cyan-100">
                    {CATEGORY_META[game.category].icon} {CATEGORY_META[game.category].label}
                  </span>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  game.status === "live"
                    ? "border border-emerald-300/40 bg-emerald-400/20 text-emerald-100"
                    : "border border-amber-300/40 bg-amber-400/20 text-amber-100"
                }`}
              >
                {game.status === "live" ? "Live" : "Coming Soon"}
              </span>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-slate-300">{game.description}</p>

            <div className="mb-4 flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/10 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between text-sm">
              <span className="font-medium text-cyan-100 transition group-hover:text-cyan-50">
                Open game
              </span>
              <span
                aria-hidden="true"
                className="text-cyan-200 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

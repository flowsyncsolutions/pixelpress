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
import { ACCENT_STYLES, THEME, type AccentTone } from "@/src/lib/theme";

const CATEGORY_META: Record<
  GameCategory | "all",
  { label: string; icon: string; accent: AccentTone }
> = {
  all: { label: "All", icon: "🎮", accent: "violet" },
  kids: { label: "Kids", icon: "🧸", accent: "rose" },
  classics: { label: "Classics", icon: "🕹️", accent: "amber" },
  educational: { label: "Educational", icon: "📚", accent: "emerald" },
  puzzles: { label: "Puzzles", icon: "🧩", accent: "cyan" },
};

export default function PlayPage() {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const counts = getCategoryCounts();
  const allGames = getAllGames();
  const dailyPicks = allGames.filter((game) => game.featured).slice(0, 3);

  const games = useMemo(() => {
    if (selectedCategory === "all") {
      return allGames;
    }
    return getGamesByCategory(selectedCategory);
  }, [allGames, selectedCategory]);

  return (
    <section className="space-y-6 pb-4">
      <ExitGate />

      <div className={`${THEME.surfaces.card} ${THEME.gradients.shelf} p-5 sm:p-6`}>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
            Pocket Arcade Shelf
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Play</h1>
          <p className={`${THEME.brandColors.textMuted} max-w-2xl`}>
            Kid-safe picks, trusted classics, and quick brain games in one catalog.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className={`${THEME.surfaces.card} p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-100">Daily Picks</h2>
            <span className={`${THEME.surfaces.pill} text-slate-100`}>🔥 Streak: 0 days</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {dailyPicks.map((game) => {
              const accent = ACCENT_STYLES[game.accent];
              return (
                <Link
                  key={game.slug}
                  href={`/play/${game.slug}`}
                  className={`rounded-xl border border-slate-100/10 bg-slate-900/85 p-3 transition hover:-translate-y-0.5 ${accent.tileGlow}`}
                >
                  <div className={`mb-2 h-1.5 rounded-full ${accent.ribbon}`} />
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${accent.icon}`}
                    >
                      <span aria-hidden="true">{game.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{game.title}</p>
                      <p className="text-xs text-slate-300">Daily pick</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className={`${THEME.surfaces.card} p-5`}>
          <h2 className="mb-2 text-lg font-bold text-slate-100">Continue Playing</h2>
          <div className="rounded-xl border border-dashed border-slate-300/25 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-300">No recent sessions yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Once kids play a game, it will appear here for quick return.
            </p>
          </div>
        </div>
      </div>

      <div className={`${THEME.surfaces.card} p-2`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition ${
              selectedCategory === "all"
                ? `${ACCENT_STYLES[CATEGORY_META.all.accent].tab} shadow-[0_8px_18px_rgba(15,23,42,0.24)]`
                : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
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
                  ? `${ACCENT_STYLES[CATEGORY_META[category].accent].tab} shadow-[0_8px_18px_rgba(15,23,42,0.24)]`
                  : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
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
        {games.map((game) => {
          const accent = ACCENT_STYLES[game.accent];

          return (
            <Link
              key={game.slug}
              href={`/play/${game.slug}`}
              className={`group flex min-h-56 flex-col rounded-2xl border border-slate-100/12 bg-slate-900/88 p-4 shadow-[0_8px_24px_rgba(2,6,23,0.35)] transition hover:-translate-y-0.5 ${accent.tileGlow}`}
            >
              <div className={`mb-3 h-1.5 rounded-full ${accent.ribbon}`} />

              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${accent.icon}`}
                  >
                    <span aria-hidden="true">{game.icon}</span>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-white">{game.title}</h2>
                    <span className={`${THEME.surfaces.pill} mt-1 inline-flex text-slate-100`}>
                      {CATEGORY_META[game.category].icon} {CATEGORY_META[game.category].label}
                    </span>
                  </div>
                </div>

                <span
                  className={`${THEME.surfaces.badge} ${
                    game.status === "live"
                      ? "border-emerald-200/45 bg-emerald-300/15 text-emerald-100"
                      : "border-amber-200/45 bg-amber-300/15 text-amber-100"
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
                    className="rounded-md border border-slate-200/15 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">Tap to launch</span>
                <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${accent.button}`}>
                  Play
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

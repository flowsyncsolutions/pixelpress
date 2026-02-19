"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ExitGate from "@/src/components/ExitGate";
import GameCover from "@/src/components/GameCover";
import PlaySoftGate from "@/src/components/PlaySoftGate";
import {
  CATEGORIES,
  getAllGames,
  getCategoryCounts,
  getGamesByCategory,
  type GameCategory,
} from "@/src/lib/games";
import { getDailySeededItems, getStarsTotal, getStreak } from "@/src/lib/progress";
import { ACCENT_STYLES, THEME, type AccentTone } from "@/src/lib/theme";

const CATEGORY_META: Record<
  GameCategory | "all",
  { label: string; icon: string; accent: AccentTone }
> = {
  all: { label: "All Games", icon: "🎮", accent: "violet" },
  kids: { label: "Kids", icon: "🧸", accent: "rose" },
  classics: { label: "Classics", icon: "🕹️", accent: "amber" },
  educational: { label: "Educational", icon: "📚", accent: "emerald" },
  puzzles: { label: "Puzzles", icon: "🧩", accent: "cyan" },
};

export default function PlayPage() {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);

  const counts = getCategoryCounts();
  const allGames = useMemo(() => getAllGames(), []);
  const dailyPicks = useMemo(() => getDailySeededItems(allGames, 3), [allGames]);

  const games = useMemo(() => {
    if (selectedCategory === "all") {
      return allGames;
    }
    return getGamesByCategory(selectedCategory);
  }, [allGames, selectedCategory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncProgress = () => {
      setStars(getStarsTotal());
      setStreak(getStreak());
    };

    syncProgress();
    window.addEventListener("storage", syncProgress);
    return () => window.removeEventListener("storage", syncProgress);
  }, []);

  return (
    <section className="space-y-5 pb-5">
      <PlaySoftGate notNowHref="/play" />
      <ExitGate />

      <header className={`${THEME.surfaces.card} p-4`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Pocket Arcade</p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Game Shelf</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
              ⭐ Stars: {stars}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
              🔥 Streak: {streak}
            </span>
          </div>
        </div>
      </header>

      <section className={`${THEME.surfaces.card} p-4`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-100">Daily Picks</h2>
          <span className={`${THEME.surfaces.pill} text-slate-200`}>3 picked for today</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dailyPicks.map((game) => {
            const accent = ACCENT_STYLES[game.accent];
            return (
              <Link
                key={game.slug}
                href={`/play/${game.slug}`}
                className={`group overflow-hidden rounded-2xl border border-slate-100/12 bg-slate-900/88 shadow-[0_8px_24px_rgba(2,6,23,0.35)] transition hover:-translate-y-0.5 ${accent.tileGlow}`}
              >
                <div className={`h-1.5 ${accent.ribbon}`} />
                <div className="relative aspect-[16/9]">
                  <GameCover
                    title={game.title}
                    icon={game.icon}
                    accent={game.accent}
                    cover={game.cover}
                  />
                </div>

                <div className="p-4">
                  <p className="text-lg font-semibold text-white">{game.title}</p>
                  <p className="text-sm text-slate-300">{game.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`${THEME.surfaces.pill} text-slate-100`}>
                      {CATEGORY_META[game.category].icon} {CATEGORY_META[game.category].label}
                    </span>
                    <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${accent.button}`}>
                      Play
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className={`${THEME.surfaces.card} p-2`}>
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              selectedCategory === "all"
                ? `${ACCENT_STYLES[CATEGORY_META.all.accent].tab} shadow-[0_8px_18px_rgba(15,23,42,0.24)]`
                : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
            }`}
          >
            <span aria-hidden="true">{CATEGORY_META.all.icon}</span>
            <span>{CATEGORY_META.all.label}</span>
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{counts.all}</span>
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                selectedCategory === category
                  ? `${ACCENT_STYLES[CATEGORY_META[category].accent].tab} shadow-[0_8px_18px_rgba(15,23,42,0.24)]`
                  : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span aria-hidden="true">{CATEGORY_META[category].icon}</span>
              <span>{CATEGORY_META[category].label}</span>
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
              className={`group overflow-hidden rounded-2xl border border-slate-100/12 bg-slate-900/88 shadow-[0_8px_24px_rgba(2,6,23,0.35)] transition hover:-translate-y-0.5 ${accent.tileGlow}`}
            >
              <div className={`h-1.5 ${accent.ribbon}`} />
              <div className="relative aspect-[16/9]">
                <GameCover
                  title={game.title}
                  icon={game.icon}
                  accent={game.accent}
                  cover={game.cover}
                />
              </div>

              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xl ${accent.icon}`}
                    >
                      <span aria-hidden="true">{game.icon}</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{game.title}</p>
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

                <p className="mb-3 text-sm text-slate-300">{game.description}</p>
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

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">Tap to launch</span>
                  <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${accent.button}`}>
                    Play
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

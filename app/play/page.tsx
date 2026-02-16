"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
  all: { label: "All Games", icon: "🎮", accent: "violet" },
  kids: { label: "Kids", icon: "🧸", accent: "rose" },
  classics: { label: "Classics", icon: "🕹️", accent: "amber" },
  educational: { label: "Educational", icon: "📚", accent: "emerald" },
  puzzles: { label: "Puzzles", icon: "🧩", accent: "cyan" },
};

const SHELF_CHIPS = [
  { icon: "🌈", label: "Creative Games" },
  { icon: "🧮", label: "Applied Math" },
  { icon: "👨‍👩‍👧‍👦", label: "Family Picks" },
  { icon: "🎯", label: "Daily Games" },
  { icon: "🏫", label: "Classroom" },
  { icon: "🛡️", label: "Parent Safe" },
];

export default function PlayPage() {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const counts = getCategoryCounts();
  const allGames = getAllGames();
  const dailyPicks = allGames.filter((game) => game.featured).slice(0, 3);
  const newThisWeek = allGames.slice(0, 5);
  const whatWerePlaying = allGames.filter((game) => game.status === "live").slice(0, 5);
  const heroCards = allGames.filter((game) => game.featured).slice(0, 2);

  const games = useMemo(() => {
    if (selectedCategory === "all") {
      return allGames;
    }
    return getGamesByCategory(selectedCategory);
  }, [allGames, selectedCategory]);

  return (
    <section className="space-y-5 pb-5">
      <ExitGate />

      <header className={`${THEME.surfaces.card} p-4`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Pocket Arcade
            </p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Game Shelf</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/15 bg-slate-950/80 px-4 py-2 text-sm text-slate-200">
            <span aria-hidden="true">🔥</span>
            <span>Streak: 0 days</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SHELF_CHIPS.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            >
              <span aria-hidden="true">{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.05fr_1.25fr]">
        <section className={`${THEME.surfaces.card} p-4`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">New This Week</h2>
            <span className="text-sm font-semibold text-violet-200">See all</span>
          </div>
          <div className="space-y-3">
            {newThisWeek.map((game) => (
              <Link
                key={game.slug}
                href={`/play/${game.slug}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200/10 bg-slate-900/80 p-2 transition hover:bg-slate-800/85"
              >
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200/10">
                  <Image src={game.cover} alt={`${game.title} cover`} fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-100">{game.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-300">{game.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${THEME.surfaces.card} p-4`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">What We&apos;re Playing</h2>
            <span className={`${THEME.surfaces.pill} text-slate-100`}>Daily Picks</span>
          </div>
          <div className="space-y-3">
            {whatWerePlaying.map((game) => (
              <Link
                key={game.slug}
                href={`/play/${game.slug}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200/10 bg-slate-900/80 p-2 transition hover:bg-slate-800/85"
              >
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200/10">
                  <Image src={game.cover} alt={`${game.title} cover`} fill sizes="96px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-100">{game.title}</p>
                  <p className="text-sm text-slate-300">
                    {game.status === "live" ? "Live now" : "Coming soon"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-4">
          <section className={`${THEME.surfaces.card} p-3`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {heroCards.map((game) => (
                <Link
                  key={game.slug}
                  href={`/play/${game.slug}`}
                  className="rounded-xl border border-slate-200/10 bg-slate-900/85 transition hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[16/9] overflow-hidden rounded-t-xl">
                    <Image
                      src={game.cover}
                      alt={`${game.title} cover`}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xl font-extrabold text-white">{game.title}</p>
                    <p className="text-sm text-slate-300">{game.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={`${THEME.surfaces.card} p-4`}>
            <h2 className="mb-2 text-lg font-bold text-slate-100">Continue Playing</h2>
            <div className="rounded-xl border border-dashed border-slate-300/25 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-300">No recent sessions yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Once kids play a game, it will appear here for quick return.
              </p>
            </div>
          </section>
        </div>
      </div>

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
                <Image
                  src={game.cover}
                  alt={`${game.title} cover`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
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

      <section className={`${THEME.surfaces.card} p-4`}>
        <h2 className="mb-3 text-2xl font-black text-slate-100">Top Shelf</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allGames.slice(0, 4).map((game, index) => (
            <Link key={game.slug} href={`/play/${game.slug}`} className="overflow-hidden rounded-xl border border-slate-200/10 bg-slate-900/85 transition hover:-translate-y-0.5">
              <div className="relative aspect-[16/9]">
                <Image src={game.cover} alt={`${game.title} cover`} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="p-3">
                <div className="mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </div>
                <p className="text-lg font-bold text-white">{game.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

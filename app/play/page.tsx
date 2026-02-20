"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ExitGate from "@/src/components/ExitGate";
import GameCover from "@/src/components/GameCover";
import PlaySoftGate from "@/src/components/PlaySoftGate";
import { arcade } from "@/src/lib/arcadeSkin";
import { CATEGORIES, getAllGames, type GameCategory } from "@/src/lib/games";
import { metricsGetAll, metricsSessionStart } from "@/src/lib/metrics";
import { ensureProgressDefaults, getDailySeededItems, getStarsTotal, getStreak } from "@/src/lib/progress";
import { getTimeState, resetIfNewDay } from "@/src/lib/timeLimit";
import { getTrialStatus, startTrial } from "@/src/lib/trial";
import { ACCENT_STYLES, THEME, type AccentTone } from "@/src/lib/theme";
import {
  getPendingUnlockNotice,
  getUnlockedFeatures,
  markUnlockNoticeSeen,
  type UnlockNotice,
} from "@/src/lib/unlocks";

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

function getVariantBadgeText(game: {
  variantOf?: string;
  variantLabel?: string;
}): string | null {
  if (!game.variantOf || !game.variantLabel) {
    return null;
  }

  if (game.variantOf === "memory-match") {
    return `Theme: ${game.variantLabel}`;
  }
  if (game.variantOf === "space-runner") {
    return `Mode: ${game.variantLabel}`;
  }
  return `Variant: ${game.variantLabel}`;
}

export default function PlayPage() {
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(14);
  const [trialExpired, setTrialExpired] = useState(false);
  const [showChallengeBadge, setShowChallengeBadge] = useState(false);
  const [unlockNotice, setUnlockNotice] = useState<UnlockNotice | null>(null);
  const lastStarsSeenRef = useRef<number | null>(null);

  const allGames = useMemo(() => getAllGames(), []);

  const liveGames = useMemo(() => {
    return allGames.filter((game) => game.status === "live");
  }, [allGames]);

  const comingSoonGames = useMemo(() => {
    return allGames.filter((game) => game.status === "coming_soon");
  }, [allGames]);

  const counts = useMemo(() => {
    const nextCounts: Record<GameCategory | "all", number> = {
      all: liveGames.length,
      kids: 0,
      classics: 0,
      educational: 0,
      puzzles: 0,
    };

    for (const game of liveGames) {
      nextCounts[game.category] += 1;
    }

    return nextCounts;
  }, [liveGames]);

  const dailyPicks = useMemo(() => getDailySeededItems(liveGames, 3), [liveGames]);

  const games = useMemo(() => {
    if (selectedCategory === "all") {
      return liveGames;
    }
    return liveGames.filter((game) => game.category === selectedCategory);
  }, [liveGames, selectedCategory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      resetIfNewDay();
      ensureProgressDefaults();
      startTrial();
      metricsGetAll();
      getUnlockedFeatures();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    metricsSessionStart();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncProgress = () => {
      startTrial();
      const totalStars = getStarsTotal();
      const starsChanged = lastStarsSeenRef.current === null || totalStars !== lastStarsSeenRef.current;
      lastStarsSeenRef.current = totalStars;

      setStars(totalStars);
      setStreak(getStreak());
      setShowChallengeBadge(getUnlockedFeatures().challengeBadgeUnlocked);

      if (starsChanged) {
        const notice = getPendingUnlockNotice(totalStars);
        if (notice) {
          setUnlockNotice(notice);
          markUnlockNoticeSeen(notice.threshold);
        }
      }

      const trial = getTrialStatus();
      setTrialDaysRemaining(trial.daysRemaining);
      setTrialExpired(trial.isExpired);

      const time = getTimeState();
      setTimeEnabled(time.enabled);
      setRemainingSeconds(time.remainingSeconds);
    };

    syncProgress();
    const intervalId = window.setInterval(syncProgress, 1000);
    window.addEventListener("storage", syncProgress);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", syncProgress);
    };
  }, []);

  useEffect(() => {
    if (!unlockNotice) {
      return;
    }
    const timer = window.setTimeout(() => setUnlockNotice(null), 2300);
    return () => window.clearTimeout(timer);
  }, [unlockNotice]);

  return (
    <section className="space-y-5 pb-5">
      {unlockNotice ? (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 w-[min(92vw,420px)] -translate-x-1/2">
          <div className="rounded-2xl border border-amber-200/50 bg-slate-950/95 px-4 py-3 shadow-[0_18px_35px_rgba(2,6,23,0.55)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">{unlockNotice.title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{unlockNotice.description}</p>
          </div>
        </div>
      ) : null}

      <PlaySoftGate />
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
              {showChallengeBadge ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-300/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-100">
                  🏅 Arcade Challenger
                </span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
              🔥 Streak: {streak}
            </span>
            {timeEnabled ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-violet-200/30 bg-violet-300/10 px-3 py-2 text-sm font-semibold text-violet-100">
                ⏱️ Time left: {Math.ceil(remainingSeconds / 60)}m
              </span>
            ) : null}
            {trialExpired ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-rose-200/35 bg-rose-300/15 px-3 py-2 text-sm font-semibold text-rose-100">
                🧾 Trial expired
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/30 bg-indigo-300/10 px-3 py-2 text-sm font-semibold text-indigo-100">
                🗓️ Trial: {trialDaysRemaining} days left
              </span>
            )}
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
            const variantBadge = getVariantBadgeText(game);
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
                    <div className="flex flex-wrap gap-2">
                      <span className={`${THEME.surfaces.pill} text-slate-100`}>
                        {CATEGORY_META[game.category].icon} {CATEGORY_META[game.category].label}
                      </span>
                      {variantBadge ? (
                        <span className={`${THEME.surfaces.pill} border-cyan-200/45 bg-cyan-300/12 text-cyan-100`}>
                          {variantBadge}
                        </span>
                      ) : null}
                    </div>
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

      {games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200/20 bg-slate-900/80 px-4 py-8 text-center text-sm text-slate-300">
          Live games for this category are on the way. Check the Coming Soon shelf below.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => {
            const accent = ACCENT_STYLES[game.accent];
            const variantBadge = getVariantBadgeText(game);

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
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className={`${THEME.surfaces.pill} inline-flex text-slate-100`}>
                            {CATEGORY_META[game.category].icon} {CATEGORY_META[game.category].label}
                          </span>
                          {variantBadge ? (
                            <span className={`${THEME.surfaces.pill} border-cyan-200/45 bg-cyan-300/12 text-cyan-100`}>
                              {variantBadge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`${THEME.surfaces.badge} border-emerald-200/45 bg-emerald-300/15 text-emerald-100`}
                    >
                      Live
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
      )}

      <section className={`${THEME.surfaces.card} p-4`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-100">Coming Soon</h2>
            <p className="text-sm text-slate-300">New games added regularly.</p>
          </div>
          <span className={`${arcade.chip} border-amber-200/40 bg-amber-300/10 text-amber-100`}>
            More games dropping soon
          </span>
        </div>

        <p className="mb-3 text-xs font-semibold text-slate-300">Want updates? (coming soon)</p>

        <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible xl:grid-cols-4">
          {comingSoonGames.map((game) => {
            const accent = ACCENT_STYLES[game.accent];
            return (
              <article
                key={game.slug}
                aria-disabled="true"
                className={`w-[225px] shrink-0 overflow-hidden rounded-2xl border border-slate-200/15 bg-slate-900/90 opacity-95 shadow-[0_8px_24px_rgba(2,6,23,0.35)] lg:w-auto ${accent.tileGlow} cursor-not-allowed`}
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

                <div className="space-y-3 p-4">
                  <p className="text-base font-semibold text-white">{game.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${arcade.chip} border-amber-200/45 bg-amber-300/15 text-[11px] text-amber-100`}>
                      Coming Soon
                    </span>
                    <span className={`${THEME.surfaces.pill} text-slate-100`}>
                      {CATEGORY_META[game.category].icon} {CATEGORY_META[game.category].label}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

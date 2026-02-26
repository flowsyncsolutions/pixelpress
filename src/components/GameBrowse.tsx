"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ExitGate from "@/src/components/ExitGate";
import GameCover from "@/src/components/GameCover";
import PlaySoftGate from "@/src/components/PlaySoftGate";
import { arcade } from "@/src/lib/arcadeSkin";
import {
  type GameCategory,
  getAllGames,
  getLiveGames,
  getLiveGamesByCategory,
  searchGames,
} from "@/src/lib/games";
import { metricsGetAll, metricsSessionStart } from "@/src/lib/metrics";
import { ensureProgressDefaults, getDailySeededItems, getStarsTotal, getStreak } from "@/src/lib/progress";
import { getTimeState, resetIfNewDay } from "@/src/lib/timeLimit";
import { type TrialState, getTrialStatus, startTrial } from "@/src/lib/trial";
import { ACCENT_STYLES, THEME, type AccentTone } from "@/src/lib/theme";
import {
  getPendingUnlockNotice,
  getUnlockedFeatures,
  markUnlockNoticeSeen,
  type UnlockNotice,
} from "@/src/lib/unlocks";

export type BrowseCategory = GameCategory | "all";

type GameBrowseProps = {
  category?: BrowseCategory;
  showDailyPicks?: boolean;
};

const CATEGORY_META: Record<
  BrowseCategory,
  { label: string; icon: string; accent: AccentTone; href: string }
> = {
  all: { label: "All", icon: "🎮", accent: "violet", href: "/play" },
  kids: { label: "Kids", icon: "🧸", accent: "rose", href: "/play/kids" },
  classics: { label: "Classics", icon: "🕹️", accent: "amber", href: "/play/classics" },
  educational: { label: "Educational", icon: "📚", accent: "emerald", href: "/play/educational" },
  puzzles: { label: "Puzzles", icon: "🧩", accent: "cyan", href: "/play/puzzles" },
};

const CATEGORY_ORDER: BrowseCategory[] = ["all", "kids", "classics", "educational", "puzzles"];

function getVariantBadgeText(game: { variantOf?: string; variantLabel?: string }): string | null {
  if (!game.variantOf || !game.variantLabel) {
    return null;
  }

  if (game.variantOf === "space-runner") {
    return `Mode: ${game.variantLabel}`;
  }
  return `Variant: ${game.variantLabel}`;
}

export default function GameBrowse({ category = "all", showDailyPicks = false }: GameBrowseProps) {
  const [query, setQuery] = useState("");
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(11);
  const [trialState, setTrialState] = useState<TrialState>("full");
  const [showChallengeBadge, setShowChallengeBadge] = useState(false);
  const [unlockNotice, setUnlockNotice] = useState<UnlockNotice | null>(null);
  const lastStarsSeenRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const allGames = useMemo(() => getAllGames(), []);
  const allLiveGames = useMemo(() => getLiveGames(), []);
  const liveGames = useMemo(
    () => (category === "all" ? allLiveGames : getLiveGamesByCategory(category)),
    [allLiveGames, category],
  );
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const filteredGames = useMemo(() => searchGames(liveGames, trimmedQuery), [liveGames, trimmedQuery]);
  const comingSoonGames = useMemo(
    () => allGames.filter((game) => game.status === "coming_soon"),
    [allGames],
  );
  const dailyPicks = useMemo(() => getDailySeededItems(allLiveGames, 3), [allLiveGames]);

  const counts = useMemo(() => {
    const nextCounts: Record<BrowseCategory, number> = {
      all: allLiveGames.length,
      kids: 0,
      classics: 0,
      educational: 0,
      puzzles: 0,
    };

    for (const game of allLiveGames) {
      nextCounts[game.category] += 1;
    }

    return nextCounts;
  }, [allLiveGames]);

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
      setTrialState(trial.state);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return true;
      }

      if (target.isContentEditable) {
        return true;
      }

      return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    };

    const hasOpenModal = (): boolean => {
      return Boolean(document.querySelector("[role='dialog'][aria-modal='true']"));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target) || hasOpenModal()) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const headingLabel = category === "all" ? "Game Shelf" : `${CATEGORY_META[category].label} Games`;
  const searchResultCountLabel = `${filteredGames.length} ${filteredGames.length === 1 ? "game" : "games"}`;
  const renderGamesGrid = (gamesToRender: typeof filteredGames) => {
    if (gamesToRender.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200/20 bg-slate-900/80 px-4 py-8 text-center text-sm text-slate-300">
          No games found. Try a different search.
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {gamesToRender.map((game) => {
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
    );
  };

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

      <div className="sticky top-[70px] z-10 rounded-2xl border border-slate-200/12 bg-slate-950/90 p-2 shadow-[0_10px_24px_rgba(2,6,23,0.35)] backdrop-blur">
        <div className="pp-scrollbar-hidden flex gap-2 overflow-x-auto whitespace-nowrap">
          {CATEGORY_ORDER.map((entry) => {
            const meta = CATEGORY_META[entry];
            const isActive = entry === category;
            return (
              <Link
                key={entry}
                href={meta.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? `${ACCENT_STYLES[meta.accent].tab} shadow-[0_8px_18px_rgba(15,23,42,0.24)]`
                    : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span aria-hidden="true">{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">{counts[entry]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <section className={`${THEME.surfaces.card} p-4`}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">Search Games</span>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search games…"
              className={`h-11 w-full rounded-xl border border-slate-200/20 bg-slate-950/90 px-4 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/60 ${
                isSearching ? "pr-24" : "pr-14"
              }`}
            />
            {isSearching ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200/20 bg-slate-900/95 px-2 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-800"
              >
                × Clear
              </button>
            ) : (
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200/20 bg-slate-900/90 px-2 py-1 text-xs font-semibold text-slate-300 md:inline-flex">
                /
              </span>
            )}
          </div>
        </label>
      </section>

      {isSearching ? (
        <section className={`${THEME.surfaces.card} p-4`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black text-slate-100">Results for "{trimmedQuery}"</h2>
            <span className={`${THEME.surfaces.pill} text-slate-200`}>{searchResultCountLabel}</span>
          </div>
          {renderGamesGrid(filteredGames)}
        </section>
      ) : (
        <>
          <header className={`${THEME.surfaces.card} p-4`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Pocket Arcade</p>
                <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{headingLabel}</h1>
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
                {trialState === "expired" ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-rose-200/35 bg-rose-300/15 px-3 py-2 text-sm font-semibold text-rose-100">
                    🧾 Trial Expired
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                      trialState === "limited"
                        ? "border border-amber-200/35 bg-amber-300/15 text-amber-100"
                        : "border border-indigo-200/30 bg-indigo-300/10 text-indigo-100"
                    }`}
                  >
                    {trialState === "limited"
                      ? `🧾 Limited Trial: ${trialDaysRemaining} days left`
                      : `🗓️ Full Trial: ${trialDaysRemaining} days left`}
                  </span>
                )}
              </div>
            </div>
          </header>

          {showDailyPicks && category === "all" ? (
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
          ) : null}

          {renderGamesGrid(filteredGames)}

          {category === "all" ? (
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
          ) : null}
        </>
      )}

    </section>
  );
}

"use client";

import { useCallback, useEffect } from "react";
import ExitGate from "@/src/components/ExitGate";
import GameCover from "@/src/components/GameCover";
import PlaySoftGate from "@/src/components/PlaySoftGate";
import TimeUpOverlay from "@/src/components/TimeUpOverlay";
import { ALLOWED_IFRAME_HOSTS, type Game } from "@/src/lib/games";
import {
  metricsAddPlaySeconds,
  metricsGameComplete,
  metricsGameLaunch,
  metricsGetAll,
  metricsSetBest,
} from "@/src/lib/metrics";
import { markPlayedToday } from "@/src/lib/progress";
import { ACCENT_STYLES, THEME } from "@/src/lib/theme";
import MemoryMatch from "@/src/games/memoryMatch/MemoryMatch";
import ReactionTap from "@/src/games/reactionTap/ReactionTap";
import SpaceRunner from "@/src/games/spaceRunner/SpaceRunner";
import TicTacToe from "@/src/games/tictactoe/TicTacToe";

type PlayGameClientProps = {
  game: Game;
};

function isAllowedIframeSrc(src: string): boolean {
  if (ALLOWED_IFRAME_HOSTS.length === 0) {
    return false;
  }

  try {
    const hostname = new URL(src).hostname.toLowerCase();
    return ALLOWED_IFRAME_HOSTS.some((allowedHost) => {
      const host = allowedHost.toLowerCase();
      return hostname === host || hostname.endsWith(`.${host}`);
    });
  } catch {
    return false;
  }
}

export default function PlayGameClient({ game }: PlayGameClientProps) {
  const accent = ACCENT_STYLES[game.accent];

  useEffect(() => {
    metricsGameLaunch(game.slug);
    markPlayedToday();

    const intervalId = window.setInterval(() => {
      metricsAddPlaySeconds(game.slug, 5);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [game.slug]);

  const handleComplete = useCallback(
    (payload?: { best?: number }) => {
      metricsGameComplete(game.slug);

      const nextBestRaw = payload?.best;
      if (typeof nextBestRaw !== "number" || !Number.isFinite(nextBestRaw) || nextBestRaw <= 0) {
        return;
      }

      const nextBest = Math.floor(nextBestRaw);
      const storedBest = metricsGetAll().games[game.slug]?.best;
      const lowerIsBetter = game.internalEngine === "reactionTap";

      const shouldUpdateBest =
        typeof storedBest !== "number" ||
        !Number.isFinite(storedBest) ||
        (lowerIsBetter ? nextBest < storedBest : nextBest > storedBest);

      if (shouldUpdateBest) {
        metricsSetBest(game.slug, nextBest);
      }
    },
    [game.internalEngine, game.slug],
  );

  return (
    <section className="space-y-6">
      <PlaySoftGate />
      <TimeUpOverlay fixed backHref="/play" />
      <ExitGate />

      <div className={`${THEME.surfaces.card} p-6`}>
        <div className={`mb-3 h-1.5 rounded-full ${accent.ribbon}`} />
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200/15">
            <GameCover
              title={game.title}
              icon={game.icon}
              accent={game.accent}
              cover={game.cover}
            />
          </div>
          <div className="space-y-2">
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border text-2xl ${accent.icon}`}
            >
              <span aria-hidden="true">{game.icon}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{game.title}</h1>
            <p className="max-w-2xl text-slate-300">{game.description}</p>
          </div>
        </div>
      </div>

      {game.embedType === "iframe" && game.embedSrc && isAllowedIframeSrc(game.embedSrc) ? (
        <div
          className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200/20 bg-slate-950 ${accent.tileGlow}`}
        >
          <iframe
            title={`${game.title} game`}
            src={game.embedSrc}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : game.embedType === "iframe" ? (
        <div className="rounded-2xl border border-dashed border-amber-300/40 bg-amber-500/10 p-10 text-center text-sm text-amber-100">
          This game is currently disabled.
        </div>
      ) : (
        <>
          {game.internalEngine === "tictactoe" ? (
            <TicTacToe onComplete={handleComplete} />
          ) : game.internalEngine === "spaceRunner" ? (
            <SpaceRunner onComplete={handleComplete} />
          ) : game.internalEngine === "memoryMatch" ? (
            <MemoryMatch onComplete={handleComplete} />
          ) : game.internalEngine === "reactionTap" ? (
            <ReactionTap onComplete={handleComplete} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200/25 bg-slate-900/85 p-10 text-center text-sm text-slate-200">
              Internal game engine coming soon.
            </div>
          )}
        </>
      )}
    </section>
  );
}

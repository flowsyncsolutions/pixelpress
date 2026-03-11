"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GameCover from "@/src/components/GameCover";
import ParentTrustSection from "@/src/components/ParentTrustSection";
import { arcade } from "@/src/lib/arcadeSkin";
import { getFeaturedLiveGames } from "@/src/lib/games";
import { ACCENT_STYLES, THEME } from "@/src/lib/theme";
import { usePwaInstall } from "@/src/lib/usePwaInstall";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Play games",
    text: "Jump straight into quick arcade games built for kids.",
  },
  {
    step: "02",
    title: "Set time limits",
    text: "Parents stay in control with simple built-in limits.",
  },
  {
    step: "03",
    title: "Relax",
    text: "No ads, no tracking, and no weird links to worry about.",
  },
];

export default function Home() {
  const router = useRouter();
  const { canPromptInstall, isInstalled, promptInstall } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const featuredGames = getFeaturedLiveGames().slice(0, 4);

  const handleInstall = async () => {
    if (isInstalled) {
      router.push("/play");
      return;
    }

    if (canPromptInstall) {
      setIsInstalling(true);
      try {
        await promptInstall();
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    router.push("/welcome");
  };

  return (
    <section className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <section className={`${THEME.surfaces.card} ${THEME.gradients.hero} relative overflow-hidden p-5 sm:p-8`}>
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-cyan-300/14 blur-2xl" />
          <div className="absolute right-0 top-6 h-32 w-32 rounded-full bg-rose-300/12 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-amber-300/10 blur-2xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-100/18 bg-slate-900/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-100">
            <span aria-hidden="true">PixelPress</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span>Kid-safe arcade</span>
          </div>

          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Safe games for kids. No ads. No weird stuff.
          </h1>

          <p className={`mt-3 max-w-xl text-base leading-relaxed sm:text-lg ${THEME.brandColors.textMuted}`}>
            A simple arcade parents can trust.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/play"
              className={`inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold transition ${THEME.brandColors.primaryButton}`}
            >
              Start Playing
            </Link>
            <button
              type="button"
              onClick={handleInstall}
              disabled={isInstalling}
              className={`${arcade.secondaryButton} h-12 px-6 text-base disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {isInstalling ? "Opening..." : "Install App"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-100">
            <span className={`${THEME.surfaces.pill} border-emerald-200/35 bg-emerald-300/10 text-emerald-100`}>
              No ads
            </span>
            <span className={`${THEME.surfaces.pill} border-cyan-200/35 bg-cyan-300/10 text-cyan-100`}>
              No tracking
            </span>
            <span className={`${THEME.surfaces.pill} border-violet-200/35 bg-violet-300/10 text-violet-100`}>
              Offline ready
            </span>
          </div>
        </div>
      </section>

      {featuredGames.length > 0 ? (
        <section className={`${THEME.surfaces.card} p-4`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black text-slate-100">Featured Games</h2>
            <span className={`${THEME.surfaces.pill} border-violet-200/45 bg-violet-300/12 text-violet-100`}>
              Start here
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {featuredGames.map((game) => {
              const accent = ACCENT_STYLES[game.accent];
              return (
                <Link
                  key={game.slug}
                  href={`/play/${game.slug}`}
                  className={`group w-[240px] shrink-0 overflow-hidden rounded-2xl border border-slate-100/12 bg-slate-900/88 shadow-[0_10px_28px_rgba(2,6,23,0.38)] transition hover:-translate-y-0.5 lg:w-auto ${accent.tileGlow}`}
                >
                  <div className={`h-1.5 ${accent.ribbon}`} />
                  <div className="relative aspect-[16/10]">
                    <GameCover
                      title={game.title}
                      icon={game.icon}
                      accent={game.accent}
                      cover={game.cover}
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-white">{game.title}</p>
                        <p className="mt-1 text-sm text-slate-300">{game.description}</p>
                      </div>
                      <span className={`${THEME.surfaces.badge} ${accent.badge}`}>Play</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <ParentTrustSection />

      <section className={`${THEME.surfaces.card} p-4 sm:p-5`}>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-100">How it works</h2>
          <p className="mt-1 text-sm text-slate-300">Simple setup for families.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl border border-slate-200/18 bg-slate-900/86 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(2,6,23,0.34)]"
            >
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 px-2 text-xs font-black text-cyan-100">
                {item.step}
              </span>
              <p className="mt-3 text-lg font-black text-slate-100">{item.title}</p>
              <p className="mt-1 text-sm text-slate-300">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${THEME.surfaces.card} ${THEME.gradients.shelf} p-6 text-center sm:p-8`}>
        <p className="text-2xl font-black text-white sm:text-3xl">Start Playing</p>
        <p className="mt-2 text-sm text-slate-300">Jump into the arcade and try the best games first.</p>
        <div className="mt-5">
          <Link
            href="/play"
            className={`inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold transition ${THEME.brandColors.primaryButton}`}
          >
            Start Playing
          </Link>
        </div>
      </section>
    </section>
  );
}

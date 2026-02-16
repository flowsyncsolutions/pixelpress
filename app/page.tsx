import Link from "next/link";
import { getAllGames } from "@/src/lib/games";
import { ACCENT_STYLES, THEME } from "@/src/lib/theme";

export default function Home() {
  const previewGames = getAllGames().slice(0, 6);

  return (
    <section className="min-h-[calc(100vh-8rem)] py-8 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className={`${THEME.surfaces.card} ${THEME.gradients.hero} p-6 sm:p-8`}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-100/20 bg-slate-900/80 px-3 py-1.5 text-sm font-semibold text-slate-100">
            <span aria-hidden="true">🕹️</span>
            <span>PixelPress</span>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
            Kid-safe. Ad-free. Offline.
          </p>

          <h1 className="max-w-xl text-balance text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            A safe arcade for kids and the classics you grew up with.
          </h1>

          <p className={`mt-4 max-w-2xl text-lg leading-relaxed ${THEME.brandColors.textMuted}`}>
            Ad-free. No tracking. No weird stuff. Installable and offline-friendly.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/play"
              className={`inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${THEME.brandColors.primaryButton}`}
            >
              Browse Games
            </Link>
            <Link
              href="/parent"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200/35 bg-slate-900/70 px-6 py-3.5 text-base font-semibold text-slate-100 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
            >
              Parent Mode
            </Link>
          </div>

          <div className="mt-7 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
            <div className="inline-flex items-center gap-2">
              <span aria-hidden="true">🛡️</span>
              <span>No ads ever</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span aria-hidden="true">🕵️</span>
              <span>No tracking</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span aria-hidden="true">🔒</span>
              <span>No external links</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span aria-hidden="true">📶</span>
              <span>Offline-friendly</span>
            </div>
          </div>
        </div>

        <aside className={`${THEME.surfaces.card} ${THEME.gradients.shelf} p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 sm:text-lg">Arcade Preview</h2>
            <span className={`${THEME.surfaces.pill} text-slate-200`}>6 mini tiles</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {previewGames.map((game) => {
              const accent = ACCENT_STYLES[game.accent];
              return (
                <div
                  key={game.slug}
                  className="rounded-xl border border-slate-100/12 bg-slate-900/90 p-3 shadow-[0_8px_18px_rgba(2,6,23,0.35)]"
                >
                  <div className={`mb-2 h-1.5 rounded-full ${accent.ribbon}`} />
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${accent.icon}`}
                    >
                      <span aria-hidden="true">{game.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{game.title}</p>
                      <p className="text-xs text-slate-300">
                        {game.status === "live" ? "Live now" : "Coming soon"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

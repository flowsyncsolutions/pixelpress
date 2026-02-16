import Link from "next/link";

export default function Home() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden py-10">
      <div className="pointer-events-none absolute inset-x-0 top-8 -z-10 flex justify-center">
        <div className="h-72 w-[min(92vw,760px)] rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="w-full max-w-4xl space-y-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-center shadow-[0_20px_80px_rgba(8,145,178,0.2)] backdrop-blur sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
          Kid-safe. Ad-free. Offline.
        </p>

        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          <span className="block">A safe arcade for kids</span>
          <span className="block text-cyan-100">and the classics you grew up with.</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl">
          Ad-free. No tracking. No weird stuff. Installable and offline-friendly.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/play"
            className="w-full rounded-xl bg-cyan-400 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 sm:w-auto"
          >
            Browse Games
          </Link>
          <Link
            href="/parent"
            className="w-full rounded-xl border border-cyan-200/45 bg-slate-900/50 px-6 py-3.5 text-base font-semibold text-cyan-100 transition hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 sm:w-auto"
          >
            Parent Mode
          </Link>
        </div>

        <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
            <span className="mr-2" aria-hidden="true">
              🛡️
            </span>
            No ads ever
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
            <span className="mr-2" aria-hidden="true">
              🕵️
            </span>
            No tracking
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
            <span className="mr-2" aria-hidden="true">
              🔒
            </span>
            No external links
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
            <span className="mr-2" aria-hidden="true">
              📶
            </span>
            Offline-friendly
          </div>
        </div>
      </div>
    </section>
  );
}

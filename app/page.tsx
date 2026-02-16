import Link from "next/link";

export default function Home() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          A safe arcade for kids — and the classics you grew up with.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-zinc-300 sm:text-xl">
          Ad-free. No tracking. No weird stuff. Installable and offline-friendly.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="w-full rounded-lg bg-white px-5 py-3 font-medium text-black transition hover:bg-zinc-200 sm:w-auto"
          >
            Browse Games
          </Link>
          <Link
            href="/parent"
            className="w-full rounded-lg border border-white/20 px-5 py-3 font-medium text-white transition hover:bg-white/10 sm:w-auto"
          >
            Parent Mode
          </Link>
        </div>
        <div className="grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200">
            No ads ever
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200">
            No tracking
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-200">
            No external links
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          PixelPress
        </h1>
        <p className="text-lg text-zinc-300 sm:text-xl">
          Play 100+ simple games. No ads.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="w-full rounded-lg bg-white px-5 py-3 font-medium text-black transition hover:bg-zinc-200 sm:w-auto"
          >
            Play
          </Link>
          <Link
            href="/create"
            className="w-full rounded-lg border border-white/20 px-5 py-3 font-medium text-white transition hover:bg-white/10 sm:w-auto"
          >
            Create
          </Link>
        </div>
      </div>
    </section>
  );
}

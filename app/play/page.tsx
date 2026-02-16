import Link from "next/link";
import { getAllGames } from "@/src/lib/games";

export default function PlayPage() {
  const games = getAllGames();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Play</h1>
        <p className="text-zinc-400">
          Browse the catalog. Live games run now, and coming soon titles are queued.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <Link
            key={game.slug}
            href={`/play/${game.slug}`}
            className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 transition hover:border-white/30 hover:bg-zinc-900/70"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-medium text-white">{game.title}</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  game.status === "live"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-200"
                }`}
              >
                {game.status === "live" ? "Live" : "Coming Soon"}
              </span>
            </div>

            <p className="mb-4 text-sm text-zinc-400">{game.description}</p>

            <div className="flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

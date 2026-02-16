import { getGameBySlug } from "@/src/lib/games";
import { notFound } from "next/navigation";

type PlayGamePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PlayGamePage({ params }: PlayGamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{game.title}</h1>
        <p className="text-zinc-400">{game.description}</p>
      </div>

      {game.embedType === "iframe" && game.embedSrc ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            title={`${game.title} game`}
            src={game.embedSrc}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/20 bg-zinc-950/70 p-10 text-center text-sm text-zinc-300">
          Internal game engine coming soon.
        </div>
      )}
    </section>
  );
}

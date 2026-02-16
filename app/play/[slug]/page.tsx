import ExitGate from "@/src/components/ExitGate";
import { ALLOWED_IFRAME_HOSTS, getGameBySlug } from "@/src/lib/games";
import { notFound } from "next/navigation";

type PlayGamePageProps = {
  params: Promise<{ slug: string }>;
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

export default async function PlayGamePage({ params }: PlayGamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <ExitGate />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{game.title}</h1>
        <p className="text-zinc-400">{game.description}</p>
      </div>

      {game.embedType === "iframe" && game.embedSrc && isAllowedIframeSrc(game.embedSrc) ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            title={`${game.title} game`}
            src={game.embedSrc}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : game.embedType === "iframe" ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-zinc-950/70 p-10 text-center text-sm text-zinc-300">
          This game is currently disabled.
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/20 bg-zinc-950/70 p-10 text-center text-sm text-zinc-300">
          Internal game engine coming soon.
        </div>
      )}
    </section>
  );
}

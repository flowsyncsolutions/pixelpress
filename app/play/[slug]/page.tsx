import ExitGate from "@/src/components/ExitGate";
import { ALLOWED_IFRAME_HOSTS, getGameBySlug } from "@/src/lib/games";
import { ACCENT_STYLES, THEME } from "@/src/lib/theme";
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

  const accent = ACCENT_STYLES[game.accent];

  return (
    <section className="space-y-6">
      <ExitGate />

      <div className={`${THEME.surfaces.card} p-6`}>
        <div className={`mb-3 h-1.5 rounded-full ${accent.ribbon}`} />
        <div className="relative flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl ${accent.icon}`}
          >
            <span aria-hidden="true">{game.icon}</span>
          </div>
          <div className="space-y-2">
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
        <div className="rounded-2xl border border-dashed border-slate-200/25 bg-slate-900/85 p-10 text-center text-sm text-slate-200">
          Internal game engine coming soon.
        </div>
      )}
    </section>
  );
}

export type AccentTone = "amber" | "emerald" | "violet" | "rose" | "cyan";

export const THEME = {
  brandColors: {
    primaryButton:
      "bg-violet-500 text-violet-50 hover:bg-violet-400 focus-visible:outline-violet-200",
    secondaryButton:
      "bg-amber-300 text-amber-950 hover:bg-amber-200 focus-visible:outline-amber-100",
    textStrong: "text-slate-100",
    textMuted: "text-slate-300",
  },
  gradients: {
    hero: "bg-gradient-to-br from-violet-500/18 via-rose-400/8 to-amber-300/18",
    shelf: "bg-gradient-to-br from-emerald-400/12 via-cyan-300/6 to-violet-400/12",
  },
  surfaces: {
    card: "rounded-2xl border border-slate-200/12 bg-slate-900/85 shadow-[0_10px_28px_rgba(2,6,23,0.38)]",
    pill: "rounded-full border border-slate-200/18 bg-slate-900/80 px-3 py-1 text-xs font-semibold",
    badge: "rounded-full border px-2.5 py-1 text-xs font-semibold",
  },
} as const;

export const ACCENT_STYLES: Record<
  AccentTone,
  {
    ribbon: string;
    icon: string;
    tileGlow: string;
    button: string;
    badge: string;
    tab: string;
  }
> = {
  amber: {
    ribbon: "bg-amber-300",
    icon: "border-amber-200/40 bg-amber-300/20 text-amber-100",
    tileGlow: "hover:shadow-[0_12px_26px_rgba(251,191,36,0.22)]",
    button: "bg-amber-300 text-amber-950 group-hover:bg-amber-200",
    badge: "border-amber-200/45 bg-amber-300/15 text-amber-100",
    tab: "bg-amber-300 text-amber-950",
  },
  emerald: {
    ribbon: "bg-emerald-300",
    icon: "border-emerald-200/40 bg-emerald-300/20 text-emerald-100",
    tileGlow: "hover:shadow-[0_12px_26px_rgba(52,211,153,0.2)]",
    button: "bg-emerald-300 text-emerald-950 group-hover:bg-emerald-200",
    badge: "border-emerald-200/45 bg-emerald-300/15 text-emerald-100",
    tab: "bg-emerald-300 text-emerald-950",
  },
  violet: {
    ribbon: "bg-violet-300",
    icon: "border-violet-200/40 bg-violet-300/20 text-violet-100",
    tileGlow: "hover:shadow-[0_12px_26px_rgba(196,181,253,0.22)]",
    button: "bg-violet-300 text-violet-950 group-hover:bg-violet-200",
    badge: "border-violet-200/45 bg-violet-300/15 text-violet-100",
    tab: "bg-violet-300 text-violet-950",
  },
  rose: {
    ribbon: "bg-rose-300",
    icon: "border-rose-200/40 bg-rose-300/20 text-rose-100",
    tileGlow: "hover:shadow-[0_12px_26px_rgba(253,164,175,0.22)]",
    button: "bg-rose-300 text-rose-950 group-hover:bg-rose-200",
    badge: "border-rose-200/45 bg-rose-300/15 text-rose-100",
    tab: "bg-rose-300 text-rose-950",
  },
  cyan: {
    ribbon: "bg-cyan-300",
    icon: "border-cyan-200/40 bg-cyan-300/20 text-cyan-100",
    tileGlow: "hover:shadow-[0_12px_26px_rgba(103,232,249,0.22)]",
    button: "bg-cyan-300 text-cyan-950 group-hover:bg-cyan-200",
    badge: "border-cyan-200/45 bg-cyan-300/15 text-cyan-100",
    tab: "bg-cyan-300 text-cyan-950",
  },
};

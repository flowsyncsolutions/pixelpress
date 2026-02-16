export const arcade = {
  pageWrap: "mx-auto w-full max-w-[520px] px-1",
  gameFrame:
    "rounded-3xl border border-slate-200/15 bg-slate-900/95 p-4 shadow-[0_18px_40px_rgba(2,6,23,0.5)] sm:p-5",
  headerBar: "rounded-2xl border border-slate-200/15 bg-slate-950/70 p-3 sm:p-4",
  chip: "inline-flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-900/85 px-3 py-1 text-xs font-semibold text-slate-100",
  primaryButton:
    "rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-violet-50 transition hover:bg-violet-400 active:scale-[0.98]",
  secondaryButton:
    "rounded-xl border border-slate-200/25 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]",
  dangerButton:
    "rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-rose-50 transition hover:bg-rose-400 active:scale-[0.98]",
  badgeLive: "rounded-full border border-emerald-200/45 bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-100",
  badgeSoon: "rounded-full border border-amber-200/45 bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-100",
  panel: "rounded-2xl border border-slate-200/20 bg-slate-950/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  tileButton:
    "relative flex aspect-square items-center justify-center rounded-2xl border-2 border-slate-300/25 bg-slate-900/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_9px_18px_rgba(2,6,23,0.5)] transition hover:border-violet-300/70 hover:shadow-[0_0_0_1px_rgba(196,181,253,0.35),0_0_18px_rgba(139,92,246,0.3)] active:scale-[0.97]",
  tileButtonPressed:
    "translate-y-[1px] shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_4px_8px_rgba(2,6,23,0.45)]",
  glowText: "text-violet-100 [text-shadow:0_0_12px_rgba(196,181,253,0.5)]",
  subtleText: "text-slate-300",
} as const;

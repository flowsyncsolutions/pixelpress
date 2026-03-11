"use client";

import { THEME } from "@/src/lib/theme";

type ParentTrustSectionProps = {
  title?: string;
  badgeLabel?: string;
};

export default function ParentTrustSection({
  title = "Why Parents Love PixelPress",
  badgeLabel = "Parent trusted",
}: ParentTrustSectionProps) {
  return (
    <section className={`${THEME.surfaces.card} p-4`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black text-slate-100">{title}</h2>
        <span className={`${THEME.surfaces.pill} border-cyan-200/45 bg-cyan-300/10 text-cyan-100`}>
          {badgeLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200/18 bg-slate-900/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(2,6,23,0.34)]">
          <p className="text-3xl leading-none" aria-hidden="true">
            🛡️
          </p>
          <p className="mt-2 text-sm font-black text-slate-100">No Ads</p>
          <p className="mt-1 text-xs text-slate-300">Kids play without interruptions.</p>
        </article>
        <article className="rounded-2xl border border-slate-200/18 bg-slate-900/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(2,6,23,0.34)]">
          <p className="text-3xl leading-none" aria-hidden="true">
            🔒
          </p>
          <p className="mt-2 text-sm font-black text-slate-100">Safe Content</p>
          <p className="mt-1 text-xs text-slate-300">Only simple, kid-friendly games.</p>
        </article>
        <article className="rounded-2xl border border-slate-200/18 bg-slate-900/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(2,6,23,0.34)]">
          <p className="text-3xl leading-none" aria-hidden="true">
            ⏱️
          </p>
          <p className="mt-2 text-sm font-black text-slate-100">Time Limits</p>
          <p className="mt-1 text-xs text-slate-300">Parents control screen time.</p>
        </article>
        <article className="rounded-2xl border border-slate-200/18 bg-slate-900/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_20px_rgba(2,6,23,0.34)]">
          <p className="text-3xl leading-none" aria-hidden="true">
            📴
          </p>
          <p className="mt-2 text-sm font-black text-slate-100">Offline Ready</p>
          <p className="mt-1 text-xs text-slate-300">Install and play like a real app.</p>
        </article>
      </div>
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import { arcade } from "@/src/lib/arcadeSkin";

type GameStat = {
  label: string;
  value: string | number;
};

type GameEndOverlayProps = {
  title: string;
  subtitle?: string;
  stats?: GameStat[];
  onPrimary: () => void;
  onSecondary: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  children?: ReactNode;
};

export default function GameEndOverlay({
  title,
  subtitle,
  stats = [],
  onPrimary,
  onSecondary,
  primaryLabel = "Play Again",
  secondaryLabel = "Back to Games",
  children,
}: GameEndOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-3 sm:p-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-100/20 bg-slate-900/92 p-4 shadow-[0_16px_32px_rgba(2,6,23,0.62)]"
        role="dialog"
        aria-modal="true"
      >
        <h3 className={`text-xl font-black ${arcade.glowText}`}>{title}</h3>
        {subtitle ? <p className={`mt-1 text-sm ${arcade.subtleText}`}>{subtitle}</p> : null}

        {stats.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-200/18 bg-slate-950/75 px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {children ? <div className="mt-3">{children}</div> : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onPrimary} className={`${arcade.primaryButton} w-full`}>
            {primaryLabel}
          </button>
          <button type="button" onClick={onSecondary} className={`${arcade.secondaryButton} w-full`}>
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

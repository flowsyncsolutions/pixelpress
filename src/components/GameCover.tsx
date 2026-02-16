"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type GameCoverProps = {
  title: string;
  icon: string;
  accent: string;
  cover?: string;
};

type AccentPalette = {
  gradient: string;
  chip: string;
};

const ACCENT_PALETTES: Record<string, AccentPalette> = {
  amber: {
    gradient: "bg-gradient-to-br from-amber-300 to-orange-500",
    chip: "bg-amber-200/25",
  },
  emerald: {
    gradient: "bg-gradient-to-br from-emerald-300 to-teal-500",
    chip: "bg-emerald-200/25",
  },
  violet: {
    gradient: "bg-gradient-to-br from-violet-300 to-fuchsia-500",
    chip: "bg-violet-200/25",
  },
  rose: {
    gradient: "bg-gradient-to-br from-rose-300 to-pink-500",
    chip: "bg-rose-200/25",
  },
  cyan: {
    gradient: "bg-gradient-to-br from-cyan-300 to-sky-500",
    chip: "bg-cyan-200/25",
  },
};

export default function GameCover({ title, icon, accent, cover }: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const palette = useMemo<AccentPalette>(() => {
    return ACCENT_PALETTES[accent] ?? ACCENT_PALETTES.cyan;
  }, [accent]);

  if (cover && !imageFailed) {
    return (
      <Image
        src={cover}
        alt={`${title} cover`}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-[inherit] ${palette.gradient}`}>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(rgba(15,23,42,0.25), rgba(15,23,42,0.45))",
          backgroundSize: "18px 18px, auto",
        }}
      />
      <div className="absolute inset-0 flex flex-col justify-between p-3 text-white">
        <div className={`inline-flex w-fit rounded-lg px-2 py-1 text-sm font-semibold ${palette.chip}`}>
          {icon}
        </div>
        <p className="line-clamp-2 text-xs font-bold tracking-wide sm:text-sm">{title}</p>
      </div>
    </div>
  );
}

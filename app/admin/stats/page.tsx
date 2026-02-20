"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { arcade } from "@/src/lib/arcadeSkin";
import { getAllGames } from "@/src/lib/games";
import { metricsGetAll, metricsResetAll, type MetricsSnapshot } from "@/src/lib/metrics";
import { THEME } from "@/src/lib/theme";

const PIN_KEY = "pp_pin";

type GameRow = {
  slug: string;
  title: string;
  launches: number;
  completes: number;
  playSeconds: number;
  best?: number;
};

function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: number): string {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString();
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function AdminStatsPage() {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot>(() => metricsGetAll());
  const [message, setMessage] = useState<string | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const refreshSnapshot = useCallback(() => {
    setSnapshot(metricsGetAll());
  }, []);

  useEffect(() => {
    refreshSnapshot();

    const intervalId = window.setInterval(refreshSnapshot, 2000);
    window.addEventListener("storage", refreshSnapshot);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", refreshSnapshot);
    };
  }, [refreshSnapshot]);

  const titleBySlug = useMemo(() => {
    const next: Record<string, string> = {};
    for (const game of getAllGames()) {
      next[game.slug] = game.title;
    }
    return next;
  }, []);

  const gameRows = useMemo(() => {
    const rows: GameRow[] = Object.entries(snapshot.games).map(([slug, entry]) => ({
      slug,
      title: titleBySlug[slug] ?? slug,
      launches: entry.launches,
      completes: entry.completes,
      playSeconds: entry.playSeconds,
      best: entry.best,
    }));

    return rows.sort((a, b) => b.launches - a.launches || b.playSeconds - a.playSeconds);
  }, [snapshot.games, titleBySlug]);

  const topByLaunches = useMemo(() => {
    return [...gameRows].sort((a, b) => b.launches - a.launches).slice(0, 5);
  }, [gameRows]);

  const topByPlayTime = useMemo(() => {
    return [...gameRows].sort((a, b) => b.playSeconds - a.playSeconds).slice(0, 5);
  }, [gameRows]);

  const completionRows = useMemo(() => {
    return [...gameRows].sort((a, b) => b.completes - a.completes || b.launches - a.launches);
  }, [gameRows]);

  const lastSevenDays = useMemo(() => {
    const rows: Array<{ day: string; sessions: number; launches: number; playSeconds: number }> = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const dayKey = formatDayKey(date);
      const entry = snapshot.day[dayKey] ?? { sessions: 0, launches: 0, playSeconds: 0 };
      rows.push({
        day: dayKey,
        sessions: entry.sessions,
        launches: entry.launches,
        playSeconds: entry.playSeconds,
      });
    }

    return rows;
  }, [snapshot.day]);

  const openResetPrompt = () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPin = window.localStorage.getItem(PIN_KEY);
    if (!storedPin || !/^\d{4}$/.test(storedPin)) {
      setMessage("Set a Parent PIN first in /parent to reset metrics.");
      return;
    }

    setPinInput("");
    setPinError(null);
    setPinModalOpen(true);
  };

  const confirmReset = () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPin = window.localStorage.getItem(PIN_KEY);
    if (!storedPin || !/^\d{4}$/.test(storedPin)) {
      setPinError("Set a Parent PIN first.");
      return;
    }

    if (pinInput !== storedPin) {
      setPinError("Incorrect PIN.");
      return;
    }

    metricsResetAll();
    refreshSnapshot();
    setPinModalOpen(false);
    setPinInput("");
    setPinError(null);
    setMessage("Metrics reset.");
  };

  const exportJson = () => {
    const payload = metricsGetAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pixelpress-metrics-${stamp}.json`;
    anchor.click();

    window.URL.revokeObjectURL(url);
    setMessage("Metrics exported.");
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 pb-6">
      <header className={`${THEME.surfaces.card} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Admin</p>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Local Metrics</h1>
            <p className="mt-1 text-sm text-slate-300">
              Privacy-first usage analytics stored only on this device.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportJson} className={arcade.secondaryButton}>
              Export JSON
            </button>
            <button type="button" onClick={openResetPrompt} className={arcade.dangerButton}>
              Reset Metrics
            </button>
          </div>
        </div>
      </header>

      <section className={`${THEME.surfaces.card} p-4`}>
        <h2 className="text-lg font-black text-slate-100">Global Totals</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Sessions</p>
            <p className="mt-1 text-2xl font-black text-white">{snapshot.global.sessions}</p>
          </div>
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Launches</p>
            <p className="mt-1 text-2xl font-black text-white">{snapshot.global.totalGameLaunches}</p>
          </div>
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Play Time</p>
            <p className="mt-1 text-2xl font-black text-white">{formatDuration(snapshot.global.totalPlaySeconds)}</p>
          </div>
          <div className="rounded-xl border border-slate-200/15 bg-slate-950/70 p-3 sm:col-span-2 lg:col-span-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-sm text-slate-200">
                First Seen: <span className="font-semibold text-white">{formatDateTime(snapshot.global.firstSeenAt)}</span>
              </p>
              <p className="text-sm text-slate-200">
                Last Seen: <span className="font-semibold text-white">{formatDateTime(snapshot.global.lastSeenAt)}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${THEME.surfaces.card} p-4`}>
          <h2 className="text-lg font-black text-slate-100">Top Games by Launches</h2>
          <div className="mt-3 space-y-2">
            {topByLaunches.length === 0 ? (
              <p className="text-sm text-slate-300">No launches recorded yet.</p>
            ) : (
              topByLaunches.map((row, index) => (
                <div
                  key={`launch-${row.slug}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200/15 bg-slate-950/70 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {index + 1}. {row.title}
                  </p>
                  <span className={`${THEME.surfaces.pill} text-slate-100`}>{row.launches}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${THEME.surfaces.card} p-4`}>
          <h2 className="text-lg font-black text-slate-100">Top Games by Play Time</h2>
          <div className="mt-3 space-y-2">
            {topByPlayTime.length === 0 ? (
              <p className="text-sm text-slate-300">No play time recorded yet.</p>
            ) : (
              topByPlayTime.map((row, index) => (
                <div
                  key={`time-${row.slug}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200/15 bg-slate-950/70 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {index + 1}. {row.title}
                  </p>
                  <span className={`${THEME.surfaces.pill} text-slate-100`}>{formatDuration(row.playSeconds)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className={`${THEME.surfaces.card} p-4`}>
        <h2 className="text-lg font-black text-slate-100">Completion Counts per Game</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="px-3 py-2 font-semibold">Game</th>
                <th className="px-3 py-2 font-semibold">Launches</th>
                <th className="px-3 py-2 font-semibold">Completes</th>
                <th className="px-3 py-2 font-semibold">Play Time</th>
                <th className="px-3 py-2 font-semibold">Best</th>
              </tr>
            </thead>
            <tbody>
              {completionRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-300" colSpan={5}>
                    No game metrics recorded yet.
                  </td>
                </tr>
              ) : (
                completionRows.map((row) => (
                  <tr key={`complete-${row.slug}`} className="border-t border-slate-200/10 text-slate-100">
                    <td className="px-3 py-2 font-medium">{row.title}</td>
                    <td className="px-3 py-2">{row.launches}</td>
                    <td className="px-3 py-2">{row.completes}</td>
                    <td className="px-3 py-2">{formatDuration(row.playSeconds)}</td>
                    <td className="px-3 py-2">{row.best ?? "--"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${THEME.surfaces.card} p-4`}>
        <h2 className="text-lg font-black text-slate-100">Last 7 Days</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="px-3 py-2 font-semibold">Day</th>
                <th className="px-3 py-2 font-semibold">Sessions</th>
                <th className="px-3 py-2 font-semibold">Launches</th>
                <th className="px-3 py-2 font-semibold">Play Time</th>
              </tr>
            </thead>
            <tbody>
              {lastSevenDays.map((row) => (
                <tr key={row.day} className="border-t border-slate-200/10 text-slate-100">
                  <td className="px-3 py-2 font-medium">{row.day}</td>
                  <td className="px-3 py-2">{row.sessions}</td>
                  <td className="px-3 py-2">{row.launches}</td>
                  <td className="px-3 py-2">{formatDuration(row.playSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </p>
      ) : null}

      {pinModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold text-white">Parent PIN Required</h2>
            <p className="mt-1 text-sm text-slate-300">Confirm your PIN to reset local metrics.</p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(event) => {
                const digitsOnly = event.target.value.replace(/\D/g, "");
                setPinInput(digitsOnly.slice(0, 4));
              }}
              placeholder="Enter 4-digit PIN"
              className="mt-3 w-full rounded-lg border border-white/20 bg-black px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:border-white/40"
            />

            {pinError ? <p className="mt-2 text-sm text-amber-200">{pinError}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmReset}
                className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinModalOpen(false);
                  setPinInput("");
                  setPinError(null);
                }}
                className="rounded-lg border border-white/20 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

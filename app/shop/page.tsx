"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { arcade } from "@/src/lib/arcadeSkin";
import { getStarsTotal } from "@/src/lib/progress";
import { getNextUnlock } from "@/src/lib/starLadder";
import { type StarCapState, getStarCapState, resetIfNewDay as resetStarCapIfNewDay } from "@/src/lib/starCap";
import { SHOP_ITEMS, type ShopItem, getPurchases, purchaseItem } from "@/src/lib/shop";
import { THEME } from "@/src/lib/theme";

type PurchaseMessage = {
  kind: "success" | "error";
  text: string;
};

const GROUP_ORDER: Array<{ key: ShopItem["appliesTo"]; title: string }> = [
  { key: "memoryMatch", title: "Memory Match" },
  { key: "spaceRunner", title: "Space Runner" },
  { key: "global", title: "Cosmetic" },
];

function formatFailure(reason: "already_owned" | "not_enough_stars" | "capped" | "invalid"): string {
  if (reason === "already_owned") {
    return "Already owned.";
  }
  if (reason === "capped") {
    return "Not enough stars today. Come back tomorrow to earn more.";
  }
  if (reason === "not_enough_stars") {
    return "Not enough stars.";
  }
  return "Item unavailable.";
}

export default function ShopPage() {
  const [stars, setStars] = useState(0);
  const [starCapState, setStarCapState] = useState<StarCapState>({
    earnedToday: 0,
    limit: 5,
    remaining: 5,
    capped: false,
  });
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<PurchaseMessage | null>(null);

  const nextUnlock = getNextUnlock(stars);

  const groupedItems = useMemo(() => {
    const groups: Record<ShopItem["appliesTo"], ShopItem[]> = {
      memoryMatch: [],
      spaceRunner: [],
      global: [],
    };

    for (const item of SHOP_ITEMS) {
      groups[item.appliesTo].push(item);
    }
    return groups;
  }, []);

  const refreshState = useCallback(() => {
    resetStarCapIfNewDay();
    setStars(getStarsTotal());
    setStarCapState(getStarCapState());
    setPurchases(getPurchases());
  }, []);

  useEffect(() => {
    refreshState();
    const intervalId = window.setInterval(refreshState, 1500);
    window.addEventListener("storage", refreshState);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", refreshState);
    };
  }, [refreshState]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handlePurchase = (item: ShopItem) => {
    const result = purchaseItem(item.id);
    if (result.ok) {
      setMessage({ kind: "success", text: `Unlocked: ${item.title}` });
      refreshState();
      return;
    }

    setMessage({ kind: "error", text: formatFailure(result.reason ?? "invalid") });
    refreshState();
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 pb-6">
      <header className={`${THEME.surfaces.card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">PixelPress</p>
            <h1 className="text-3xl font-black text-white">Star Shop</h1>
            <p className="mt-1 text-sm text-slate-300">Spend stars to unlock themes, modes, and skins.</p>
          </div>
          <Link href="/play" className={arcade.secondaryButton}>
            Back to Play
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={arcade.chip}>
            Stars: <strong className="font-black text-amber-100">{stars}</strong>
          </span>
          <span className={arcade.chip}>
            Stars today:{" "}
            <strong className="font-black text-cyan-100">
              {starCapState.earnedToday} / {starCapState.limit}
            </strong>
          </span>
          <span className={arcade.chip}>
            {nextUnlock ? (
              <>
                Next unlock: <strong className="font-black text-violet-100">{nextUnlock.remaining}⭐</strong>
              </>
            ) : (
              <strong className="font-black text-emerald-100">All ladder unlocks complete</strong>
            )}
          </span>
        </div>
      </header>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.kind === "success"
              ? "border-emerald-200/35 bg-emerald-300/12 text-emerald-100"
              : "border-amber-200/35 bg-amber-300/12 text-amber-100"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {GROUP_ORDER.map((group) => (
        <section key={group.key} className={`${THEME.surfaces.card} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-100">{group.title}</h2>
            <span className={`${THEME.surfaces.pill} text-slate-200`}>
              {groupedItems[group.key].length} items
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {groupedItems[group.key].map((item) => {
              const owned = purchases.has(item.id);

              return (
                <article key={item.id} className="rounded-xl border border-slate-200/15 bg-slate-950/75 p-4">
                  <p className="text-base font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={arcade.chip}>
                      Cost: <strong className="font-black text-amber-100">{item.cost}⭐</strong>
                    </span>
                    <button
                      type="button"
                      disabled={owned}
                      onClick={() => handlePurchase(item)}
                      className={owned ? arcade.secondaryButton : arcade.primaryButton}
                    >
                      {owned ? "Owned ✅" : `Buy for ${item.cost}⭐`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}

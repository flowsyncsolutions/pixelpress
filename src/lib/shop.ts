import { getStarsTotal, spendStars } from "./progress";
import { getStarCapState } from "./starCap";
import { safeGetJSON, safeSetJSON } from "./storageGuard";

export type ShopItem = {
  id: string;
  title: string;
  description: string;
  cost: number;
  type: "theme" | "mode" | "skin";
  appliesTo: "memoryMatch" | "spaceRunner" | "global";
  meta?: any;
};

const PURCHASES_KEY = "pp_purchases";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "theme_ocean",
    title: "Ocean Theme",
    description: "Splashy sea creatures for Memory Match.",
    cost: 6,
    type: "theme",
    appliesTo: "memoryMatch",
    meta: { themeId: "ocean" },
  },
  {
    id: "theme_animals",
    title: "Animals Theme",
    description: "Friendly animal cards for Memory Match.",
    cost: 6,
    type: "theme",
    appliesTo: "memoryMatch",
    meta: { themeId: "animals" },
  },
  {
    id: "mode_meteor",
    title: "Meteor Storm Mode",
    description: "Faster asteroid spawns in Space Runner.",
    cost: 8,
    type: "mode",
    appliesTo: "spaceRunner",
    meta: { modeId: "meteor" },
  },
  {
    id: "mode_lowgrav",
    title: "Low Gravity Mode",
    description: "Floaty jumps and a different rhythm.",
    cost: 8,
    type: "mode",
    appliesTo: "spaceRunner",
    meta: { modeId: "lowgrav" },
  },
  {
    id: "skin_neon",
    title: "Neon Rocket Skin",
    description: "A bright neon look for your Space Runner rocket.",
    cost: 10,
    type: "skin",
    appliesTo: "spaceRunner",
    meta: { skinId: "neon" },
  },
  {
    id: "badge_arcadefan",
    title: "Arcade Fan Badge",
    description: "A cosmetic badge for your arcade profile.",
    cost: 12,
    type: "skin",
    appliesTo: "global",
    meta: { badgeId: "arcadefan" },
  },
];

const SHOP_ITEM_IDS = new Set(SHOP_ITEMS.map((item) => item.id));

function normalizePurchaseIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") {
      continue;
    }
    if (!SHOP_ITEM_IDS.has(value)) {
      continue;
    }
    unique.add(value);
  }

  return [...unique];
}

function readPurchasesArray(): string[] {
  const parsed = safeGetJSON<unknown>(PURCHASES_KEY, []);
  const normalized = normalizePurchaseIds(parsed);
  if (!Array.isArray(parsed) || normalized.length !== parsed.length) {
    safeSetJSON(PURCHASES_KEY, normalized);
  }
  return normalized;
}

function writePurchases(ids: Iterable<string>): void {
  const normalized = normalizePurchaseIds([...ids]);
  safeSetJSON(PURCHASES_KEY, normalized);
}

function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function getPurchases(): Set<string> {
  return new Set(readPurchasesArray());
}

export function hasPurchase(id: string): boolean {
  return getPurchases().has(id);
}

export function purchaseItem(
  id: string,
): { ok: boolean; reason?: "already_owned" | "not_enough_stars" | "capped" | "invalid" } {
  const item = getShopItem(id);
  if (!item) {
    return { ok: false, reason: "invalid" };
  }

  const purchases = getPurchases();
  if (purchases.has(id)) {
    return { ok: false, reason: "already_owned" };
  }

  const currentStars = getStarsTotal();
  if (currentStars < item.cost) {
    return {
      ok: false,
      reason: getStarCapState().capped ? "capped" : "not_enough_stars",
    };
  }

  const spent = spendStars(item.cost);
  if (!spent) {
    return {
      ok: false,
      reason: getStarCapState().capped ? "capped" : "not_enough_stars",
    };
  }

  purchases.add(id);
  writePurchases(purchases);
  return { ok: true };
}

export function resetPurchases(): void {
  writePurchases([]);
}

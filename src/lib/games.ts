import type { AccentTone } from "./theme";
import { SPACE_RUNNER_MODES } from "./variants";

export const CATEGORIES = ["kids", "classics", "educational", "puzzles"] as const;

export type GameCategory = (typeof CATEGORIES)[number];

export type Game = {
  slug: string;
  title: string;
  icon: string;
  cover?: string;
  accent: AccentTone;
  featured?: boolean;
  description: string;
  tags: string[];
  category: GameCategory;
  status: "live" | "coming_soon";
  embedType: "internal" | "iframe";
  internalEngine?:
    | "tictactoe"
    | "spaceRunner"
    | "memoryMatch"
    | "reactionTap"
    | "whackAMole"
    | "balloonPop";
  embedSrc?: string;
  variantOf?: string;
  variantId?: string;
  variantLabel?: string;
  params?: Record<string, any>;
};

export const ALLOWED_IFRAME_HOSTS: string[] = [];

// To add a real game cover image:
// 1) drop `public/covers/{slug}.svg` (or .png/.webp)
// 2) set `cover: "/covers/{slug}.svg"` on that game entry below.
const BASE_GAMES: Game[] = [
  {
    slug: "space-runner",
    title: "Space Runner",
    icon: "🚀",
    cover: "/covers/space-runner.svg",
    accent: "cyan",
    featured: true,
    description: "Jump over incoming asteroids in a speedy space sprint.",
    tags: ["kids", "runner", "space"],
    category: "kids",
    status: "live",
    embedType: "internal",
    internalEngine: "spaceRunner",
  },
  {
    slug: "whack-a-mole",
    title: "Whack-a-Mole",
    icon: "🐹",
    accent: "emerald",
    featured: true,
    description: "Tap the mole as fast as you can!",
    tags: ["kids", "arcade", "tap"],
    category: "kids",
    status: "live",
    embedType: "internal",
    internalEngine: "whackAMole",
  },
  {
    slug: "balloon-pop",
    title: "Balloon Pop",
    icon: "🎈",
    accent: "rose",
    featured: true,
    description: "Pop balloons before they float away.",
    tags: ["kids", "arcade", "tap"],
    category: "kids",
    status: "live",
    embedType: "internal",
    internalEngine: "balloonPop",
  },
  {
    slug: "reaction-tap",
    title: "Reaction Tap",
    icon: "⚡",
    cover: "/covers/reaction-tap.svg",
    accent: "amber",
    featured: false,
    description: "Wait for green, then tap fast.",
    tags: ["kids", "reaction", "arcade"],
    category: "kids",
    status: "live",
    embedType: "internal",
    internalEngine: "reactionTap",
  },
  {
    slug: "memory-match",
    title: "Memory Match",
    icon: "🧠",
    cover: "/covers/memory-match.svg",
    accent: "violet",
    featured: true,
    description: "Flip cards and find all pairs with fewer moves.",
    tags: ["kids", "memory"],
    category: "kids",
    status: "live",
    embedType: "internal",
    internalEngine: "memoryMatch",
  },
  {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    icon: "⭕",
    cover: "/covers/tic-tac-toe.svg",
    accent: "amber",
    featured: false,
    description: "Classic 3x3 strategy rounds for quick wins.",
    tags: ["classics", "strategy"],
    category: "classics",
    status: "live",
    embedType: "internal",
    internalEngine: "tictactoe",
  },
];

const SPACE_RUNNER_VARIANTS: Game[] = SPACE_RUNNER_MODES.map((mode) => ({
  slug: `space-runner-${mode.id}`,
  title: `Space Runner: ${mode.label}`,
  icon: "🚀",
  cover: "/covers/space-runner.svg",
  accent: "cyan",
  featured: false,
  description: `Dodge asteroids in ${mode.label.toLowerCase()} mode.`,
  tags: ["kids", "runner", "space", "variant"],
  category: "kids",
  status: "live",
  embedType: "internal",
  internalEngine: "spaceRunner",
  variantOf: "space-runner",
  variantId: mode.id,
  variantLabel: mode.label,
  params: { modeId: mode.id },
}));

const COMING_SOON_GAMES: Game[] = [
  {
    slug: "bubble-pop",
    title: "Bubble Pop",
    icon: "🫧",
    accent: "rose",
    featured: false,
    description: "Pop colorful bubble groups before the timer ends.",
    tags: ["kids", "casual"],
    category: "kids",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "color-sort",
    title: "Color Sort",
    icon: "🎨",
    accent: "emerald",
    featured: false,
    description: "Sort mixed colors into matching tubes with smart moves.",
    tags: ["kids", "logic"],
    category: "kids",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "pong",
    title: "Pong",
    icon: "🏓",
    accent: "violet",
    featured: false,
    description: "Retro paddle rallies with quick back-and-forth action.",
    tags: ["classics", "retro"],
    category: "classics",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "snake",
    title: "Snake",
    icon: "🐍",
    accent: "cyan",
    featured: false,
    description: "Collect pixels, grow longer, and avoid crashing.",
    tags: ["classics", "arcade"],
    category: "classics",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "breakout",
    title: "Breakout",
    icon: "🧱",
    accent: "amber",
    featured: false,
    description: "Bounce the ball and clear every brick wall.",
    tags: ["classics", "arcade"],
    category: "classics",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "slide-puzzle",
    title: "Slide Puzzle",
    icon: "🧩",
    accent: "cyan",
    featured: false,
    description: "Slide tiles into order in fewer moves each round.",
    tags: ["puzzles", "logic"],
    category: "puzzles",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "word-hunt",
    title: "Word Hunt",
    icon: "🔎",
    accent: "rose",
    featured: false,
    description: "Find hidden words across letter grids before time runs out.",
    tags: ["puzzles", "word"],
    category: "puzzles",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "math-dash",
    title: "Math Dash",
    icon: "➕",
    accent: "emerald",
    featured: false,
    description: "Solve quick math prompts to keep your dash going.",
    tags: ["educational", "math"],
    category: "educational",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "spelling-splash",
    title: "Spelling Splash",
    icon: "📖",
    accent: "violet",
    featured: false,
    description: "Spell words correctly to splash through each stage.",
    tags: ["educational", "spelling"],
    category: "educational",
    status: "coming_soon",
    embedType: "internal",
  },
];

export const GAMES: Game[] = [
  ...BASE_GAMES,
  ...SPACE_RUNNER_VARIANTS,
  ...COMING_SOON_GAMES,
];

export function getAllGames(): Game[] {
  return GAMES;
}

export function getGameBySlug(slug: string): Game | undefined {
  return GAMES.find((game) => game.slug === slug);
}

export function getGamesByCategory(category: GameCategory): Game[] {
  return GAMES.filter((game) => game.category === category);
}

export function getLiveGames(): Game[] {
  return GAMES.filter((game) => game.status === "live");
}

export function getLiveGamesByCategory(category: GameCategory): Game[] {
  return getLiveGames().filter((game) => game.category === category);
}

export function searchGames(games: Game[], query: string): Game[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return games;
  }

  return games.filter((game) => {
    const tags = game.tags.join(" ").toLowerCase();
    const variant = (game.variantLabel ?? "").toLowerCase();
    const haystack = `${game.title} ${game.description} ${tags} ${variant}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function getCategoryCounts(): Record<GameCategory | "all", number> {
  const counts: Record<GameCategory | "all", number> = {
    all: GAMES.length,
    kids: 0,
    classics: 0,
    educational: 0,
    puzzles: 0,
  };

  for (const game of GAMES) {
    counts[game.category] += 1;
  }

  return counts;
}

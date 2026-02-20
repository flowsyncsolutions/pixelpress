import type { AccentTone } from "./theme";
import { MEMORY_MATCH_THEMES, SPACE_RUNNER_MODES } from "./variants";

export const CATEGORIES = ["kids", "classics", "educational", "puzzles"] as const;

export type GameCategory = (typeof CATEGORIES)[number];

export type Game = {
  slug: string;
  title: string;
  icon: string;
  cover?: string;
  accent: AccentTone;
  featured: boolean;
  description: string;
  tags: string[];
  category: GameCategory;
  status: "live" | "coming_soon";
  embedType: "internal" | "iframe";
  internalEngine?: "tictactoe" | "spaceRunner" | "memoryMatch" | "reactionTap";
  embedSrc?: string;
  variantOf?: string;
  variantId?: string;
  variantLabel?: string;
  params?: Record<string, any>;
};

export const ALLOWED_IFRAME_HOSTS: string[] = [];

// To add a real game cover image:
// 1) drop `public/covers/{slug}.png`
// 2) set `cover: "/covers/{slug}.png"` on that game entry below.
const BASE_GAMES: Game[] = [
  {
    slug: "space-runner",
    title: "Space Runner",
    icon: "🚀",
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
    slug: "reaction-tap",
    title: "Reaction Tap",
    icon: "⚡",
    accent: "amber",
    featured: true,
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
    cover: "/covers/memory-match.png",
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
    cover: "/covers/tic-tac-toe.png",
    accent: "amber",
    featured: true,
    description: "Classic 3x3 strategy rounds for quick wins.",
    tags: ["classics", "strategy"],
    category: "classics",
    status: "live",
    embedType: "internal",
    internalEngine: "tictactoe",
  },
];

const MEMORY_MATCH_VARIANTS: Game[] = MEMORY_MATCH_THEMES.map((theme) => ({
  slug: `memory-match-${theme.id}`,
  title: `Memory Match: ${theme.label}`,
  icon: "🧠",
  accent: "violet",
  featured: false,
  description: `Match pairs with the ${theme.label} theme.`,
  tags: ["kids", "memory", "variant"],
  category: "kids",
  status: "live",
  embedType: "internal",
  internalEngine: "memoryMatch",
  variantOf: "memory-match",
  variantId: theme.id,
  variantLabel: theme.label,
  params: { themeId: theme.id },
}));

const SPACE_RUNNER_VARIANTS: Game[] = SPACE_RUNNER_MODES.map((mode) => ({
  slug: `space-runner-${mode.id}`,
  title: `Space Runner: ${mode.label}`,
  icon: "🚀",
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
  ...MEMORY_MATCH_VARIANTS,
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

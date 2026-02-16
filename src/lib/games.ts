import type { AccentTone } from "./theme";

export const CATEGORIES = ["kids", "classics", "educational", "puzzles"] as const;

export type GameCategory = (typeof CATEGORIES)[number];

export type Game = {
  slug: string;
  title: string;
  icon: string;
  accent: AccentTone;
  featured: boolean;
  description: string;
  tags: string[];
  category: GameCategory;
  status: "live" | "coming_soon";
  embedType: "internal" | "iframe";
  embedSrc?: string;
};

export const ALLOWED_IFRAME_HOSTS: string[] = [];

export const GAMES: Game[] = [
  {
    slug: "rainbow-hop",
    title: "Rainbow Hop",
    icon: "🌈",
    accent: "rose",
    featured: true,
    description: "Jump across floating colors and avoid the splash zones.",
    tags: ["kids", "reaction"],
    category: "kids",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "bubble-pop-party",
    title: "Bubble Pop Party",
    icon: "🫧",
    accent: "cyan",
    featured: false,
    description: "Pop matching bubbles before the board fills up.",
    tags: ["kids", "casual"],
    category: "kids",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "space-pet-rescue",
    title: "Space Pet Rescue",
    icon: "👾",
    accent: "violet",
    featured: true,
    description: "Guide friendly pets through easy space lanes.",
    tags: ["kids", "arcade"],
    category: "kids",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "color-runner-jr",
    title: "Color Runner Jr",
    icon: "🏃",
    accent: "emerald",
    featured: false,
    description: "Dash through bright tracks and collect safe boosts.",
    tags: ["kids", "runner"],
    category: "kids",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    icon: "⭕",
    accent: "amber",
    featured: false,
    description: "Classic 3x3 strategy rounds for quick wins.",
    tags: ["classics", "strategy"],
    category: "classics",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "memory-match",
    title: "Memory Match",
    icon: "🧠",
    accent: "emerald",
    featured: true,
    description: "Flip cards and find all pairs with fewer moves.",
    tags: ["classics", "memory"],
    category: "classics",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "snake",
    title: "Snake",
    icon: "🐍",
    accent: "cyan",
    featured: false,
    description: "Collect pixels, grow longer, and avoid walls.",
    tags: ["classics", "arcade"],
    category: "classics",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "breakout",
    title: "Breakout",
    icon: "🧱",
    accent: "amber",
    featured: false,
    description: "Bounce the ball and clear every block.",
    tags: ["classics", "arcade"],
    category: "classics",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "pong",
    title: "Pong",
    icon: "🏓",
    accent: "violet",
    featured: false,
    description: "Retro paddle battles with simple controls.",
    tags: ["classics", "retro"],
    category: "classics",
    status: "coming_soon",
    embedType: "iframe",
    embedSrc: "https://example.com/games/pong",
  },
  {
    slug: "math-sprint",
    title: "Math Sprint",
    icon: "➗",
    accent: "emerald",
    featured: false,
    description: "Solve quick arithmetic to keep your runner moving.",
    tags: ["educational", "math"],
    category: "educational",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "word-trails",
    title: "Word Trails",
    icon: "🔤",
    accent: "rose",
    featured: false,
    description: "Build words from letter paths across the board.",
    tags: ["educational", "spelling"],
    category: "educational",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "planet-facts-quiz",
    title: "Planet Facts Quiz",
    icon: "🪐",
    accent: "violet",
    featured: true,
    description: "Pick the right fact to travel through the solar system.",
    tags: ["educational", "science"],
    category: "educational",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "shape-lab",
    title: "Shape Lab",
    icon: "📐",
    accent: "amber",
    featured: false,
    description: "Match 2D and 3D shapes in short challenge sets.",
    tags: ["educational", "geometry"],
    category: "educational",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "orbit-puzzle",
    title: "Orbit Puzzle",
    icon: "🧩",
    accent: "cyan",
    featured: false,
    description: "Rotate rings and align paths to guide energy cores home.",
    tags: ["puzzles", "logic"],
    category: "puzzles",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "maze-drift",
    title: "Maze Drift",
    icon: "🌀",
    accent: "emerald",
    featured: false,
    description: "Steer through shifting mazes with careful timing.",
    tags: ["puzzles", "maze"],
    category: "puzzles",
    status: "live",
    embedType: "internal",
  },
  {
    slug: "pattern-lock",
    title: "Pattern Lock",
    icon: "🔐",
    accent: "rose",
    featured: false,
    description: "Repeat growing patterns before the timer runs out.",
    tags: ["puzzles", "memory"],
    category: "puzzles",
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "block-logic",
    title: "Block Logic",
    icon: "🧊",
    accent: "cyan",
    featured: false,
    description: "Slide blocks into place to complete each board.",
    tags: ["puzzles", "strategy"],
    category: "puzzles",
    status: "coming_soon",
    embedType: "internal",
  },
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

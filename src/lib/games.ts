export type Game = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  status: "live" | "coming_soon";
  embedType: "internal" | "iframe";
  embedSrc?: string;
};

export const GAMES: Game[] = [
  {
    slug: "brick-blaster",
    title: "Brick Blaster",
    description: "Break every brick and chase high scores in short sessions.",
    tags: ["arcade", "score-attack"],
    status: "live",
    embedType: "internal",
  },
  {
    slug: "orbit-puzzle",
    title: "Orbit Puzzle",
    description: "Rotate rings and align paths to guide energy cores home.",
    tags: ["puzzle", "strategy"],
    status: "live",
    embedType: "internal",
  },
  {
    slug: "pixel-pairs",
    title: "Pixel Pairs",
    description: "Fast memory matching rounds with timed combo bonuses.",
    tags: ["memory", "casual"],
    status: "live",
    embedType: "internal",
  },
  {
    slug: "dungeon-dash",
    title: "Dungeon Dash",
    description: "Sprint through traps and grab loot before the timer ends.",
    tags: ["action", "runner"],
    status: "live",
    embedType: "iframe",
    embedSrc: "https://example.com/games/dungeon-dash",
  },
  {
    slug: "maze-drift",
    title: "Maze Drift",
    description: "Steer through shifting mazes with tight drift controls.",
    tags: ["skill", "maze"],
    status: "live",
    embedType: "iframe",
    embedSrc: "https://example.com/games/maze-drift",
  },
  {
    slug: "zen-golf",
    title: "Zen Golf",
    description: "One-button mini golf with calm loops and tricky angles.",
    tags: ["sports", "casual"],
    status: "live",
    embedType: "iframe",
    embedSrc: "https://example.com/games/zen-golf",
  },
  {
    slug: "neon-runner",
    title: "Neon Runner",
    description: "Dodge obstacles and chain boosts on neon highways.",
    tags: ["runner", "arcade"],
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "sky-drop",
    title: "Sky Drop",
    description: "Navigate free-fall courses and hit precision landing zones.",
    tags: ["reaction", "arcade"],
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "tap-tycoon",
    title: "Tap Tycoon",
    description: "Build a tiny empire with fast incremental upgrades.",
    tags: ["idle", "simulation"],
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "code-commander",
    title: "Code Commander",
    description: "Program simple commands to move bots through levels.",
    tags: ["logic", "programming"],
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "stack-smash",
    title: "Stack Smash",
    description: "Time perfect drops to build and collapse massive stacks.",
    tags: ["timing", "arcade"],
    status: "coming_soon",
    embedType: "internal",
  },
  {
    slug: "retro-karts",
    title: "Retro Karts",
    description: "Top-down kart sprints with drifting and item pickups.",
    tags: ["racing", "multiplayer"],
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

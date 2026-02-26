export type StarGoalType = "cosmetic" | "gameplay" | "badge";

export type StarLadderGoal = {
  id: string;
  stars: number;
  title: string;
  description: string;
  type: StarGoalType;
};

export const STAR_LADDER: StarLadderGoal[] = [
  {
    id: "rocket_skin_2",
    stars: 5,
    title: "Rocket Skin Level 2",
    description: "A brighter rocket trail in Space Runner.",
    type: "cosmetic",
  },
  {
    id: "memory_normal",
    stars: 10,
    title: "Memory Match: Normal Mode",
    description: "Unlock 4x4 grid difficulty.",
    type: "gameplay",
  },
  {
    id: "rocket_skin_3",
    stars: 20,
    title: "Rocket Skin Level 3",
    description: "A special glow rocket skin.",
    type: "cosmetic",
  },
  {
    id: "arcade_challenger",
    stars: 30,
    title: "Arcade Challenger Badge",
    description: "A badge shown on your shelf.",
    type: "badge",
  },
];

export function getNextUnlock(totalStars: number): { goal: StarLadderGoal; remaining: number } | null {
  const normalizedStars = Math.max(0, Math.floor(totalStars));
  const goal = STAR_LADDER.find((entry) => normalizedStars < entry.stars);
  if (!goal) {
    return null;
  }

  return {
    goal,
    remaining: Math.max(0, goal.stars - normalizedStars),
  };
}

export function getUnlockProgress(totalStars: number, goalStars: number): number {
  if (goalStars <= 0) {
    return 1;
  }
  const normalizedStars = Math.max(0, Math.floor(totalStars));
  const ratio = normalizedStars / goalStars;
  return Math.min(1, Math.max(0, ratio));
}

export function getUnlockedIds(totalStars: number): string[] {
  const normalizedStars = Math.max(0, Math.floor(totalStars));
  return STAR_LADDER.filter((entry) => normalizedStars >= entry.stars).map((entry) => entry.id);
}

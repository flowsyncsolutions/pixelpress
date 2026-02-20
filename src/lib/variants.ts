export type MemoryMatchTheme = {
  id: string;
  label: string;
  emojis: string[];
};

export type SpaceRunnerMode = {
  id: string;
  label: string;
  speedMult: number;
  gravityMult: number;
  spawnMult: number;
};

export const MEMORY_MATCH_THEMES: MemoryMatchTheme[] = [
  {
    id: "space",
    label: "Space",
    emojis: ["🚀", "🌙", "⭐", "🪐", "☄️", "👽", "🛰️", "🌌", "🌠", "🛸", "🔭", "🌍", "☀️", "⚡", "🌈", "🦄", "🐱", "🐶"],
  },
  {
    id: "animals",
    label: "Animals",
    emojis: ["🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐵", "🐰", "🦄", "🐙", "🐬", "🐧", "🦋", "🐢", "🦖"],
  },
  {
    id: "shapes",
    label: "Shapes",
    emojis: ["🔵", "🟢", "🟡", "🟠", "🔴", "🟣", "🟤", "⚫", "⚪", "🔺", "🔻", "🔷", "🔶", "◼️", "◻️", "⭐", "💠", "🔘"],
  },
  {
    id: "food",
    label: "Food",
    emojis: ["🍎", "🍌", "🍓", "🍇", "🍉", "🍒", "🍍", "🥝", "🥑", "🥕", "🍕", "🍔", "🌮", "🍿", "🧁", "🍩", "🍪", "🍫"],
  },
  {
    id: "ocean",
    label: "Ocean",
    emojis: ["🐳", "🐬", "🦈", "🐙", "🦀", "🦑", "🐠", "🐟", "🐡", "🪼", "🦭", "🐢", "🌊", "🏝️", "⚓", "🚤", "🌤️", "💧"],
  },
  {
    id: "jungle",
    label: "Jungle",
    emojis: ["🦁", "🐯", "🐒", "🦜", "🐍", "🦧", "🦍", "🐘", "🦒", "🦓", "🌴", "🌿", "🍃", "🌺", "🌼", "🪵", "☀️", "🍌"],
  },
  {
    id: "dinos",
    label: "Dinosaurs",
    emojis: ["🦖", "🦕", "🌋", "🦴", "🌿", "🪨", "🌴", "☄️", "🦎", "🐊", "🪺", "🥚", "🦕", "🦖", "🐾", "🌧️", "⛰️", "🌞"],
  },
  {
    id: "sports",
    label: "Sports",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🥏", "🎯", "🏓", "🥊", "🏸", "⛳", "🎳", "⛸️", "🏆", "🥇", "🥈"],
  },
  {
    id: "music",
    label: "Music",
    emojis: ["🎵", "🎶", "🎤", "🎧", "🎹", "🥁", "🎸", "🎺", "🎷", "🪕", "🪗", "🎻", "📻", "💿", "🕺", "💃", "🎼", "🎙️"],
  },
  {
    id: "weather",
    label: "Weather",
    emojis: ["☀️", "🌤️", "⛅", "🌥️", "☁️", "🌧️", "⛈️", "🌩️", "❄️", "🌨️", "🌪️", "🌈", "💧", "💨", "🌊", "🌫️", "🌡️", "🌙"],
  },
  {
    id: "fantasy",
    label: "Fantasy",
    emojis: ["🦄", "🐉", "🧙", "🪄", "🧚", "🧝", "🛡️", "⚔️", "🏰", "👑", "🔮", "✨", "🌟", "🪙", "📜", "🔥", "🌙", "🕯️"],
  },
  {
    id: "robots",
    label: "Robots",
    emojis: ["🤖", "⚙️", "🔋", "🧠", "🛰️", "📡", "🛠️", "💻", "⌨️", "🖥️", "🔌", "🕹️", "📱", "🧲", "🪛", "🪫", "📟", "🧪"],
  },
];

export const SPACE_RUNNER_MODES: SpaceRunnerMode[] = [
  { id: "normal", label: "Normal", speedMult: 1, gravityMult: 1, spawnMult: 1 },
  { id: "meteor", label: "Meteor Storm", speedMult: 1.15, gravityMult: 1, spawnMult: 1.35 },
  { id: "lowgrav", label: "Low Gravity", speedMult: 1, gravityMult: 0.75, spawnMult: 1 },
  { id: "turbo", label: "Turbo", speedMult: 1.3, gravityMult: 1, spawnMult: 1.2 },
  { id: "drift", label: "Drift", speedMult: 0.9, gravityMult: 0.85, spawnMult: 1.1 },
  { id: "training", label: "Training", speedMult: 0.82, gravityMult: 0.95, spawnMult: 0.82 },
];

export function getMemoryMatchTheme(themeId?: string): MemoryMatchTheme | null {
  if (!themeId) {
    return null;
  }
  return MEMORY_MATCH_THEMES.find((theme) => theme.id === themeId) ?? null;
}

export function getSpaceRunnerMode(modeId?: string): SpaceRunnerMode {
  if (!modeId) {
    return SPACE_RUNNER_MODES[0];
  }
  return SPACE_RUNNER_MODES.find((mode) => mode.id === modeId) ?? SPACE_RUNNER_MODES[0];
}

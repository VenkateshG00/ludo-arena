import type { PlayerColor } from "./types";

export const COLORS: PlayerColor[] = ["red", "green", "yellow", "blue"];

export const TOTAL_TRACK_SQUARES = 52; // main track squares (0-51)
export const HOME_LANE_LENGTH = 6;     // 0-5, token finishes on 5

// Each color's entry square on the main track (first square after leaving base)
export const COLOR_ENTRY: Record<PlayerColor, number> = {
  red:    0,
  green:  13,
  yellow: 26,
  blue:   39,
};

// Where each color's home lane starts (the square before the colored home lane)
// A token with trackPos === HOME_LANE_ENTRY[color] can enter the home lane
export const HOME_LANE_ENTRY: Record<PlayerColor, number> = {
  red:    51,
  green:  12,
  yellow: 25,
  blue:   38,
};

// Safe squares on the main track (cannot be captured here)
export const SAFE_SQUARES: Set<number> = new Set([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

// Star squares (grant extra roll on landing, not home lane entry)
export const STAR_SQUARES: Set<number> = new Set([8, 21, 34, 47]);

// Track squares that are starting squares for each color (also safe)
export const STARTING_SQUARES: Set<number> = new Set(
  Object.values(COLOR_ENTRY)
);

export const RECONNECT_GRACE_MS = 30_000;
export const ROOM_EXPIRE_IDLE_MS = 30 * 60 * 1000;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const TOKENS_PER_PLAYER = 4;
export const MAX_ROOM_CODE_ATTEMPTS = 10;

export const DEFAULT_CONFIG = {
  playerCount: 4 as const,
  blockRule: false,
  captureBonus: false,
  threeConsecSixes: "skip" as const,
};

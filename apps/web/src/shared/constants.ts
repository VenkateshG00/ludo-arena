import type { PlayerColor } from "@ludo/game-engine";

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: "#E63946",
  green: "#2DC653",
  yellow: "#FFBE0B",
  blue: "#4361EE",
};

export const COLOR_LIGHT: Record<PlayerColor, string> = {
  red: "#fde8ea",
  green: "#e0f7e9",
  yellow: "#fff8e0",
  blue: "#e8edff",
};

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

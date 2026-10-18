import React from "react";
import type { Player, PlayerColor } from "@ludo/game-engine";

const COLOR_HEX: Record<PlayerColor, string> = {
  red:    "#E63946",
  green:  "#2DC653",
  yellow: "#FFBE0B",
  blue:   "#4361EE",
};

interface PlayerPanelProps {
  players: Player[];
  activePlayerIndex: number;
  myPlayerId: string | null;
  disconnectedPlayers: Set<string>;
}

export function PlayerPanel({ players, activePlayerIndex, myPlayerId, disconnectedPlayers }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((player, idx) => {
        const isActive = idx === activePlayerIndex;
        const isMe = player.id === myPlayerId;
        const isDisconnected = disconnectedPlayers.has(player.id);
        const finished = player.tokens.filter(t => t.status === "finished").length;
        const color = COLOR_HEX[player.color];

        return (
          <div
            key={player.id}
            className={[
              "flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-all",
              isActive ? "border-yellow-400 bg-yellow-400/10 shadow-md" : "border-transparent bg-white/5",
            ].join(" ")}
            aria-label={`${player.name}${isMe ? " (you)" : ""}${isActive ? " — active" : ""}`}
          >
            {/* Color dot */}
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white/30"
              style={{ background: color }}
            />

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm truncate" style={{ color: isActive ? color : "inherit" }}>
                  {player.name}
                </span>
                {isMe && <span className="text-xs text-white/50">(you)</span>}
                {isDisconnected && (
                  <span className="text-xs text-orange-400 animate-pulse">⚡ away</span>
                )}
              </div>
              {/* Token progress */}
              <div className="flex gap-1 mt-0.5">
                {player.tokens.map(t => (
                  <div
                    key={t.id}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: t.status === "finished" ? color : "rgba(255,255,255,0.2)",
                      border: `1px solid ${color}`,
                    }}
                    title={`Token ${t.index + 1}: ${t.status}`}
                  />
                ))}
              </div>
            </div>

            {/* Finished count */}
            {finished > 0 && (
              <div className="text-xs font-bold" style={{ color }}>
                {finished}/4 🏁
              </div>
            )}

            {/* Active indicator */}
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

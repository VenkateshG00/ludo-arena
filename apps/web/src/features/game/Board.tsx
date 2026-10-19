import React, { useMemo } from "react";
import type { GameState, PlayerColor, LegalMove } from "@ludo/game-engine";
import {
  CELL,
  BOARD_SIZE,
  SAFE_SQUARES,
  TRACK_GRID,
  HOME_LANE_GRID,
  BASE_GRID,
  tokenScreenPos,
  COLOR_ENTRY,
} from "@ludo/game-engine";
import { COLOR_HEX, COLOR_LIGHT } from "../../shared/constants";

interface BoardProps {
  game: GameState;
  myPlayerId: string | null;
  onTokenClick: (tokenId: string) => void;
  legalTokenIds: Set<string>;
  hiddenTokens?: Set<string>;
  animationLayer?: React.ReactNode;
}

export function Board({ game, myPlayerId, onTokenClick, legalTokenIds, hiddenTokens, animationLayer }: BoardProps) {
  const activePlayer = game.players[game.activePlayerIndex];

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      className="w-full max-w-[580px] h-auto drop-shadow-2xl"
      style={{ touchAction: "manipulation" }}
      role="img"
      aria-label="Ludo board"
    >
      {/* Board background */}
      <rect width={BOARD_SIZE} height={BOARD_SIZE} fill="#F8F4E8" rx={8} />

      {/* Grid cells */}
      <TrackCells />
      <HomeAreas />
      <BaseAreas />
      <CenterFinish />

      {/* Tokens */}
      {game.players.flatMap(player =>
        player.tokens.map(token => {
          if (hiddenTokens?.has(token.id)) return null;
          const pos = tokenScreenPos(token);
          const isLegal = legalTokenIds.has(token.id);
          const isMine = player.id === myPlayerId;
          return (
            <Token
              key={token.id}
              token={token}
              x={pos.x}
              y={pos.y}
              color={COLOR_HEX[token.color]}
              isLegal={isLegal && isMine}
              onClick={() => isLegal && isMine && onTokenClick(token.id)}
            />
          );
        })
      )}

      {/* Animation overlay layer */}
      {animationLayer}
    </svg>
  );
}

function TrackCells() {
  return (
    <>
      {TRACK_GRID.map(([col, row], idx) => {
        const x = col * CELL;
        const y = row * CELL;
        const isSafe = SAFE_SQUARES.has(idx);
        return (
          <g key={idx}>
            <rect
              x={x + 1}
              y={y + 1}
              width={CELL - 2}
              height={CELL - 2}
              fill={isSafe ? "#e8f5e9" : "#fff"}
              stroke="#ccc"
              strokeWidth={0.5}
              rx={2}
            />
            {isSafe && (
              <text x={x + CELL / 2} y={y + CELL / 2 + 5} textAnchor="middle" fontSize={14} fill="#2DC653" aria-hidden>
                ★
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function HomeAreas() {
  const colors: PlayerColor[] = ["red", "green", "yellow", "blue"];
  return (
    <>
      {colors.flatMap(color =>
        HOME_LANE_GRID[color].map(([col, row], idx) => (
          <rect
            key={`${color}_home_${idx}`}
            x={col * CELL + 1}
            y={row * CELL + 1}
            width={CELL - 2}
            height={CELL - 2}
            fill={idx === 5 ? COLOR_HEX[color] : COLOR_LIGHT[color]}
            stroke={COLOR_HEX[color]}
            strokeWidth={0.5}
            rx={2}
          />
        ))
      )}
    </>
  );
}

function BaseAreas() {
  const colors: PlayerColor[] = ["red", "green", "yellow", "blue"];
  // Base area bounding boxes (6x6 cells in each corner)
  const baseRegions: Record<PlayerColor, [number, number]> = {
    red:    [0, 0],
    green:  [0, 9],
    yellow: [9, 9],
    blue:   [9, 0],
  };
  return (
    <>
      {colors.map(color => {
        const [colStart, rowStart] = baseRegions[color];
        return (
          <g key={`base_${color}`}>
            <rect
              x={colStart * CELL}
              y={rowStart * CELL}
              width={6 * CELL}
              height={6 * CELL}
              fill={COLOR_LIGHT[color]}
              stroke={COLOR_HEX[color]}
              strokeWidth={2}
              rx={4}
            />
            <text
              x={(colStart + 3) * CELL}
              y={(rowStart + 0.6) * CELL}
              textAnchor="middle"
              fontSize={11}
              fontWeight="bold"
              fill={COLOR_HEX[color]}
              fontFamily="Fredoka One, sans-serif"
            >
              {color.toUpperCase()}
            </text>
            {/* 4 token slot circles */}
            {BASE_GRID[color].map(([c, r], i) => (
              <circle
                key={i}
                cx={c * CELL + CELL / 2}
                cy={r * CELL + CELL / 2}
                r={14}
                fill="white"
                stroke={COLOR_HEX[color]}
                strokeWidth={1.5}
              />
            ))}
          </g>
        );
      })}
    </>
  );
}

function CenterFinish() {
  // Center 3×3 block (cols 6-8, rows 6-8) — triangle finish area
  return (
    <g>
      {/* Red triangle */}
      <polygon points="240,240 360,240 300,300" fill="#E63946" opacity={0.85} />
      {/* Green triangle */}
      <polygon points="240,240 240,360 300,300" fill="#2DC653" opacity={0.85} />
      {/* Yellow triangle */}
      <polygon points="240,360 360,360 300,300" fill="#FFBE0B" opacity={0.85} />
      {/* Blue triangle */}
      <polygon points="360,240 360,360 300,300" fill="#4361EE" opacity={0.85} />
      {/* Center star */}
      <circle cx={300} cy={300} r={18} fill="white" />
      <text x={300} y={306} textAnchor="middle" fontSize={20} aria-hidden>⭐</text>
    </g>
  );
}

interface TokenProps {
  token: { id: string; color: PlayerColor; index: number };
  x: number;
  y: number;
  color: string;
  isLegal: boolean;
  onClick: () => void;
}

function Token({ token, x, y, color, isLegal, onClick }: TokenProps) {
  return (
    <g
      onClick={onClick}
      role={isLegal ? "button" : undefined}
      aria-label={isLegal ? `Move ${token.color} token ${token.index + 1}` : undefined}
      style={{ cursor: isLegal ? "pointer" : "default" }}
      tabIndex={isLegal ? 0 : undefined}
      onKeyDown={e => e.key === "Enter" && isLegal && onClick()}
    >
      {isLegal && (
        <circle
          cx={x}
          cy={y}
          r={17}
          fill="rgba(255,255,255,0.35)"
          className="animate-pulse"
        />
      )}
      <circle
        className="token-svg"
        cx={x}
        cy={y}
        r={13}
        fill={color}
        stroke="white"
        strokeWidth={2.5}
        style={{
          filter: isLegal
            ? `drop-shadow(0 0 6px ${color})`
            : "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
        }}
      />
      <text
        x={x}
        y={y + 5}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
        fill="white"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {token.index + 1}
      </text>
    </g>
  );
}

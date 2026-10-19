/**
 * State-diffing animation detector.
 * Compares the previous and next GameState to identify what happened,
 * producing a queue of AnimationEvents to play.
 *
 * The server sends only full snapshots — no capture/move events —
 * so we infer everything from token position/status changes.
 */

import type { GameState, PlayerColor, Token, LegalMove } from "@ludo/game-engine";
import { tokenScreenPos, COLOR_ENTRY, HOME_LANE_ENTRY, HOME_LANE_LENGTH, TRACK_GRID, HOME_LANE_GRID, BASE_GRID, CELL, TOKENS_PER_PLAYER } from "@ludo/game-engine";
import type { AnimationEvent, Vec2 } from "./types";

let eventCounter = 0;
function eid(): string {
  return `anim_${++eventCounter}_${Date.now()}`;
}

function tokenPos(t: Token): Vec2 {
  return tokenScreenPos(t);
}

function baseSlotPos(color: PlayerColor, index: number): Vec2 {
  const slots = BASE_GRID[color];
  const [col, row] = slots[index] ?? slots[0];
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

function finishedSlotPos(color: PlayerColor, index: number): Vec2 {
  const lane = HOME_LANE_GRID[color];
  const [col, row] = lane[HOME_LANE_LENGTH - 1];
  const base = { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
  const offsets = [
    { x: -8, y: -8 }, { x: 8, y: -8 }, { x: -8, y: 8 }, { x: 8, y: 8 },
  ];
  const off = offsets[index] ?? { x: 0, y: 0 };
  return { x: base.x + off.x, y: base.y + off.y };
}

function trackCellPos(trackPos: number): Vec2 {
  const [col, row] = TRACK_GRID[trackPos] ?? TRACK_GRID[0];
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

function homeLanePos(color: PlayerColor, laneIdx: number): Vec2 {
  const [col, row] = HOME_LANE_GRID[color][laneIdx] ?? HOME_LANE_GRID[color][0];
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

/**
 * Build the hop path between two track positions (inclusive of endpoints).
 * For a normal move of N steps, returns intermediate cells.
 */
function buildTrackPath(color: PlayerColor, fromPos: number, toPos: number): Vec2[] {
  const entry = COLOR_ENTRY[color];
  const path: Vec2[] = [];
  // Normalize: walk forward from entry
  let cur = fromPos;
  const steps = ((toPos - fromPos + 52) % 52) || 52;
  for (let i = 0; i <= steps && i < 52; i++) {
    path.push(trackCellPos(cur));
    cur = (cur + 1) % 52;
  }
  // Ensure last is destination
  if (path.length > 0) {
    path[path.length - 1] = trackCellPos(toPos);
  }
  return path;
}

/**
 * Diff two consecutive game states and produce animation events.
 * Returns events in the order they should play.
 */
export function detectAnimations(
  prev: GameState,
  next: GameState,
  myPlayerId: string | null
): AnimationEvent[] {
  const events: AnimationEvent[] = [];

  // Build token maps
  const prevTokens = new Map<string, { token: Token; playerColor: PlayerColor; playerName: string }>();
  const nextTokens = new Map<string, { token: Token; playerColor: PlayerColor; playerName: string }>();

  for (const p of prev.players) {
    for (const t of p.tokens) {
      prevTokens.set(t.id, { token: t, playerColor: p.color, playerName: p.name });
    }
  }
  for (const p of next.players) {
    for (const t of p.tokens) {
      nextTokens.set(t.id, { token: t, playerColor: p.color, playerName: p.name });
    }
  }

  // Also index prev legalMoves so we can detect captures with context
  const prevLegalByToken = new Map<string, LegalMove>();
  for (const m of prev.legalMoves) {
    prevLegalByToken.set(m.tokenId, m);
  }

  // --- 1. Detect dice roll ---
  if (
    prev.dice.value !== next.dice.value ||
    prev.dice.rolledAt !== next.dice.rolledAt
  ) {
    if (next.dice.value !== null) {
      const isSix = next.dice.value === 6;
      const isExtraTurn = isSix || next.dice.rollCount > 1;
      events.push({
        id: eid(),
        type: "dice_roll",
        value: next.dice.value,
        isSix,
        isExtraTurn: isSix && next.dice.rollCount >= 1,
      });
    }
  }

  // --- 2. Detect token changes ---
  const capturedIds = new Set<string>();
  const movedTokens: Array<{
    tokenId: string;
    prevToken: Token;
    nextToken: Token;
    color: PlayerColor;
  }> = [];

  for (const [tokenId, prevEntry] of prevTokens) {
    const nextEntry = nextTokens.get(tokenId);
    if (!nextEntry) continue;
    const pt = prevEntry.token;
    const nt = nextEntry.token;
    if (pt.status === nt.status && pt.trackPos === nt.trackPos) continue;

    // Token changed position/status
    movedTokens.push({ tokenId, prevToken: pt, nextToken: nt, color: nt.color });

    // Capture detection: token went from track/home_lane to base
    if (
      (pt.status === "track" || pt.status === "home_lane") &&
      nt.status === "base"
    ) {
      capturedIds.add(tokenId);
    }
  }

  // --- 3. For each moved token, classify the move ---
  for (const { tokenId, prevToken, nextToken, color } of movedTokens) {
    // Skip captured tokens — handled via capture events
    if (capturedIds.has(tokenId)) continue;

    const fromPos = tokenPos(prevToken);
    const toPos = tokenPos(nextToken);

    // Left base → track (token entry)
    if (prevToken.status === "base" && nextToken.status === "track") {
      events.push({
        id: eid(),
        type: "token_enter_board",
        tokenId,
        color,
        from: baseSlotPos(color, nextToken.index),
        to: toPos,
      });
      continue;
    }

    // track → home_lane (entered home column)
    if (prevToken.status === "track" && nextToken.status === "home_lane") {
      events.push({
        id: eid(),
        type: "token_enter_home_lane",
        tokenId,
        color,
        from: fromPos,
        to: toPos,
      });
      continue;
    }

    // home_lane → finished
    if (prevToken.status === "home_lane" && nextToken.status === "finished") {
      const finishedCount = nextTokens.size > 0
        ? countFinished(next, color)
        : 1;
      events.push({
        id: eid(),
        type: "token_finished",
        tokenId,
        color,
        finishedCount,
        pos: finishedSlotPos(color, nextToken.index),
      });

      // All four home?
      if (finishedCount >= TOKENS_PER_PLAYER) {
        events.push({
          id: eid(),
          type: "all_tokens_home",
          color,
          pos: toPos,
        });
      }
      continue;
    }

    // track → track (normal movement)
    if (prevToken.status === "track" && nextToken.status === "track") {
      const path = buildTrackPath(color, prevToken.trackPos, nextToken.trackPos);
      events.push({
        id: eid(),
        type: "token_move",
        tokenId,
        color,
        from: fromPos,
        to: toPos,
        path,
      });
      continue;
    }

    // home_lane → home_lane (within home column)
    if (prevToken.status === "home_lane" && nextToken.status === "home_lane") {
      events.push({
        id: eid(),
        type: "token_move",
        tokenId,
        color,
        from: fromPos,
        to: toPos,
        path: [fromPos, toPos],
      });
      continue;
    }
  }

  // --- 4. Detect captures (tokens sent back to base) ---
  for (const capturedId of capturedIds) {
    const prevEntry = prevTokens.get(capturedId)!;
    const nextEntry = nextTokens.get(capturedId)!;
    const capturedColor = prevEntry.playerColor;
    const capturePos = tokenPos(prevEntry.token); // where it was captured
    const homePos = baseSlotPos(capturedColor, nextEntry.token.index);

    // Find the capturer: the token that moved TO this square
    let capturerTokenId = "";
    let capturerColor: PlayerColor = capturedColor;
    for (const { tokenId, nextToken, color } of movedTokens) {
      if (tokenId === capturedId) continue;
      if (nextToken.status === "track" && nextToken.trackPos === prevEntry.token.trackPos) {
        capturerTokenId = tokenId;
        capturerColor = color;
        break;
      }
    }

    // Fallback: use active player
    if (!capturerTokenId) {
      const active = next.players[next.activePlayerIndex];
      if (active) {
        capturerColor = active.color;
        capturerTokenId = active.tokens.find(t => t.status === "track")?.id ?? "";
      }
    }

    events.push({
      id: eid(),
      type: "token_capture",
      capturedTokenId: capturedId,
      capturedColor,
      capturerTokenId,
      capturerColor,
      capturePos,
      capturedHomePos: homePos,
    });
  }

  // --- 5. Winner ---
  if (prev.phase !== "finished" && next.phase === "finished" && next.winner) {
    const isMe = next.players.some(p => p.color === next.winner && p.id === myPlayerId);
    events.push({
      id: eid(),
      type: "winner",
      color: next.winner,
      isMe,
    });
  }

  return events;
}

function countFinished(state: GameState, color: PlayerColor): number {
  const player = state.players.find(p => p.color === color);
  if (!player) return 0;
  return player.tokens.filter(t => t.status === "finished").length;
}

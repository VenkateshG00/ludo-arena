/**
 * Pure, deterministic Ludo rules engine.
 * No side effects, no I/O, no framework dependencies.
 */

import type {
  GameState,
  Player,
  Token,
  TokenStatus,
  LegalMove,
  PlayerColor,
  RoomConfig,
} from "./types";
import {
  COLORS,
  TOTAL_TRACK_SQUARES,
  HOME_LANE_LENGTH,
  COLOR_ENTRY,
  HOME_LANE_ENTRY,
  SAFE_SQUARES,
  TOKENS_PER_PLAYER,
  DEFAULT_CONFIG,
} from "./constants";

// ── State initialisation ─────────────────────────────────────────────────────

export function createInitialState(
  roomId: string,
  players: Array<{ id: string; name: string; seatIndex: number }>,
  config: Partial<RoomConfig> = {}
): GameState {
  const resolvedConfig: RoomConfig = { ...DEFAULT_CONFIG, ...config, playerCount: players.length as 2 | 3 | 4 };
  const activePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    seatIndex: p.seatIndex,
    color: COLORS[p.seatIndex] as PlayerColor,
    connected: true,
    tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, idx) => ({
      id: `${COLORS[p.seatIndex]}_${idx}`,
      color: COLORS[p.seatIndex] as PlayerColor,
      index: idx,
      status: "base" as TokenStatus,
      trackPos: -1,
    })),
  }));

  return {
    roomId,
    phase: "playing",
    players: activePlayers,
    activePlayerIndex: 0,
    dice: { value: null, rolledAt: null, rollCount: 0, used: false },
    legalMoves: [],
    turnNumber: 1,
    winner: null,
    config: resolvedConfig,
    actionSeq: 0,
  };
}

// ── Dice ─────────────────────────────────────────────────────────────────────

/** Roll returns a new state — dice value is injected externally (server-generated) */
export function applyRoll(state: GameState, value: number, seq: number): GameState {
  if (state.phase !== "playing") return rejectState(state);
  if (state.dice.value !== null && !state.dice.used) return rejectState(state);
  if (value < 1 || value > 6) return rejectState(state);

  const rollCount = value === 6 ? state.dice.rollCount + 1 : 0;

  // Three consecutive sixes
  if (rollCount >= 3) {
    const rule = state.config.threeConsecSixes;
    if (rule === "nullify") {
      // Lose the turn, nullify all sixes
      return advanceTurn({ ...state, dice: { value: null, rolledAt: null, rollCount: 0, used: true }, legalMoves: [], actionSeq: seq });
    }
    // "skip" — count as no move, advance turn
    return advanceTurn({ ...state, dice: { value: null, rolledAt: null, rollCount: 0, used: true }, legalMoves: [], actionSeq: seq });
  }

  const newDice = { value, rolledAt: Date.now(), rollCount, used: false };
  const moves = computeLegalMoves(state.players[state.activePlayerIndex], state.players, value);

  // No legal moves: auto-advance turn (unless it's a 6, which grants re-roll)
  if (moves.length === 0 && value !== 6) {
    return advanceTurn({ ...state, dice: { ...newDice, used: true }, legalMoves: [], actionSeq: seq });
  }

  return { ...state, dice: newDice, legalMoves: moves, actionSeq: seq };
}

// ── Legal move computation ───────────────────────────────────────────────────

export function computeLegalMoves(
  activePlayer: Player,
  allPlayers: Player[],
  diceValue: number
): LegalMove[] {
  const moves: LegalMove[] = [];

  for (const token of activePlayer.tokens) {
    const move = computeTokenMove(token, activePlayer.color, allPlayers, diceValue);
    if (move) moves.push(move);
  }

  return moves;
}

function computeTokenMove(
  token: Token,
  color: PlayerColor,
  allPlayers: Player[],
  diceValue: number
): LegalMove | null {
  if (token.status === "finished") return null;

  if (token.status === "base") {
    if (diceValue !== 6) return null;
    // Check if entry square is blocked by own token (blockRule)
    const entryOccupants = getOccupantsAt(allPlayers, "track", 0);
    const ownBlock = entryOccupants.filter(t => t.color === color);
    // Entry is always allowed (own token simply stacks — no block rule for entry)
    const captures = entryOccupants
      .filter(t => t.color !== color && !SAFE_SQUARES.has(0))
      .map(t => t.id);
    return {
      tokenId: token.id,
      fromStatus: "base",
      fromPos: -1,
      toStatus: "track",
      toPos: 0,
      captures,
    };
  }

  if (token.status === "track") {
    const remaining = stepsToHomeLane(token.trackPos, color);

    if (diceValue <= remaining) {
      // Still on track or entering home lane
      const newTrackPos = token.trackPos + diceValue;
      if (newTrackPos === remaining && remaining < HOME_LANE_LENGTH) {
        // Enter home lane
        const homeLanePos = newTrackPos - remaining; // always 0
        return {
          tokenId: token.id,
          fromStatus: "track",
          fromPos: token.trackPos,
          toStatus: "home_lane",
          toPos: 0,
          captures: [],
        };
      }

      // Steps until home lane entry
      const stepsUntilEntry = stepsToHomeLane(token.trackPos, color);
      if (diceValue > stepsUntilEntry) return null; // overshoot

      const absNewPos = (token.trackPos + diceValue) % TOTAL_TRACK_SQUARES;

      // Would pass home-lane entry?
      if (wouldPassHomeEntry(token.trackPos, diceValue, color)) {
        const homeLanePos = diceValue - stepsUntilEntry - 1;
        if (homeLanePos < HOME_LANE_LENGTH) {
          const captures: string[] = [];
          return {
            tokenId: token.id,
            fromStatus: "track",
            fromPos: token.trackPos,
            toStatus: "home_lane",
            toPos: homeLanePos,
            captures,
          };
        }
        return null;
      }

      const dest = (token.trackPos + diceValue) % TOTAL_TRACK_SQUARES;
      const isSafe = SAFE_SQUARES.has(dest);
      const occupants = getOccupantsAt(allPlayers, "track", dest);
      const ownBlock = occupants.filter(t => t.color === color);

      // Blocked by 2+ own tokens (block rule)
      if (ownBlock.length >= 2) return null;

      const captures = isSafe
        ? []
        : occupants.filter(t => t.color !== color).map(t => t.id);

      return {
        tokenId: token.id,
        fromStatus: "track",
        fromPos: token.trackPos,
        toStatus: "track",
        toPos: dest,
        captures,
      };
    }
    return null;
  }

  if (token.status === "home_lane") {
    const newPos = token.trackPos + diceValue;
    if (newPos === HOME_LANE_LENGTH - 1) {
      // Exact finish
      return {
        tokenId: token.id,
        fromStatus: "home_lane",
        fromPos: token.trackPos,
        toStatus: "finished",
        toPos: -1,
        captures: [],
      };
    }
    if (newPos < HOME_LANE_LENGTH - 1) {
      return {
        tokenId: token.id,
        fromStatus: "home_lane",
        fromPos: token.trackPos,
        toStatus: "home_lane",
        toPos: newPos,
        captures: [],
      };
    }
    return null; // overshoot
  }

  return null;
}

// How many more track steps until reaching home-lane entry
function stepsToHomeLane(trackPos: number, color: PlayerColor): number {
  const entry = HOME_LANE_ENTRY[color];
  if (trackPos <= entry) return entry - trackPos;
  return TOTAL_TRACK_SQUARES - trackPos + entry;
}

function wouldPassHomeEntry(trackPos: number, steps: number, color: PlayerColor): boolean {
  const entry = HOME_LANE_ENTRY[color];
  let pos = trackPos;
  for (let i = 0; i < steps; i++) {
    pos = (pos + 1) % TOTAL_TRACK_SQUARES;
    if (pos === (entry + 1) % TOTAL_TRACK_SQUARES) return true;
  }
  return false;
}

function getOccupantsAt(
  allPlayers: Player[],
  status: TokenStatus,
  pos: number
): Token[] {
  const result: Token[] = [];
  for (const p of allPlayers) {
    for (const t of p.tokens) {
      if (t.status === status && t.trackPos === pos) result.push(t);
    }
  }
  return result;
}

// ── Apply move ───────────────────────────────────────────────────────────────

export function applyMove(state: GameState, tokenId: string, seq: number): GameState {
  if (state.phase !== "playing") return rejectState(state);
  if (state.dice.value === null || state.dice.used) return rejectState(state);

  const move = state.legalMoves.find(m => m.tokenId === tokenId);
  if (!move) return rejectState(state);

  const activePlayer = state.players[state.activePlayerIndex];

  // Update tokens
  let nextPlayers = state.players.map(p => {
    if (p.color === activePlayer.color) {
      return {
        ...p,
        tokens: p.tokens.map(t => {
          if (t.id === tokenId) {
            return { ...t, status: move.toStatus, trackPos: move.toPos };
          }
          return t;
        }),
      };
    }
    // Send captured tokens to base
    if (move.captures.some(cid => p.tokens.some(t => t.id === cid))) {
      return {
        ...p,
        tokens: p.tokens.map(t =>
          move.captures.includes(t.id)
            ? { ...t, status: "base" as TokenStatus, trackPos: -1 }
            : t
        ),
      };
    }
    return p;
  });

  const didCapture = move.captures.length > 0;
  const didFinish = move.toStatus === "finished";

  // Check win
  const updatedActive = nextPlayers[state.activePlayerIndex];
  const allFinished = updatedActive.tokens.every(t => t.status === "finished");

  if (allFinished) {
    return {
      ...state,
      players: nextPlayers,
      phase: "finished",
      winner: activePlayer.color,
      dice: { ...state.dice, used: true },
      legalMoves: [],
      actionSeq: seq,
    };
  }

  // Extra roll conditions: rolled a 6, captured, or finished a token
  const grantExtraRoll =
    state.dice.value === 6 ||
    (didCapture && state.config.captureBonus) ||
    didFinish;

  if (grantExtraRoll) {
    return {
      ...state,
      players: nextPlayers,
      dice: { value: null, rolledAt: null, rollCount: state.dice.rollCount, used: false },
      legalMoves: [],
      actionSeq: seq,
    };
  }

  return advanceTurn({
    ...state,
    players: nextPlayers,
    dice: { ...state.dice, used: true },
    legalMoves: [],
    actionSeq: seq,
  });
}

// ── Turn advancement ─────────────────────────────────────────────────────────

export function advanceTurn(state: GameState): GameState {
  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  return {
    ...state,
    activePlayerIndex: nextIndex,
    dice: { value: null, rolledAt: null, rollCount: 0, used: false },
    legalMoves: [],
    turnNumber: state.turnNumber + 1,
  };
}

// ── Victory check ────────────────────────────────────────────────────────────

export function checkWin(state: GameState): PlayerColor | null {
  for (const p of state.players) {
    if (p.tokens.every(t => t.status === "finished")) return p.color;
  }
  return null;
}

// ── Roll eligibility ─────────────────────────────────────────────────────────

export function canRoll(state: GameState, playerId: string): boolean {
  if (state.phase !== "playing") return false;
  const active = state.players[state.activePlayerIndex];
  if (active.id !== playerId) return false;
  return state.dice.value === null || state.dice.used;
}

export function canMove(state: GameState, playerId: string): boolean {
  if (state.phase !== "playing") return false;
  const active = state.players[state.activePlayerIndex];
  if (active.id !== playerId) return false;
  return state.dice.value !== null && !state.dice.used && state.legalMoves.length > 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rejectState(state: GameState): GameState {
  return state; // caller handles rejection; state unchanged
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.activePlayerIndex];
}

export function getPlayerById(state: GameState, id: string): Player | undefined {
  return state.players.find(p => p.id === id);
}

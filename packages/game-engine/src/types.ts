// ── Core domain types ─────────────────────────────────────────────────────────

export type PlayerColor = "red" | "green" | "yellow" | "blue";

export type TokenStatus = "base" | "track" | "home_lane" | "finished";

export type GamePhase =
  | "waiting"      // Room open, not all players ready
  | "starting"     // All ready, countdown
  | "playing"      // Active match
  | "finished";    // Someone won

export interface Token {
  id: string;          // e.g. "red_0"
  color: PlayerColor;
  index: number;       // 0-3
  status: TokenStatus;
  trackPos: number;    // 0-55 for track, 0-5 for home_lane, -1 for base/finished
}

export interface Player {
  id: string;          // server-assigned session id
  color: PlayerColor;
  seatIndex: number;   // 0-3
  name: string;
  connected: boolean;
  tokens: Token[];
}

export interface DiceState {
  value: number | null; // 1-6 or null (not rolled yet)
  rolledAt: number | null;
  rollCount: number;    // consecutive sixes this turn
  used: boolean;
}

export interface LegalMove {
  tokenId: string;
  fromStatus: TokenStatus;
  fromPos: number;
  toStatus: TokenStatus;
  toPos: number;
  captures: string[]; // token ids that get sent home
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  activePlayerIndex: number;
  dice: DiceState;
  legalMoves: LegalMove[];
  turnNumber: number;
  winner: PlayerColor | null;
  config: RoomConfig;
  actionSeq: number; // monotonic action sequence for idempotency
}

export interface RoomConfig {
  playerCount: 2 | 3 | 4;
  blockRule: boolean;       // stacked same-color tokens form a block
  captureBonus: boolean;    // extra roll on capture
  threeConsecSixes: "skip" | "nullify"; // skip turn or lose all sixes
}

// ── Socket event payloads ─────────────────────────────────────────────────────

// Client → Server
export interface CreateRoomPayload {
  playerName: string;
  config?: Partial<RoomConfig>;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface LeaveRoomPayload { roomId: string }

export interface SetReadyPayload { roomId: string; ready: boolean }

export interface StartGamePayload { roomId: string }

export interface RollDicePayload { roomId: string; actionSeq: number }

export interface MoveTokenPayload {
  roomId: string;
  tokenId: string;
  actionSeq: number;
}

export interface RequestStatePayload { roomId: string }

export interface RematchPayload { roomId: string }

// Server → Client
export interface RoomCreatedPayload {
  roomId: string;
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

export interface RoomUpdatedPayload {
  roomId: string;
  roomCode: string;
  players: Array<{ id: string; name: string; color: PlayerColor; seatIndex: number; connected: boolean; ready: boolean }>;
  phase: GamePhase;
  hostId: string;
}

export interface GameStartedPayload {
  state: GameState;
}

export interface DiceRolledPayload {
  state: GameState;
}

export interface MoveAppliedPayload {
  state: GameState;
}

export interface TurnChangedPayload {
  state: GameState;
}

export interface GameFinishedPayload {
  state: GameState;
  winner: PlayerColor;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  playerName: string;
  gracePeriodMs: number;
}

export interface PlayerReconnectedPayload {
  playerId: string;
  playerName: string;
}

export interface ActionRejectedPayload {
  reason: string;
  code: string;
}

export interface StateSnapshotPayload {
  state: GameState;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

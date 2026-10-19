/**
 * Client-side game store. Mirrors authoritative server state.
 * Never mutates state optimistically — waits for server confirmation.
 */

import type { GameState, PlayerColor, GamePhase } from "@ludo/game-engine";
import type { RoomPlayer } from "./types";

export type GamePhaseUI =
  | "idle"
  | "connecting"
  | "lobby"
  | "playing"
  | "finished"
  | "error";

export interface RoomInfo {
  roomId: string;
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: RoomPlayer[];
}

export interface ClientState {
  phase: GamePhaseUI;
  roomInfo: RoomInfo | null;
  game: GameState | null;
  myPlayerId: string | null;
  myReconnectToken: string | null;
  error: string | null;
  wsConnected: boolean;
  disconnectedPlayers: Set<string>;
  winner: PlayerColor | null;
  lastRejection: string | null;
}

export const initialClientState: ClientState = {
  phase: "idle",
  roomInfo: null,
  game: null,
  myPlayerId: null,
  myReconnectToken: null,
  error: null,
  wsConnected: false,
  disconnectedPlayers: new Set(),
  winner: null,
  lastRejection: null,
};

export type Action =
  | { type: "SET_CONNECTING" }
  | { type: "SET_WS_CONNECTED" }
  | { type: "SET_CREDENTIALS"; playerId: string; reconnectToken: string }
  | { type: "ROOM_UPDATED"; roomInfo: RoomInfo; phase?: GamePhase }
  | { type: "GAME_STARTED"; game: GameState }
  | { type: "GAME_STATE"; game: GameState }
  | { type: "GAME_FINISHED"; game: GameState; winner: PlayerColor }
  | { type: "PLAYER_DISCONNECTED"; playerId: string }
  | { type: "PLAYER_RECONNECTED"; playerId: string }
  | { type: "ACTION_REJECTED"; reason: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };

export function clientReducer(state: ClientState, action: Action): ClientState {
  switch (action.type) {
    case "SET_CONNECTING":
      return { ...state, phase: "connecting", error: null };

    case "SET_WS_CONNECTED":
      return { ...state, wsConnected: true };

    case "SET_CREDENTIALS":
      return { ...state, myPlayerId: action.playerId, myReconnectToken: action.reconnectToken };

    case "ROOM_UPDATED": {
      // Use server-provided phase; map engine-only phases to UI phases.
      // "waiting"/"starting" both mean lobby from the client's perspective.
      let nextPhase: GamePhaseUI;
      if (action.phase === "playing" || action.phase === "finished") {
        nextPhase = action.phase;
      } else if (action.phase) {
        // "lobby", "waiting", or "starting" → lobby
        nextPhase = "lobby";
      } else {
        // No phase provided — only flip to lobby if not already in a game
        nextPhase =
          action.roomInfo.players.length > 0 &&
          state.phase !== "playing" &&
          state.phase !== "finished"
            ? "lobby"
            : state.phase;
      }
      return {
        ...state,
        roomInfo: action.roomInfo,
        phase: nextPhase,
      };
    }

    case "GAME_STARTED":
      return { ...state, game: action.game, phase: "playing", disconnectedPlayers: new Set() };

    case "GAME_STATE":
      return { ...state, game: action.game };

    case "GAME_FINISHED":
      return { ...state, game: action.game, winner: action.winner, phase: "finished" };

    case "PLAYER_DISCONNECTED": {
      const dp = new Set(state.disconnectedPlayers);
      dp.add(action.playerId);
      return { ...state, disconnectedPlayers: dp };
    }

    case "PLAYER_RECONNECTED": {
      const dp = new Set(state.disconnectedPlayers);
      dp.delete(action.playerId);
      return { ...state, disconnectedPlayers: dp };
    }

    case "ACTION_REJECTED":
      return { ...state, lastRejection: action.reason };

    case "SET_ERROR":
      return { ...state, error: action.error, phase: "error" };

    case "RESET":
      return { ...initialClientState };

    default:
      return state;
  }
}

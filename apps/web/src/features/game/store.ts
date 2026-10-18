/**
 * Client-side game store. Mirrors authoritative server state.
 * Never mutates state optimistically — waits for server confirmation.
 */

import type { GameState, PlayerColor } from "@ludo/game-engine";
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
  | { type: "ROOM_UPDATED"; roomInfo: RoomInfo }
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

    case "ROOM_UPDATED":
      return {
        ...state,
        roomInfo: action.roomInfo,
        phase: action.roomInfo.players.length > 0 ? "lobby" : state.phase,
      };

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

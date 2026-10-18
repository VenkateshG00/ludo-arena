/**
 * WebSocket client service.
 * Wraps the native browser WebSocket with typed send/receive and reconnect logic.
 */

import type {
  GameState,
  PlayerColor,
  RoomUpdatedPayload,
} from "@ludo/game-engine";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";
const WS_URL = SERVER_URL.replace(/^http/, "ws");

// ── Outbound (client → server) ────────────────────────────────────────────────

export type ClientMsg =
  | { type: "set_ready"; ready: boolean }
  | { type: "start_game" }
  | { type: "roll_dice"; actionSeq: number }
  | { type: "move_token"; tokenId: string; actionSeq: number }
  | { type: "request_state" }
  | { type: "rematch" }
  | { type: "leave_room" };

// ── Inbound (server → client) ─────────────────────────────────────────────────

export type ServerMsg =
  | { type: "room_updated" } & RoomUpdatedPayload
  | { type: "game_started"; state: GameState }
  | { type: "dice_rolled"; state: GameState }
  | { type: "move_applied"; state: GameState }
  | { type: "turn_changed"; state: GameState }
  | { type: "game_finished"; state: GameState; winner: PlayerColor }
  | { type: "player_disconnected"; playerId: string; playerName: string; gracePeriodMs: number }
  | { type: "player_reconnected"; playerId: string; playerName: string }
  | { type: "action_rejected"; reason: string; code: string }
  | { type: "state_snapshot"; state: GameState };

export type ServerMsgHandler = (msg: ServerMsg) => void;

// ── REST helpers ──────────────────────────────────────────────────────────────

export async function apiCreateRoom(
  playerName: string
): Promise<{ roomId: string; roomCode: string; playerId: string; reconnectToken: string }> {
  const res = await fetch(`${SERVER_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) {
    const err = await res.json() as { error: string; message?: string };
    throw new Error(err.message ?? err.error);
  }
  return res.json() as Promise<{ roomId: string; roomCode: string; playerId: string; reconnectToken: string }>;
}

export async function apiJoinRoom(
  roomCode: string,
  playerName: string
): Promise<{ roomId: string; roomCode: string; playerId: string; reconnectToken: string }> {
  const res = await fetch(`${SERVER_URL}/api/rooms/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode, playerName }),
  });
  if (!res.ok) {
    const err = await res.json() as { error: string; message?: string };
    throw new Error(err.message ?? err.error);
  }
  return res.json() as Promise<{ roomId: string; roomCode: string; playerId: string; reconnectToken: string }>;
}

// ── WebSocket connection ───────────────────────────────────────────────────────

export class GameSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<ServerMsgHandler>();
  private roomCode: string;
  private playerId: string;
  private reconnectToken: string;
  private actionSeq = 0;
  private closed = false;

  constructor(roomCode: string, playerId: string, reconnectToken: string) {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.reconnectToken = reconnectToken;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_URL}/ws/${this.roomCode}?playerId=${encodeURIComponent(this.playerId)}&reconnectToken=${encodeURIComponent(this.reconnectToken)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error("WebSocket connection failed"));
      this.ws.onclose = (e) => {
        if (!this.closed && e.code !== 1000) {
          setTimeout(() => this.reconnect(), 2000);
        }
      };
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as ServerMsg;
          for (const h of this.handlers) h(msg);
        } catch { /* ignore parse errors */ }
      };
    });
  }

  private reconnect() {
    this.connect().catch(() => {
      setTimeout(() => this.reconnect(), 3000);
    });
  }

  on(handler: ServerMsgHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  nextSeq(): number {
    return ++this.actionSeq;
  }

  disconnect() {
    this.closed = true;
    this.ws?.close(1000, "Left room");
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

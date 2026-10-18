/**
 * RoomDO — Cloudflare Durable Object managing one Ludo room.
 * Each room lives in its own isolated instance with:
 *  - WebSocket connections from 2-4 players
 *  - Authoritative game state
 *  - Reconnect grace period handling
 */

import {
  createInitialState,
  applyRoll,
  applyMove,
  type GameState,
  type PlayerColor,
  type RoomConfig,
  COLORS,
  RECONNECT_GRACE_MS,
  ROOM_EXPIRE_IDLE_MS,
} from "@ludo/game-engine";
import { saveMatch } from "./db";

// ── Types internal to the DO ─────────────────────────────────────────────────

interface Seat {
  playerId: string;
  name: string;
  color: PlayerColor;
  seatIndex: number;
  reconnectToken: string;
  ready: boolean;
  connected: boolean;
  disconnectedAt: number | null;
}

interface RoomMeta {
  roomId: string;
  roomCode: string;
  hostId: string;
  phase: "lobby" | "playing" | "finished";
  config: RoomConfig;
  createdAt: number;
  lastActivityAt: number;
  gameStartedAt: number | null;
}

// Per-socket metadata (stored in WebSocket state via CF hibernation API)
interface SocketMeta {
  playerId: string;
  roomId: string;
}

type Msg =
  | { type: "join_room"; playerName: string; reconnectToken?: string }
  | { type: "leave_room" }
  | { type: "set_ready"; ready: boolean }
  | { type: "start_game" }
  | { type: "roll_dice"; actionSeq: number }
  | { type: "move_token"; tokenId: string; actionSeq: number }
  | { type: "request_state" }
  | { type: "rematch" };

const DEFAULT_CONFIG: RoomConfig = {
  playerCount: 4,
  blockRule: false,
  captureBonus: false,
  threeConsecSixes: "skip",
};

export class RoomDO {
  private state: DurableObjectState;
  private env: Env;

  // In-memory (lost on hibernation wake; re-hydrated from storage)
  private seats: Map<string, Seat> = new Map(); // playerId → Seat
  private gameState: GameState | null = null;
  private meta: RoomMeta | null = null;
  // actionSeq dedup
  private lastActionSeq: Map<string, number> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  // ── HTTP entry ──────────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/ws")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      await this.hydrate();
      return this.handleWebSocket(request, url);
    }

    if (url.pathname === "/create" && request.method === "POST") {
      return this.handleCreate(request);
    }

    if (url.pathname === "/join" && request.method === "POST") {
      await this.hydrate();
      return this.handleJoin(request);
    }

    return new Response("Not found", { status: 404 });
  }

  // ── Join room (new player joining an existing lobby) ─────────────────────────

  private async handleJoin(request: Request): Promise<Response> {
    const body = await request.json<{ playerName: string }>();
    if (!this.meta) return Response.json({ error: "room_not_found" }, { status: 404 });
    if (this.meta.phase !== "lobby") return Response.json({ error: "game_in_progress", message: "Game already started" }, { status: 409 });

    const takenSeats = new Set([...this.seats.values()].map(s => s.seatIndex));
    let seatIndex = -1;
    for (let i = 0; i < 4; i++) {
      if (!takenSeats.has(i)) { seatIndex = i; break; }
    }
    if (seatIndex === -1) return Response.json({ error: "room_full", message: "Room is full" }, { status: 409 });

    const playerId = crypto.randomUUID();
    const reconnectToken = generateToken();
    const seat: Seat = {
      playerId,
      name: body.playerName.slice(0, 20).trim(),
      color: COLORS[seatIndex] as PlayerColor,
      seatIndex,
      reconnectToken,
      ready: false,
      connected: false,
      disconnectedAt: null,
    };
    this.seats.set(playerId, seat);
    await this.persist();

    return Response.json({ playerId, reconnectToken, roomId: this.meta.roomId });
  }

  // ── Room creation (called once by the worker before WS upgrade) ──────────────

  private async handleCreate(request: Request): Promise<Response> {
    const body = await request.json<{ roomId: string; roomCode: string; hostPlayerName: string; config?: Partial<RoomConfig> }>();

    if (this.meta) return Response.json({ error: "already_created" }, { status: 400 });

    const hostId = crypto.randomUUID();
    const reconnectToken = generateToken();

    const meta: RoomMeta = {
      roomId: body.roomId,
      roomCode: body.roomCode,
      hostId,
      phase: "lobby",
      config: { ...DEFAULT_CONFIG, ...body.config },
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      gameStartedAt: null,
    };

    const hostSeat: Seat = {
      playerId: hostId,
      name: body.hostPlayerName,
      color: "red",
      seatIndex: 0,
      reconnectToken,
      ready: false,
      connected: false,
      disconnectedAt: null,
    };

    this.meta = meta;
    this.seats.set(hostId, hostSeat);
    await this.persist();

    return Response.json({ playerId: hostId, reconnectToken, roomCode: body.roomCode });
  }

  // ── WebSocket upgrade ────────────────────────────────────────────────────────

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const playerId = url.searchParams.get("playerId");
    const reconnectToken = url.searchParams.get("reconnectToken");

    if (!playerId || !reconnectToken) {
      return new Response("Missing credentials", { status: 400 });
    }

    if (!this.meta) {
      return new Response("Room not found", { status: 404 });
    }

    const seat = this.seats.get(playerId);
    if (!seat) {
      return new Response("Unknown player", { status: 403 });
    }
    if (seat.reconnectToken !== reconnectToken) {
      return new Response("Bad reconnect token", { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    this.state.acceptWebSocket(server, [playerId]);

    seat.connected = true;
    seat.disconnectedAt = null;
    this.meta.lastActivityAt = Date.now();

    const wasDisconnected = !seat.connected;
    await this.persist();

    if (wasDisconnected && this.gameState) {
      this.broadcast({ type: "player_reconnected", playerId, playerName: seat.name });
    }

    // Send current state to the reconnecting player
    this.sendTo(server, { type: "room_updated", ...this.roomSnapshot() });
    if (this.gameState) {
      this.sendTo(server, { type: "state_snapshot", state: this.gameState });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── WebSocket event handlers (CF hibernation API) ────────────────────────────

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const tags = this.state.getTags(ws);
    const playerId = tags[0];
    if (!playerId || !this.meta) return;

    await this.hydrate();

    let msg: Msg;
    try {
      msg = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
    } catch {
      this.sendTo(ws, { type: "action_rejected", reason: "Invalid JSON", code: "PARSE_ERROR" });
      return;
    }

    await this.handleMessage(ws, playerId, msg);
    this.meta.lastActivityAt = Date.now();
    await this.persist();
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    const tags = this.state.getTags(ws);
    const playerId = tags[0];
    if (!playerId || !this.meta) return;

    await this.hydrate();

    const seat = this.seats.get(playerId);
    if (!seat) return;

    seat.connected = false;
    seat.disconnectedAt = Date.now();

    await this.persist();

    if (this.gameState && this.meta.phase === "playing") {
      this.broadcast({
        type: "player_disconnected",
        playerId,
        playerName: seat.name,
        gracePeriodMs: RECONNECT_GRACE_MS,
      });

      // Schedule cleanup after grace period
      await this.state.storage.setAlarm(Date.now() + RECONNECT_GRACE_MS);
    } else if (this.meta.phase === "lobby") {
      // Remove from lobby
      this.seats.delete(playerId);
      await this.persist();
      this.broadcast({ type: "room_updated", ...this.roomSnapshot() });
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws, 1006);
  }

  async alarm(): Promise<void> {
    await this.hydrate();
    if (!this.meta) return;

    // Check for disconnected players past grace period
    for (const [id, seat] of this.seats) {
      if (!seat.connected && seat.disconnectedAt) {
        if (Date.now() - seat.disconnectedAt > RECONNECT_GRACE_MS) {
          // Mark as permanently left — game pauses (first release policy)
          this.broadcast({
            type: "action_rejected",
            reason: `${seat.name} left the game`,
            code: "PLAYER_ABANDONED",
          });
        }
      }
    }

    // Expire idle rooms
    if (Date.now() - this.meta.lastActivityAt > ROOM_EXPIRE_IDLE_MS) {
      await this.state.storage.deleteAll();
    }

    await this.persist();
  }

  // ── Message dispatch ─────────────────────────────────────────────────────────

  private async handleMessage(ws: WebSocket, playerId: string, msg: Msg): Promise<void> {
    if (!this.meta) return;

    switch (msg.type) {
      case "set_ready":
        return this.handleSetReady(ws, playerId, msg.ready);
      case "start_game":
        return this.handleStartGame(ws, playerId);
      case "roll_dice":
        return this.handleRollDice(ws, playerId, msg.actionSeq);
      case "move_token":
        return this.handleMoveToken(ws, playerId, msg.tokenId, msg.actionSeq);
      case "request_state":
        return this.handleRequestState(ws, playerId);
      case "rematch":
        return this.handleRematch(ws, playerId);
      case "leave_room":
        return this.handleLeaveRoom(ws, playerId);
      default:
        this.sendTo(ws, { type: "action_rejected", reason: "Unknown action", code: "UNKNOWN_ACTION" });
    }
  }

  private handleSetReady(ws: WebSocket, playerId: string, ready: boolean): void {
    if (!this.meta || this.meta.phase !== "lobby") return;
    const seat = this.seats.get(playerId);
    if (!seat) return;
    seat.ready = ready;
    this.broadcast({ type: "room_updated", ...this.roomSnapshot() });
  }

  private handleStartGame(ws: WebSocket, playerId: string): void {
    if (!this.meta || this.meta.phase !== "lobby") {
      this.sendTo(ws, { type: "action_rejected", reason: "Not in lobby", code: "WRONG_PHASE" });
      return;
    }
    if (playerId !== this.meta.hostId) {
      this.sendTo(ws, { type: "action_rejected", reason: "Only host can start", code: "NOT_HOST" });
      return;
    }
    const connectedSeats = [...this.seats.values()].filter(s => s.connected);
    if (connectedSeats.length < 2) {
      this.sendTo(ws, { type: "action_rejected", reason: "Need at least 2 players", code: "NOT_ENOUGH_PLAYERS" });
      return;
    }
    if (!connectedSeats.every(s => s.ready)) {
      this.sendTo(ws, { type: "action_rejected", reason: "Not all players ready", code: "NOT_ALL_READY" });
      return;
    }

    const players = connectedSeats.map(s => ({ id: s.playerId, name: s.name, seatIndex: s.seatIndex }));
    this.gameState = createInitialState(this.meta.roomId, players, this.meta.config);
    this.meta.phase = "playing";
    this.meta.gameStartedAt = Date.now();
    this.broadcast({ type: "game_started", state: this.gameState });
  }

  private handleRollDice(ws: WebSocket, playerId: string, actionSeq: number): void {
    if (!this.gameState || !this.meta || this.meta.phase !== "playing") {
      this.sendTo(ws, { type: "action_rejected", reason: "Game not active", code: "WRONG_PHASE" });
      return;
    }

    const active = this.gameState.players[this.gameState.activePlayerIndex];
    if (active.id !== playerId) {
      this.sendTo(ws, { type: "action_rejected", reason: "Not your turn", code: "WRONG_TURN" });
      return;
    }

    // Idempotency
    const lastSeq = this.lastActionSeq.get(playerId) ?? -1;
    if (actionSeq <= lastSeq) {
      this.sendTo(ws, { type: "state_snapshot", state: this.gameState });
      return;
    }
    this.lastActionSeq.set(playerId, actionSeq);

    if (this.gameState.dice.value !== null && !this.gameState.dice.used) {
      this.sendTo(ws, { type: "action_rejected", reason: "Already rolled", code: "ALREADY_ROLLED" });
      return;
    }

    // Server-generated cryptographically secure dice value
    const value = secureRollDice();
    const prev = this.gameState;
    this.gameState = applyRoll(this.gameState, value, actionSeq);

    if (this.gameState === prev) {
      this.sendTo(ws, { type: "action_rejected", reason: "Roll failed", code: "ROLL_FAILED" });
      return;
    }

    this.broadcast({ type: "dice_rolled", state: this.gameState });

    if (this.gameState.phase === "playing" && this.gameState.activePlayerIndex !== prev.activePlayerIndex) {
      this.broadcast({ type: "turn_changed", state: this.gameState });
    }
  }

  private handleMoveToken(ws: WebSocket, playerId: string, tokenId: string, actionSeq: number): void {
    if (!this.gameState || !this.meta || this.meta.phase !== "playing") {
      this.sendTo(ws, { type: "action_rejected", reason: "Game not active", code: "WRONG_PHASE" });
      return;
    }

    const active = this.gameState.players[this.gameState.activePlayerIndex];
    if (active.id !== playerId) {
      this.sendTo(ws, { type: "action_rejected", reason: "Not your turn", code: "WRONG_TURN" });
      return;
    }

    // Validate token ownership
    if (!tokenId.startsWith(active.color + "_")) {
      this.sendTo(ws, { type: "action_rejected", reason: "Not your token", code: "WRONG_TOKEN" });
      return;
    }

    const lastSeq = this.lastActionSeq.get(playerId) ?? -1;
    if (actionSeq <= lastSeq) {
      this.sendTo(ws, { type: "state_snapshot", state: this.gameState });
      return;
    }
    this.lastActionSeq.set(playerId, actionSeq);

    const prev = this.gameState;
    this.gameState = applyMove(this.gameState, tokenId, actionSeq);

    if (this.gameState === prev) {
      this.sendTo(ws, { type: "action_rejected", reason: "Illegal move", code: "ILLEGAL_MOVE" });
      return;
    }

    this.broadcast({ type: "move_applied", state: this.gameState });

    if (this.gameState.phase === "finished") {
      this.meta.phase = "finished";
      this.broadcast({ type: "game_finished", state: this.gameState, winner: this.gameState.winner! });
      // Persist match to D1 (fire-and-forget — don't block the WS response)
      this.persistMatchToD1(this.gameState).catch(() => { /* non-critical */ });
    } else if (this.gameState.activePlayerIndex !== prev.activePlayerIndex) {
      this.broadcast({ type: "turn_changed", state: this.gameState });
    }
  }

  private handleRequestState(ws: WebSocket, playerId: string): void {
    this.sendTo(ws, { type: "room_updated", ...this.roomSnapshot() });
    if (this.gameState) {
      this.sendTo(ws, { type: "state_snapshot", state: this.gameState });
    }
  }

  private handleRematch(ws: WebSocket, playerId: string): void {
    if (!this.meta || this.meta.phase !== "finished") return;
    // Reset to lobby
    for (const seat of this.seats.values()) {
      seat.ready = false;
    }
    this.gameState = null;
    this.meta.phase = "lobby";
    this.lastActionSeq.clear();
    this.broadcast({ type: "room_updated", ...this.roomSnapshot() });
  }

  private handleLeaveRoom(ws: WebSocket, playerId: string): void {
    if (!this.meta) return;
    this.seats.delete(playerId);
    ws.close(1000, "Left room");
    this.broadcast({ type: "room_updated", ...this.roomSnapshot() });
  }

  // ── D1 persistence ───────────────────────────────────────────────────────────

  private async persistMatchToD1(game: GameState): Promise<void> {
    if (!this.meta || !this.env.DB) return;
    const durationMs = this.meta.gameStartedAt
      ? Date.now() - this.meta.gameStartedAt
      : 0;

    await saveMatch(this.env.DB, {
      roomCode: this.meta.roomCode,
      winnerColor: game.winner!,
      turnCount: game.turnNumber,
      durationMs,
      players: game.players.map(p => ({
        name: p.name,
        color: p.color,
        seatIndex: p.seatIndex,
        isWinner: p.color === game.winner,
        tokensFinished: p.tokens.filter(t => t.status === "finished").length,
      })),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private broadcast(payload: object): void {
    const msg = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(msg); } catch { /* closed */ }
    }
  }

  private sendTo(ws: WebSocket, payload: object): void {
    try { ws.send(JSON.stringify(payload)); } catch { /* closed */ }
  }

  private roomSnapshot() {
    if (!this.meta) return {};
    return {
      roomId: this.meta.roomId,
      roomCode: this.meta.roomCode,
      hostId: this.meta.hostId,
      phase: this.meta.phase,
      players: [...this.seats.values()].map(s => ({
        id: s.playerId,
        name: s.name,
        color: s.color,
        seatIndex: s.seatIndex,
        connected: s.connected,
        ready: s.ready,
      })),
    };
  }

  private async hydrate(): Promise<void> {
    if (this.meta) return; // already loaded
    const [meta, seatsData, gsData] = await Promise.all([
      this.state.storage.get<RoomMeta>("meta"),
      this.state.storage.get<Seat[]>("seats"),
      this.state.storage.get<GameState>("gameState"),
    ]);
    if (meta) this.meta = meta;
    if (seatsData) {
      this.seats.clear();
      for (const s of seatsData) this.seats.set(s.playerId, s);
    }
    if (gsData) this.gameState = gsData;
  }

  private async persist(): Promise<void> {
    if (!this.meta) return;
    await Promise.all([
      this.state.storage.put("meta", this.meta),
      this.state.storage.put("seats", [...this.seats.values()]),
      this.gameState ? this.state.storage.put("gameState", this.gameState) : Promise.resolve(),
    ]);
  }
}

// ── Secure dice ──────────────────────────────────────────────────────────────

function secureRollDice(): number {
  // Rejection sampling for unbiased 1-6
  const buf = new Uint8Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    const val = buf[0] % 6;
    if (buf[0] < 252) return val + 1; // 252 = 6*42, avoid bias
  }
}

function generateToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Env interface ─────────────────────────────────────────────────────────────

export interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

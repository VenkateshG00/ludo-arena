/**
 * Cloudflare Worker entry point.
 * Routes HTTP requests: room creation and WebSocket upgrades go to RoomDO.
 */

export { RoomDO } from "./room";
import type { Env } from "./room";
import { getRecentMatches, getPlayerStats, getLeaderboard, getAdminStats, getAllMatches, getAllPlayers } from "./db";

// Rate limit: track room creation per IP (simple in-memory, resets on worker restart)
const roomCreationCounts = new Map<string, { count: number; resetAt: number }>();
const ROOM_CREATE_LIMIT = 10; // per hour per IP
const ROOM_CODE_LENGTH = 6;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map(o => o.trim());
    const isAllowed = allowedOrigins.includes(origin) || origin === "";

    const corsHeaders: Record<string, string> = isAllowed
      ? {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
          "Access-Control-Allow-Credentials": "true",
        }
      : {};

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!isAllowed && origin !== "") {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ ok: true, ts: Date.now() }, { headers: corsHeaders });
    }

    // Create room
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      return handleCreateRoom(request, env, corsHeaders);
    }

    // Join room (returns playerId + reconnectToken for an existing room)
    if (url.pathname === "/api/rooms/join" && request.method === "POST") {
      return handleJoinRoom(request, env, corsHeaders);
    }

    // Recent matches
    if (url.pathname === "/api/matches" && request.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);
      const matches = await getRecentMatches(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, limit);
      return Response.json(matches, { headers: corsHeaders });
    }

    // Leaderboard
    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 50);
      const board = await getLeaderboard(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, limit);
      return Response.json(board, { headers: corsHeaders });
    }

    // Player stats
    if (url.pathname.startsWith("/api/players/") && request.method === "GET") {
      const playerName = decodeURIComponent(url.pathname.slice("/api/players/".length));
      if (!playerName) return Response.json({ error: "missing_name" }, { status: 400, headers: corsHeaders });
      const stats = await getPlayerStats(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, playerName);
      if (!stats) return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
      return Response.json(stats, { headers: corsHeaders });
    }

    // Admin endpoints
    if (url.pathname.startsWith("/api/admin/")) {
      const adminKey = request.headers.get("X-Admin-Key") ?? "";
      if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
        return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders });
      }

      if (url.pathname === "/api/admin/stats" && request.method === "GET") {
        try {
          const stats = await getAdminStats(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          return Response.json(stats, { headers: corsHeaders });
        } catch {
          return Response.json({ error: "db_error" }, { status: 500, headers: corsHeaders });
        }
      }

      if (url.pathname === "/api/admin/matches" && request.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
        try {
          const matches = await getAllMatches(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, limit);
          return Response.json(matches, { headers: corsHeaders });
        } catch {
          return Response.json({ error: "db_error" }, { status: 500, headers: corsHeaders });
        }
      }

      if (url.pathname === "/api/admin/players" && request.method === "GET") {
        try {
          const players = await getAllPlayers(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
          return Response.json(players, { headers: corsHeaders });
        } catch {
          return Response.json({ error: "db_error" }, { status: 500, headers: corsHeaders });
        }
      }
    }

    // WebSocket upgrade for a room
    const wsMatch = url.pathname.match(/^\/ws\/([A-Z0-9]{6})$/);
    if (wsMatch) {
      const roomCode = wsMatch[1];
      const doId = env.ROOM.idFromName(roomCode);
      const stub = env.ROOM.get(doId);
      // Forward to the DO — pass all query params (playerId, reconnectToken)
      const doUrl = new URL(request.url);
      doUrl.pathname = "/ws";
      return stub.fetch(new Request(doUrl.toString(), request));
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};

async function handleCreateRoom(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "rate_limited", message: "Too many rooms created" },
      { status: 429, headers: corsHeaders }
    );
  }

  let body: { playerName: string; config?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders });
  }

  if (!body.playerName || typeof body.playerName !== "string") {
    return Response.json({ error: "missing_player_name" }, { status: 400, headers: corsHeaders });
  }

  const playerName = body.playerName.slice(0, 20).trim();
  if (!playerName) {
    return Response.json({ error: "invalid_player_name" }, { status: 400, headers: corsHeaders });
  }

  const roomCode = generateRoomCode();
  const roomId = crypto.randomUUID();

  const doId = env.ROOM.idFromName(roomCode);
  const stub = env.ROOM.get(doId);

  const createResp = await stub.fetch(
    new Request("https://internal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, roomCode, hostPlayerName: playerName, config: body.config }),
    })
  );

  if (!createResp.ok) {
    const err = await createResp.json<{ error: string }>();
    return Response.json({ error: err.error }, { status: 500, headers: corsHeaders });
  }

  const data = await createResp.json<{ playerId: string; reconnectToken: string }>();
  return Response.json(
    { roomId, roomCode, playerId: data.playerId, reconnectToken: data.reconnectToken },
    { headers: corsHeaders }
  );
}

async function handleJoinRoom(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  let body: { roomCode: string; playerName: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: corsHeaders });
  }

  const roomCode = (body.roomCode ?? "").toUpperCase().slice(0, 6);
  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    return Response.json({ error: "invalid_room_code" }, { status: 400, headers: corsHeaders });
  }

  const playerName = (body.playerName ?? "").slice(0, 20).trim();
  if (!playerName) {
    return Response.json({ error: "invalid_player_name" }, { status: 400, headers: corsHeaders });
  }

  const doId = env.ROOM.idFromName(roomCode);
  const stub = env.ROOM.get(doId);

  // Ask the DO to add a new seat
  const joinResp = await stub.fetch(
    new Request("https://internal/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName }),
    })
  );

  if (!joinResp.ok) {
    const err = await joinResp.json<{ error: string; message?: string }>();
    return Response.json(err, { status: joinResp.status, headers: corsHeaders });
  }

  const data = await joinResp.json<{ playerId: string; reconnectToken: string; roomId: string }>();
  return Response.json({ ...data, roomCode }, { headers: corsHeaders });
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => chars[b % chars.length]).join("");
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = roomCreationCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    roomCreationCounts.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= ROOM_CREATE_LIMIT) return false;
  entry.count++;
  return true;
}

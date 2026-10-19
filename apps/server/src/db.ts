import { createClient } from "@supabase/supabase-js";
import type { PlayerColor } from "@ludo/game-engine";

export function getSupabase(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export interface SaveMatchArgs {
  roomCode: string;
  winnerColor: PlayerColor;
  turnCount: number;
  durationMs: number;
  players: Array<{
    name: string;
    color: PlayerColor;
    seatIndex: number;
    isWinner: boolean;
    tokensFinished: number;
    userId?: string | null;
  }>;
}

export async function saveMatch(url: string, serviceKey: string, args: SaveMatchArgs): Promise<void> {
  const db = getSupabase(url, serviceKey);
  const id = crypto.randomUUID();

  const { error: matchErr } = await db.from("matches").insert({
    id,
    room_code: args.roomCode,
    winner_color: args.winnerColor,
    player_count: args.players.length,
    turn_count: args.turnCount,
    duration_ms: args.durationMs,
    created_at: Date.now(),
  });
  if (matchErr) throw matchErr;

  const { error: playersErr } = await db.from("match_players").insert(
    args.players.map(p => ({
      match_id: id,
      player_name: p.name,
      color: p.color,
      seat_index: p.seatIndex,
      is_winner: p.isWinner,
      tokens_finished: p.tokensFinished,
      user_id: p.userId ?? null,
    }))
  );
  if (playersErr) throw playersErr;
}

export async function getRecentMatches(url: string, serviceKey: string, limit = 20) {
  const db = getSupabase(url, serviceKey);
  const { data: matches, error } = await db
    .from("matches")
    .select(`id, room_code, winner_color, player_count, turn_count, duration_ms, created_at,
             match_players(player_name, color, is_winner, tokens_finished)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return matches ?? [];
}

export async function getLeaderboard(url: string, serviceKey: string, limit = 10) {
  const db = getSupabase(url, serviceKey);
  const { data, error } = await db.rpc("get_leaderboard", { row_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function getPlayerStats(url: string, serviceKey: string, playerName: string) {
  const db = getSupabase(url, serviceKey);
  const { data, error } = await db.rpc("get_player_stats", { p_name: playerName });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getAdminStats(url: string, serviceKey: string) {
  const db = getSupabase(url, serviceKey);

  const [{ count: totalMatches }, { count: totalRooms }, { data: matchRows }] = await Promise.all([
    db.from("matches").select("id", { count: "exact", head: true }),
    db.from("matches").select("room_code", { count: "exact", head: true }),
    db.from("matches").select("winner_color, duration_ms"),
  ]);

  const { data: playerRows, error: playerErr } = await db
    .from("match_players")
    .select("player_name");
  if (playerErr) throw playerErr;

  const uniquePlayers = new Set((playerRows ?? []).map(p => p.player_name));

  const rows = matchRows ?? [];
  const avgDuration = rows.length > 0
    ? rows.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / rows.length
    : 0;

  const winnerCounts: Record<string, number> = {};
  for (const r of rows) {
    winnerCounts[r.winner_color] = (winnerCounts[r.winner_color] ?? 0) + 1;
  }
  const mostCommonWinner = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return {
    total_matches: totalMatches ?? 0,
    total_players: uniquePlayers.size,
    total_rooms_created: totalRooms ?? 0,
    avg_match_duration_ms: Math.round(avgDuration),
    most_common_winner: mostCommonWinner,
  };
}

export async function getAllMatches(url: string, serviceKey: string, limit = 50) {
  const db = getSupabase(url, serviceKey);
  const { data, error } = await db
    .from("matches")
    .select(`id, room_code, winner_color, player_count, turn_count, duration_ms, created_at,
             match_players(player_name, color, is_winner, tokens_finished)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getAllPlayers(url: string, serviceKey: string) {
  const db = getSupabase(url, serviceKey);
  const { data, error } = await db.rpc("get_leaderboard", { row_limit: 100 });
  if (error) throw error;
  return data ?? [];
}

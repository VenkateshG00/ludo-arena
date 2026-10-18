/**
 * D1 database service — match persistence.
 * All writes happen server-side only; D1 binding is never exposed to clients.
 */

import type { PlayerColor } from "@ludo/game-engine";

export interface MatchRecord {
  id: string;
  room_code: string;
  winner_color: PlayerColor;
  player_count: number;
  turn_count: number;
  duration_ms: number;
  created_at: number;
}

export interface MatchPlayerRecord {
  match_id: string;
  player_name: string;
  color: PlayerColor;
  seat_index: number;
  is_winner: boolean;
  tokens_finished: number;
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
  }>;
}

export async function saveMatch(db: D1Database, args: SaveMatchArgs): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.batch([
    db.prepare(
      `INSERT INTO matches (id, room_code, winner_color, player_count, turn_count, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, args.roomCode, args.winnerColor, args.players.length, args.turnCount, args.durationMs, now),

    ...args.players.map(p =>
      db.prepare(
        `INSERT INTO match_players (match_id, player_name, color, seat_index, is_winner, tokens_finished)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, p.name, p.color, p.seatIndex, p.isWinner ? 1 : 0, p.tokensFinished)
    ),
  ]);

  return id;
}

export interface RecentMatch {
  id: string;
  room_code: string;
  winner_color: string;
  player_count: number;
  turn_count: number;
  duration_ms: number;
  created_at: number;
  players: Array<{
    player_name: string;
    color: string;
    is_winner: boolean;
    tokens_finished: number;
  }>;
}

export async function getRecentMatches(db: D1Database, limit = 20): Promise<RecentMatch[]> {
  const { results: rows } = await db.prepare(
    `SELECT m.id, m.room_code, m.winner_color, m.player_count, m.turn_count,
            m.duration_ms, m.created_at,
            mp.player_name, mp.color AS p_color, mp.is_winner, mp.tokens_finished
     FROM matches m
     JOIN match_players mp ON mp.match_id = m.id
     ORDER BY m.created_at DESC
     LIMIT ?`
  ).bind(limit * 4).all<{
    id: string; room_code: string; winner_color: string; player_count: number;
    turn_count: number; duration_ms: number; created_at: number;
    player_name: string; p_color: string; is_winner: number; tokens_finished: number;
  }>();

  // Group by match id
  const map = new Map<string, RecentMatch>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        room_code: row.room_code,
        winner_color: row.winner_color,
        player_count: row.player_count,
        turn_count: row.turn_count,
        duration_ms: row.duration_ms,
        created_at: row.created_at,
        players: [],
      });
    }
    map.get(row.id)!.players.push({
      player_name: row.player_name,
      color: row.p_color,
      is_winner: row.is_winner === 1,
      tokens_finished: row.tokens_finished,
    });
  }

  return [...map.values()].slice(0, limit);
}

export interface PlayerStats {
  player_name: string;
  matches_played: number;
  wins: number;
  win_rate: number;
  avg_tokens_finished: number;
}

export async function getPlayerStats(db: D1Database, playerName: string): Promise<PlayerStats | null> {
  const row = await db.prepare(
    `SELECT
       mp.player_name,
       COUNT(*) AS matches_played,
       SUM(mp.is_winner) AS wins,
       AVG(mp.tokens_finished) AS avg_tokens_finished
     FROM match_players mp
     WHERE mp.player_name = ?
     GROUP BY mp.player_name`
  ).bind(playerName).first<{
    player_name: string;
    matches_played: number;
    wins: number;
    avg_tokens_finished: number;
  }>();

  if (!row) return null;

  return {
    player_name: row.player_name,
    matches_played: row.matches_played,
    wins: row.wins,
    win_rate: row.matches_played > 0 ? row.wins / row.matches_played : 0,
    avg_tokens_finished: row.avg_tokens_finished,
  };
}

export async function getLeaderboard(db: D1Database, limit = 10): Promise<PlayerStats[]> {
  const { results } = await db.prepare(
    `SELECT
       mp.player_name,
       COUNT(*) AS matches_played,
       SUM(mp.is_winner) AS wins,
       AVG(mp.tokens_finished) AS avg_tokens_finished
     FROM match_players mp
     GROUP BY mp.player_name
     HAVING matches_played >= 3
     ORDER BY wins DESC, avg_tokens_finished DESC
     LIMIT ?`
  ).bind(limit).all<{
    player_name: string;
    matches_played: number;
    wins: number;
    avg_tokens_finished: number;
  }>();

  return results.map(r => ({
    player_name: r.player_name,
    matches_played: r.matches_played,
    wins: r.wins,
    win_rate: r.matches_played > 0 ? r.wins / r.matches_played : 0,
    avg_tokens_finished: r.avg_tokens_finished,
  }));
}

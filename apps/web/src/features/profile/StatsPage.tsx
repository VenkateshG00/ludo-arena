import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SERVER_URL, COLOR_HEX, formatDuration, timeAgo } from "../../shared/constants";

interface LeaderboardEntry {
  player_name: string;
  matches_played: number;
  wins: number;
  win_rate: number;
  avg_tokens_finished: number;
}

interface RecentMatch {
  id: string;
  room_code: string;
  winner_color: string;
  player_count: number;
  turn_count: number;
  duration_ms: number;
  created_at: number;
  players: Array<{ player_name: string; color: string; is_winner: boolean; tokens_finished: number }>;
}

export function StatsPage() {
  const [tab, setTab] = useState<"leaderboard" | "recent">("leaderboard");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recent, setRecent] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [lb, rm] = await Promise.all([
          fetch(`${SERVER_URL}/api/leaderboard`).then(r => r.json() as Promise<LeaderboardEntry[]>),
          fetch(`${SERVER_URL}/api/matches?limit=15`).then(r => r.json() as Promise<RecentMatch[]>),
        ]);
        setLeaderboard(lb);
        setRecent(rm);
      } catch {
        setError("Could not load stats — is the server running?");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl text-yellow-400 mb-2">Leaderboard</h1>
        <p className="text-white/50">Top players and recent matches</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
        {(["leaderboard", "recent"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-2.5 text-sm font-bold capitalize transition",
              tab === t ? "bg-yellow-400 text-ludo-dark" : "bg-white/5 text-white/60 hover:bg-white/10",
            ].join(" ")}
          >
            {t === "leaderboard" ? "🏆 Top Players" : "🕐 Recent Games"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-white/40 py-12">
          <div className="text-3xl mb-3 animate-spin inline-block">🎲</div>
          <p>Loading stats…</p>
        </div>
      )}
      {error && (
        <div className="text-center text-red-400 py-12 bg-red-500/10 border border-red-500/20 rounded-2xl">
          {error}
        </div>
      )}

      {!loading && !error && tab === "leaderboard" && (
        leaderboard.length === 0 ? (
          <div className="text-center text-white/30 py-16">
            <div className="text-4xl mb-3">🏆</div>
            <p className="font-bold text-white/50 mb-1">No ranked players yet</p>
            <p className="text-xs">Complete a match to appear on the leaderboard.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.player_name}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition"
              >
                <span className="font-display text-xl w-7 text-center text-white/40">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{entry.player_name}</div>
                  <div className="text-xs text-white/40">
                    {entry.matches_played} matches · {(entry.win_rate * 100).toFixed(0)}% win rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-yellow-400">{entry.wins}W</div>
                  <div className="text-xs text-white/30">{entry.avg_tokens_finished.toFixed(1)} avg tokens</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {!loading && !error && tab === "recent" && (
        recent.length === 0 ? (
          <div className="text-center text-white/30 py-16">
            <div className="text-4xl mb-3">🕐</div>
            <p className="font-bold text-white/50 mb-1">No completed matches yet</p>
            <p className="text-xs">Play a game to see match history here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map(match => (
              <div key={match.id} className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ background: COLOR_HEX[match.winner_color as keyof typeof COLOR_HEX] ?? "#fff" }}
                    />
                    <span className="font-bold text-sm">
                      {match.players.find(p => p.is_winner)?.player_name ?? match.winner_color} won
                    </span>
                  </span>
                  <span className="text-xs text-white/30">{timeAgo(match.created_at)}</span>
                </div>
                <div className="flex gap-4 text-xs text-white/40">
                  <span>{match.player_count} players</span>
                  <span>{match.turn_count} turns</span>
                  <span>{formatDuration(match.duration_ms)}</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {match.players.map(p => (
                    <span
                      key={p.player_name}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: `${COLOR_HEX[p.color as keyof typeof COLOR_HEX] ?? "#888"}22`,
                        color: COLOR_HEX[p.color as keyof typeof COLOR_HEX] ?? "#ccc",
                        border: `1px solid ${COLOR_HEX[p.color as keyof typeof COLOR_HEX] ?? "#888"}44`,
                      }}
                    >
                      {p.player_name} {p.tokens_finished}/4
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

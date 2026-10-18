import React, { useEffect, useState } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8787";

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

const COLOR_HEX: Record<string, string> = {
  red: "#E63946", green: "#2DC653", yellow: "#FFBE0B", blue: "#4361EE",
};

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function StatsPage({ onBack }: { onBack: () => void }) {
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
    <div className="min-h-screen bg-ludo-dark px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-white/50 hover:text-white transition text-sm">← Back</button>
          <h1 className="font-display text-2xl text-yellow-400 flex-1 text-center">Stats</h1>
          <div className="w-12" />
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-white/10 mb-5">
          {(["leaderboard", "recent"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 py-2 text-sm font-bold capitalize transition",
                tab === t ? "bg-yellow-400 text-ludo-dark" : "bg-white/5 text-white/60 hover:bg-white/10",
              ].join(" ")}
            >
              {t === "leaderboard" ? "🏆 Leaderboard" : "🕐 Recent Games"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-white/40 py-12">Loading…</div>
        )}
        {error && (
          <div className="text-center text-red-400 py-12">{error}</div>
        )}

        {!loading && !error && tab === "leaderboard" && (
          leaderboard.length === 0 ? (
            <div className="text-center text-white/30 py-12">
              No ranked players yet.<br />
              <span className="text-xs">Play 3+ matches to appear here.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.player_name}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5"
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
            <div className="text-center text-white/30 py-12">No completed matches yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map(match => (
                <div key={match.id} className="px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ background: COLOR_HEX[match.winner_color] ?? "#fff" }}
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
                          background: `${COLOR_HEX[p.color] ?? "#888"}22`,
                          color: COLOR_HEX[p.color] ?? "#ccc",
                          border: `1px solid ${COLOR_HEX[p.color] ?? "#888"}44`,
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
    </div>
  );
}

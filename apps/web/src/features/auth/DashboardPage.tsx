import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "../../services/supabase";
import { COLOR_HEX, formatDuration, timeAgo } from "../../shared/constants";

interface UserStats {
  matches_played: number;
  wins: number;
  win_rate: number;
  avg_tokens_finished: number;
  best_streak: number;
}

interface UserMatch {
  match_id: string;
  room_code: string;
  winner_color: string;
  player_count: number;
  turn_count: number;
  duration_ms: number;
  created_at: number;
  my_color: string;
  is_winner: boolean;
  tokens_finished: number;
}

export function DashboardPage() {
  const { user, profile, authEnabled, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }
    const sb = supabase;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, matchesRes] = await Promise.all([
          sb.rpc("get_user_stats", { p_user_id: user.id }),
          sb.rpc("get_user_matches", { p_user_id: user.id, row_limit: 20 }),
        ]);

        if (statsRes.error) throw statsRes.error;
        if (matchesRes.error) throw matchesRes.error;

        setStats(statsRes.data?.[0] ?? {
          matches_played: 0, wins: 0, win_rate: 0, avg_tokens_finished: 0, best_streak: 0,
        });
        setMatches(matchesRes.data ?? []);
      } catch (e) {
        setError("Failed to load stats");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl animate-spin">🎲</div>
      </div>
    );
  }

  if (!authEnabled || !user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="font-display text-2xl text-yellow-400 mb-2">Your Dashboard</h1>
          <p className="text-white/50 mb-6">Sign in to track your stats and match history.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/login" className="px-6 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition">
              Sign In
            </Link>
            <Link to="/signup" className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-yellow-400/50 flex items-center justify-center text-3xl shadow-lg">
          {profile?.avatar_emoji ?? "🎲"}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl text-white">{profile?.display_name ?? user.email}</h1>
          <p className="text-white/40 text-sm font-mono">@{profile?.username ?? "unknown"}</p>
        </div>
        <Link
          to="/profile"
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition"
        >
          Edit Profile
        </Link>
      </div>

      {loading && (
        <div className="text-center text-white/40 py-16">
          <div className="text-3xl mb-3 animate-spin inline-block">🎲</div>
          <p>Loading your stats…</p>
        </div>
      )}

      {error && (
        <div className="text-center text-red-400 py-12 bg-red-500/10 border border-red-500/20 rounded-2xl">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard icon="🎮" label="Matches" value={stats.matches_played} />
            <StatCard icon="🏆" label="Wins" value={stats.wins} accent />
            <StatCard icon="📈" label="Win Rate" value={`${Math.round(stats.win_rate * 100)}%`} />
            <StatCard icon="🏁" label="Avg Tokens" value={stats.avg_tokens_finished.toFixed(1)} />
          </div>

          {/* Match history */}
          <h2 className="font-display text-xl text-white mb-4">Match History</h2>
          {matches.length === 0 ? (
            <div className="text-center text-white/30 py-12 bg-white/5 rounded-2xl">
              <div className="text-3xl mb-2">🎮</div>
              <p className="font-bold text-white/50 mb-1">No matches yet</p>
              <p className="text-xs">Play a game to see your history here.</p>
              <Link to="/" className="inline-block mt-4 px-5 py-2 rounded-xl bg-yellow-400 text-ludo-dark text-sm font-bold hover:bg-yellow-300 transition">
                Start Playing
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {matches.map(m => (
                <div
                  key={m.match_id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition"
                >
                  {/* Result badge */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{
                      background: m.is_winner ? `${COLOR_HEX[m.my_color as keyof typeof COLOR_HEX] ?? "#888"}22` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${m.is_winner ? (COLOR_HEX[m.my_color as keyof typeof COLOR_HEX] ?? "#888") + "44" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {m.is_winner ? "🏆" : "⚔️"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: COLOR_HEX[m.my_color as keyof typeof COLOR_HEX] ?? "#888" }}
                      />
                      <span className="font-bold text-sm">
                        {m.is_winner ? "Victory" : "Defeat"}
                      </span>
                      <span className="text-xs text-white/30">as {m.my_color}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {m.player_count} players · {m.turn_count} turns · {formatDuration(m.duration_ms)}
                    </div>
                  </div>

                  {/* Tokens + time */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-white/50">{m.tokens_finished}/4 tokens</div>
                    <div className="text-xs text-white/30">{timeAgo(m.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border transition ${accent ? "bg-yellow-400/10 border-yellow-400/20" : "bg-white/5 border-white/10"}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-display text-xl ${accent ? "text-yellow-400" : "text-white"}`}>{value}</div>
      <div className="text-white/40 text-xs">{label}</div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SERVER_URL, COLOR_HEX, formatDuration, timeAgo } from "../../shared/constants";

interface MatchRow {
  id: string;
  room_code: string;
  winner_color: string;
  player_count: number;
  turn_count: number;
  duration_ms: number;
  created_at: number;
  players: Array<{ player_name: string; color: string; is_winner: boolean; tokens_finished: number }>;
}

interface LeaderboardEntry {
  player_name: string;
  matches_played: number;
  wins: number;
  win_rate: number;
  avg_tokens_finished: number;
}

interface AdminStats {
  total_matches: number;
  total_players: number;
  total_rooms_created: number;
  avg_match_duration_ms: number;
  most_common_winner: string;
}

const ADMIN_KEY_STORAGE = "ludo_arena_admin_key";

export function AdminPage() {
  const [key, setKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? "");
  const [keyInput, setKeyInput] = useState("");
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(ADMIN_KEY_STORAGE));
  const [tab, setTab] = useState<"overview" | "matches" | "players">("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers: Record<string, string> = authed ? { "X-Admin-Key": key } : {};

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, m, p] = await Promise.all([
        fetch(`${SERVER_URL}/api/admin/stats`, { headers }).then(r => r.json()),
        fetch(`${SERVER_URL}/api/admin/matches?limit=50`, { headers }).then(r => r.json()),
        fetch(`${SERVER_URL}/api/admin/players`, { headers }).then(r => r.json()),
      ]);
      if (s.error || m.error || p.error) {
        setError(s.error || m.error || p.error || "Unauthorized");
        setAuthed(false);
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        return;
      }
      setStats(s);
      setMatches(m);
      setPlayers(p);
    } catch {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    sessionStorage.setItem(ADMIN_KEY_STORAGE, keyInput.trim());
    setKey(keyInput.trim());
    setAuthed(true);
  };

  if (!authed) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <form onSubmit={handleAuth} className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">🔐</div>
            <h1 className="font-display text-2xl text-yellow-400">Admin Access</h1>
            <p className="text-white/40 text-sm mt-1">Enter the admin key to continue</p>
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="Admin key"
            className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 mb-3"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button type="submit" className="w-full py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition">
            Unlock
          </button>
          <Link to="/" className="block text-center text-white/30 text-sm mt-4 hover:text-white/60 transition">
            ← Back to home
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-yellow-400">Admin Dashboard</h1>
          <p className="text-white/40 text-sm">Game server overview and match data</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(ADMIN_KEY_STORAGE); setAuthed(false); setKey(""); }}
          className="text-sm text-white/40 hover:text-white/70 transition"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
        {(["overview", "matches", "players"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-2 text-sm font-bold capitalize transition",
              tab === t ? "bg-yellow-400 text-ludo-dark" : "bg-white/5 text-white/60 hover:bg-white/10",
            ].join(" ")}
          >
            {t === "overview" ? "📊 Overview" : t === "matches" ? "🎮 Matches" : "👥 Players"}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-white/40 py-12">Loading…</div>}
      {error && <div className="text-center text-red-400 py-12">{error}</div>}

      {!loading && !error && tab === "overview" && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Matches" value={stats.total_matches} icon="🎮" />
          <StatCard label="Unique Players" value={stats.total_players} icon="👥" />
          <StatCard label="Rooms Created" value={stats.total_rooms_created} icon="🏠" />
          <StatCard label="Avg Match Length" value={formatDuration(stats.avg_match_duration_ms)} icon="⏱️" />
          <StatCard label="Top Winner" value={stats.most_common_winner || "—"} icon="🏆" />
        </div>
      )}

      {!loading && !error && tab === "matches" && (
        matches.length === 0 ? (
          <div className="text-center text-white/30 py-12">No matches recorded yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_80px_60px_70px_80px] gap-2 px-3 py-2 text-xs text-white/40 font-bold uppercase tracking-wide">
              <span>Winner</span>
              <span>Room</span>
              <span>Players</span>
              <span>Turns</span>
              <span>Time</span>
            </div>
            {matches.map(m => {
              const winner = m.players.find(p => p.is_winner);
              return (
                <div key={m.id} className="grid grid-cols-[1fr_80px_60px_70px_80px] gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 items-center text-sm hover:bg-white/[0.07] transition">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLOR_HEX[m.winner_color as keyof typeof COLOR_HEX] ?? "#888" }} />
                    <span className="font-bold truncate">{winner?.player_name ?? m.winner_color}</span>
                  </span>
                  <span className="font-mono text-xs text-white/50">{m.room_code}</span>
                  <span className="text-white/60">{m.player_count}</span>
                  <span className="text-white/60">{m.turn_count}</span>
                  <span className="text-white/40 text-xs">{timeAgo(m.created_at)}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {!loading && !error && tab === "players" && (
        players.length === 0 ? (
          <div className="text-center text-white/30 py-12">No players recorded yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-2 px-3 py-2 text-xs text-white/40 font-bold uppercase tracking-wide">
              <span>Player</span>
              <span>Matches</span>
              <span>Wins</span>
              <span>Win Rate</span>
              <span>Avg Tokens</span>
            </div>
            {players.map(p => (
              <div key={p.player_name} className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 items-center text-sm hover:bg-white/[0.07] transition">
                <span className="font-bold truncate">{p.player_name}</span>
                <span className="text-white/60">{p.matches_played}</span>
                <span className="text-yellow-400 font-bold">{p.wins}</span>
                <span className="text-white/60">{(p.win_rate * 100).toFixed(0)}%</span>
                <span className="text-white/50">{p.avg_tokens_finished.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-display text-2xl text-white">{value}</div>
      <div className="text-white/40 text-sm">{label}</div>
    </div>
  );
}

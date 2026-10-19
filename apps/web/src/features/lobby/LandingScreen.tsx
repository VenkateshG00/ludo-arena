import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../game/GameContext";
import { useAuth } from "../auth/AuthContext";

const FEATURES = [
  { icon: "⚡", title: "Instant Play", desc: "No sign-up, no download. Create a room and share the link." },
  { icon: "👥", title: "2–4 Players", desc: "Play with friends or fill seats with new opponents." },
  { icon: "📱", title: "Any Device", desc: "Works on phone, tablet, and desktop — right in your browser." },
  { icon: "🏆", title: "Leaderboard", desc: "Track wins, win rates, and climb the rankings." },
];

export function LandingScreen() {
  const { createRoom, joinRoom } = useGame();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill name from profile
  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
  }, [profile]);

  // Pick up invite code from URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) {
      setRoomCode(code.toUpperCase());
      setMode("join");
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createRoom(playerName.trim());
      navigate("/play");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;
    setBusy(true);
    setError("");
    try {
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      navigate("/play");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-ludo-red/10 blur-3xl" />
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-ludo-blue/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-ludo-green/10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
          {user && profile ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-6">
              <span className="text-xl">{profile.avatar_emoji}</span>
              <span>Welcome back, <strong className="text-white">{profile.display_name}</strong>!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Free · No sign-up · Works in any browser
            </div>
          )}

          <h1 className="font-display text-5xl sm:text-7xl mb-4">
            <span className="text-yellow-400">Ludo</span>{" "}
            <span className="text-white">Arena</span>
          </h1>
          <p className="text-white/50 text-lg sm:text-xl max-w-xl mx-auto mb-10">
            The classic board game, reimagined for the web.
            Roll, race, and capture — with friends, anywhere.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <button
              onClick={() => setMode("create")}
              className="px-8 py-3.5 rounded-2xl bg-yellow-400 text-ludo-dark font-bold text-lg hover:bg-yellow-300 transition active:scale-95 shadow-lg shadow-yellow-400/20"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="px-8 py-3.5 rounded-2xl bg-white/10 border border-white/15 text-white font-bold text-lg hover:bg-white/15 transition active:scale-95"
            >
              Join Room
            </button>
          </div>

          <p className="text-white/25 text-sm">
            or{" "}
            <Link to="/leaderboard" className="underline hover:text-white/50 transition">
              view the leaderboard
            </Link>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:bg-white/[0.07] hover:border-white/20 transition group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="font-bold text-white mb-1">{f.title}</h3>
              <p className="text-white/40 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl text-center text-white mb-8">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { step: "1", title: "Create a room", desc: "Pick your name and get a 6-character room code." },
            { step: "2", title: "Share the link", desc: "Send the invite link or room code to friends." },
            { step: "3", title: "Roll & race", desc: "Everyone readies up — the host starts the game." },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-400 text-ludo-dark font-display text-lg flex items-center justify-center mx-auto mb-3">
                {s.step}
              </div>
              <h3 className="font-bold text-white mb-1">{s.title}</h3>
              <p className="text-white/40 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal overlay for create/join */}
      {mode !== "menu" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setMode("menu")}
        >
          <div
            className="w-full max-w-sm bg-ludo-dark border border-white/15 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {mode === "create" && (
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-yellow-400">Create a Room</h2>
                  <button type="button" onClick={() => setMode("menu")} className="text-white/40 hover:text-white text-xl leading-none">&times;</button>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-white/70">Your name</span>
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    maxLength={20}
                    placeholder="Enter your name"
                    className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition"
                    autoFocus
                  />
                </label>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode("menu")} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">
                    Back
                  </button>
                  <button type="submit" disabled={!playerName.trim() || busy} className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition disabled:opacity-50">
                    {busy ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            )}

            {mode === "join" && (
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-yellow-400">Join a Room</h2>
                  <button type="button" onClick={() => setMode("menu")} className="text-white/40 hover:text-white text-xl leading-none">&times;</button>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-white/70">Your name</span>
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    maxLength={20}
                    placeholder="Enter your name"
                    className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition"
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-white/70">Room code</span>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="e.g. XK9P2M"
                    className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 tracking-widest font-mono uppercase text-center text-lg transition"
                  />
                </label>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMode("menu")} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition">
                    Back
                  </button>
                  <button type="submit" disabled={!playerName.trim() || !roomCode.trim() || busy} className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition disabled:opacity-50">
                    {busy ? "Joining…" : "Join"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

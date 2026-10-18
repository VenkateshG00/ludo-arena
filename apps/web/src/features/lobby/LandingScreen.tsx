import React, { useState } from "react";
import { useGame } from "../game/GameContext";

export function LandingScreen({ onShowStats }: { onShowStats?: () => void }) {
  const { createRoom, joinRoom } = useGame();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createRoom(playerName.trim());
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
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ludo-dark px-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🎲</div>
        <h1 className="font-display text-5xl text-yellow-400 mb-2">Ludo Arena</h1>
        <p className="text-white/60 text-lg">Free online multiplayer · 2–4 players</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
        {mode === "menu" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("create")}
              className="w-full py-3 rounded-xl bg-yellow-400 text-ludo-dark font-bold text-lg hover:bg-yellow-300 transition active:scale-95"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition active:scale-95"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-yellow-400">Create a Room</h2>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-white/70">Your name</span>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
                autoFocus
              />
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!playerName.trim() || busy}
                className="flex-1 py-2 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-yellow-400">Join a Room</h2>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-white/70">Your name</span>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400"
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
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 tracking-widest font-mono uppercase"
              />
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!playerName.trim() || !roomCode.trim() || busy}
                className="flex-1 py-2 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {busy ? "Joining…" : "Join"}
              </button>
            </div>
          </form>
        )}
      </div>

      <button
        onClick={onShowStats}
        className="mt-5 text-white/30 hover:text-white/60 text-sm underline transition"
      >
        🏆 Leaderboard &amp; Recent Games
      </button>

      <p className="mt-3 text-white/20 text-xs text-center">
        No sign-up required · Free to play
      </p>
    </div>
  );
}

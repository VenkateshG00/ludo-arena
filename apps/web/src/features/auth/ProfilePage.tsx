import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const AVATARS = ["🎲", "😎", "🤠", "🤖", "👾", "🦁", "🐯", "🐸", "🦊", "🐼", "🦄", "🐉", "🔥", "⚡", "💎", "👑", "🎯", "🏆", "🃏", "⭐"];

export function ProfilePage() {
  const { user, profile, authEnabled, loading, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_emoji ?? "🎲");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setAvatar(profile.avatar_emoji);
    }
  }, [profile]);

  if (loading) {
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
          <p className="text-white/50 mb-4">Sign in to edit your profile.</p>
          <Link to="/login" className="px-6 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const { error: err } = await updateProfile({
      display_name: displayName || username,
      username,
      avatar_emoji: avatar,
    });
    if (err) {
      setError(err);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setBusy(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl text-yellow-400 mb-1">Profile</h1>
        <p className="text-white/50 text-sm">Customize how you appear in the arena</p>
      </div>

      {/* Current avatar preview */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-yellow-400/50 flex items-center justify-center text-5xl shadow-lg shadow-yellow-400/10">
          {avatar}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
        {/* Avatar picker */}
        <div>
          <span className="text-sm text-white/70 block mb-2">Avatar</span>
          <div className="grid grid-cols-10 gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={[
                  "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition",
                  avatar === a
                    ? "bg-yellow-400/20 border-2 border-yellow-400 scale-110"
                    : "bg-white/5 border border-white/10 hover:bg-white/10",
                ].join(" ")}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-white/70">Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={20}
            className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-white/70">Username</span>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            minLength={3}
            maxLength={20}
            className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition font-mono"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-white/50">Email</span>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
          />
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {saved && <p className="text-green-400 text-sm">✓ Profile saved!</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy || !username || !displayName}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition disabled:opacity-50 active:scale-95"
          >
            {busy ? "Saving…" : "Save Profile"}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 font-bold hover:bg-white/20 hover:text-white transition"
          >
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { signIn, authEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!authEnabled) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center text-white/40">
          <p>Auth is not configured.</p>
          <Link to="/" className="text-yellow-400 underline mt-2 inline-block">Back home</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setBusy(false);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="font-display text-3xl text-yellow-400 mb-1">Welcome back</h1>
          <p className="text-white/50 text-sm">Sign in to track your stats</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-white/70">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-white/70">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400 transition"
            />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition disabled:opacity-50 active:scale-95"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-4">
          No account?{" "}
          <Link to="/signup" className="text-yellow-400 hover:text-yellow-300 font-bold">Sign up</Link>
        </p>
        <p className="text-center text-white/25 text-xs mt-2">
          Or <Link to="/" className="underline hover:text-white/50">play as guest</Link>
        </p>
      </div>
    </div>
  );
}

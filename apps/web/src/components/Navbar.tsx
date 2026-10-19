import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/rules", label: "Rules" },
];

export function Navbar() {
  const location = useLocation();
  const { user, profile, authEnabled, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isGame = location.pathname === "/play";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (isGame) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ludo-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:rotate-12 transition-transform">🎲</span>
          <span className="font-display text-xl text-yellow-400 group-hover:text-yellow-300 transition">
            Ludo Arena
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={[
                "hidden sm:block px-3 py-1.5 rounded-lg text-sm font-bold transition",
                location.pathname === link.to
                  ? "bg-white/10 text-yellow-400"
                  : "text-white/60 hover:text-white hover:bg-white/5",
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth section */}
          {authEnabled && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <span className="text-xl">{profile?.avatar_emoji ?? "🎲"}</span>
                <span className="hidden sm:block text-sm font-bold text-white/80 max-w-[100px] truncate">
                  {profile?.display_name ?? user.email}
                </span>
                <svg className={`w-3 h-3 text-white/40 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-ludo-dark border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                  >
                    👤 Profile
                  </Link>
                  <div className="border-t border-white/10" />
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-white/50 hover:bg-white/10 hover:text-white transition"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : authEnabled ? (
            <div className="flex items-center gap-1">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-yellow-400 text-ludo-dark hover:bg-yellow-300 transition"
              >
                Sign Up
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

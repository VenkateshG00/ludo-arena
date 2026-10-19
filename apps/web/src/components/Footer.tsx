import React from "react";
import { Link, useLocation } from "react-router-dom";

export function Footer() {
  const location = useLocation();
  if (location.pathname === "/play") return null;

  return (
    <footer className="border-t border-white/10 py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/30">
        <span>© {new Date().getFullYear()} Ludo Arena · Free online multiplayer Ludo</span>
        <div className="flex gap-4">
          <Link to="/rules" className="hover:text-white/60 transition">Rules</Link>
          <Link to="/leaderboard" className="hover:text-white/60 transition">Leaderboard</Link>
        </div>
      </div>
    </footer>
  );
}

import React from "react";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl mb-4">🎲</div>
        <h1 className="font-display text-5xl text-yellow-400 mb-2">404</h1>
        <p className="text-white/50 mb-6">This page rolled off the board.</p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition active:scale-95"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

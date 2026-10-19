/**
 * WinnerCelebration — full-screen overlay shown when the game ends.
 * Winner gets fireworks, champion pose, confetti.
 * Losers get a funny disappointed reaction with "Revenge?" button.
 */

import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState, PlayerColor } from "@ludo/game-engine";
import { COLOR_HEX } from "../../../shared/constants";

interface WinnerOverlayProps {
  game: GameState;
  winner: PlayerColor;
  myPlayerId: string | null;
  onRematch: () => void;
  onLeave: () => void;
}

const WINNER_TITLES = ["CHAMPION!", "LUDO LEGEND!", "YOU DID IT!", "VICTORY!"];
const LOSER_MESSAGES: Record<string, string[]> = {
  red: ["SO CLOSE!", "THE DICE HAD OTHER PLANS!", "REVENGE NEXT ROUND!"],
  green: ["ALMOST HAD IT!", "ONE MORE TRY!", "REVENGE NEXT ROUND!"],
  yellow: ["THAT WAS INTENSE!", "SO CLOSE!", "REVENGE NEXT ROUND!"],
  blue: ["NICE GAME!", "THEY GOT LUCKY!", "REVENGE NEXT ROUND!"],
};

export function WinnerOverlay({
  game,
  winner,
  myPlayerId,
  onRematch,
  onLeave,
}: WinnerOverlayProps) {
  const winnerTitle = useMemo(() => WINNER_TITLES[Math.floor(Math.random() * WINNER_TITLES.length)], []);
  const isMe = game.players.some(p => p.color === winner && p.id === myPlayerId);
  const winnerPlayer = game.players.find(p => p.color === winner);
  const winnerName = winnerPlayer?.name ?? winner;
  const winnerColor = COLOR_HEX[winner] ?? "#FFBE0B";

  const loserMsg = useMemo(() => {
    const myColor = game.players.find(p => p.id === myPlayerId)?.color;
    const msgs = LOSER_MESSAGES[myColor ?? "red"];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }, [game.players, myPlayerId]);

  const myColor = game.players.find(p => p.id === myPlayerId)?.color;
  const myColorHex = myColor ? (COLOR_HEX[myColor] ?? "#888") : "#888";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Dimmed background */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Fireworks */}
      <Fireworks color={winnerColor} />

      {/* Card */}
      <motion.div
        className="relative bg-ludo-dark border-2 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full"
        style={{ borderColor: winnerColor }}
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
      >
        {/* Winner icon / champion pose */}
        <motion.div
          className="text-6xl mb-3"
          animate={{
            y: [0, -8, 0, -5, 0],
            rotate: [0, -5, 5, -3, 0],
          }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
        >
          {isMe ? "🏆" : "👑"}
        </motion.div>

        {/* Color ring around winner */}
        <motion.div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-display"
          style={{
            background: `${winnerColor}22`,
            border: `3px solid ${winnerColor}`,
            color: winnerColor,
          }}
          animate={{
            boxShadow: [
              `0 0 0px ${winnerColor}00`,
              `0 0 20px ${winnerColor}66`,
              `0 0 0px ${winnerColor}00`,
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {isMe ? "😎" : "🎉"}
        </motion.div>

        <motion.h2
          className="font-display text-3xl mb-1"
          style={{ color: winnerColor }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.6, delay: 0.5 }}
        >
          {isMe ? winnerTitle : `${winnerName} wins!`}
        </motion.h2>

        {isMe ? (
          <p className="text-white/60 mb-1">All 4 tokens made it home</p>
        ) : (
          <p className="text-white/60 mb-1" style={{ color: myColorHex }}>
            {loserMsg}
          </p>
        )}

        {/* Animated tokens row */}
        <div className="flex justify-center gap-2 my-4">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: winnerColor }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: 1,
                rotate: 0,
                y: isMe ? [0, -5, 0] : [0, 3, 0],
              }}
              transition={{
                delay: 0.6 + i * 0.15,
                type: "spring",
                bounce: 0.6,
                y: isMe
                  ? { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }
                  : { duration: 1.5, repeat: Infinity },
              }}
            >
              {i + 1}
            </motion.div>
          ))}
        </div>

        {/* Match summary */}
        <div className="text-xs text-white/40 mb-5">
          {game.turnNumber} turns · {game.players.length} players
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <motion.button
            onClick={onRematch}
            className="flex-1 py-3 rounded-xl font-bold text-lg transition active:scale-95"
            style={{ background: winnerColor, color: "#1A1A2E" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isMe ? "🏆 Play Again" : "⚔️ Revenge?"}
          </motion.button>
          <motion.button
            onClick={onLeave}
            className="px-4 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Leave
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Fireworks effect ────────────────────────────────────────── */
function Fireworks({ color }: { color: string }) {
  const bursts = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 50,
        delay: Math.random() * 2,
        color: [color, "#FFBE0B", "#E63946", "#2DC653", "#4361EE"][i % 5],
      })),
    [color]
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bursts.map(b => (
        <motion.div
          key={b.id}
          className="absolute"
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 0.8,
            delay: b.delay,
            repeat: Infinity,
            repeatDelay: 1.5 + Math.random(),
          }}
        >
          {/* Star burst */}
          {Array.from({ length: 8 }, (_, j) => (
            <motion.div
              key={j}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ background: b.color }}
              animate={{
                x: Math.cos((j / 8) * Math.PI * 2) * 30,
                y: Math.sin((j / 8) * Math.PI * 2) * 30,
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{ duration: 0.6, delay: b.delay }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

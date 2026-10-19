import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

interface DiceProps {
  value: number | null;
  rolling?: boolean;
  canRoll: boolean;
  onRoll: () => void;
  isMyTurn?: boolean;
}

export function Dice({ value, rolling, canRoll, onRoll, isMyTurn }: DiceProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [animating, setAnimating] = useState(false);
  const [frame, setFrame] = useState(0);
  const [justSix, setJustSix] = useState(false);
  const prevValueRef = useRef<number | null>(value);

  useEffect(() => {
    if (!rolling) {
      setDisplayValue(value);
      setAnimating(false);
      // Detect newly rolled six
      if (value === 6 && prevValueRef.current !== 6) {
        setJustSix(true);
        setTimeout(() => setJustSix(false), 1500);
      }
      prevValueRef.current = value;
      return;
    }
    setAnimating(true);
    let count = 0;
    const id = setInterval(() => {
      setFrame(Math.ceil(Math.random() * 6));
      count++;
      if (count > 10) {
        clearInterval(id);
        setDisplayValue(value);
        setAnimating(false);
      }
    }, 50);
    return () => clearInterval(id);
  }, [value, rolling]);

  const shown = animating ? frame || 1 : displayValue;
  const dots = shown ? DOTS[shown] : null;

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Six celebration burst */}
      <AnimatePresence>
        {justSix && (
          <>
            {/* Star burst behind dice */}
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute pointer-events-none text-yellow-400"
                style={{
                  left: "50%",
                  top: "50%",
                  fontSize: "14px",
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 8) * Math.PI * 2) * 55,
                  y: Math.sin((i / 8) * Math.PI * 2) * 55,
                  opacity: 0,
                  scale: 0,
                  rotate: 180,
                }}
                transition={{ duration: 0.7, delay: i * 0.03 }}
              >
                ★
              </motion.div>
            ))}
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-yellow-400 pointer-events-none"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={canRoll ? onRoll : undefined}
        disabled={!canRoll}
        aria-label={canRoll ? "Roll dice" : shown ? `Dice shows ${shown}` : "Waiting to roll"}
        className={[
          "relative w-20 h-20 rounded-xl border-4 select-none overflow-visible",
          "bg-white shadow-lg",
          canRoll
            ? "border-yellow-400 cursor-pointer"
            : "border-gray-300 cursor-not-allowed opacity-80",
        ].join(" ")}
        whileHover={canRoll ? { scale: 1.1, rotate: 2 } : undefined}
        whileTap={canRoll ? { scale: 0.92 } : undefined}
        animate={
          justSix
            ? { rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] }
            : animating
            ? { rotate: [0, 15, -15, 10, -10, 0] }
            : { rotate: 0, scale: 1 }
        }
        transition={justSix ? { duration: 0.5 } : { duration: 0.15 }}
        style={{
          boxShadow: justSix
            ? "0 0 20px rgba(255,190,11,0.6), 0 0 40px rgba(255,190,11,0.3)"
            : canRoll
            ? "0 4px 15px rgba(255,190,11,0.2)"
            : undefined,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full p-1">
          {dots ? (
            dots.map(([cx, cy], i) => (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r={8}
                fill="#1a1a2e"
                initial={false}
                animate={justSix ? { r: [8, 9, 8] } : {}}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              />
            ))
          ) : (
            <text x="50" y="65" textAnchor="middle" fontSize={36} fill="#ccc">?</text>
          )}
        </svg>
      </motion.button>

      {/* Extra turn indicator */}
      <AnimatePresence>
        {justSix && (
          <motion.span
            className="text-xs font-bold text-green-400 whitespace-nowrap"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            🎲 EXTRA TURN!
          </motion.span>
        )}
      </AnimatePresence>

      {/* Roll hint */}
      {canRoll && !animating && (
        <motion.span
          className="text-xs text-yellow-300/70"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Tap to roll
        </motion.span>
      )}
    </div>
  );
}

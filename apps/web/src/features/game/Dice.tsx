import React, { useEffect, useState } from "react";

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
}

export function Dice({ value, rolling, canRoll, onRoll }: DiceProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [animating, setAnimating] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!rolling) {
      setDisplayValue(value);
      setAnimating(false);
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
    <button
      onClick={canRoll ? onRoll : undefined}
      disabled={!canRoll}
      aria-label={canRoll ? "Roll dice" : shown ? `Dice shows ${shown}` : "Waiting to roll"}
      className={[
        "relative w-20 h-20 rounded-xl border-4 transition-all duration-150 select-none",
        "bg-white shadow-lg",
        canRoll
          ? "border-yellow-400 cursor-pointer hover:scale-110 hover:shadow-yellow-300/50 hover:shadow-xl active:scale-95"
          : "border-gray-300 cursor-not-allowed opacity-80",
        animating ? "animate-dice-roll" : "",
      ].join(" ")}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {dots
          ? dots.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={8} fill="#1a1a2e" />
            ))
          : (
            <text x="50" y="65" textAnchor="middle" fontSize={36} fill="#ccc">?</text>
          )}
      </svg>
    </button>
  );
}

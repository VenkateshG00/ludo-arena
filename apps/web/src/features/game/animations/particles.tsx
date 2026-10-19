/**
 * Reusable particle effects: confetti, stars, BONK burst, sparkles.
 * All rendered as SVG overlays positioned absolutely.
 */

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  shape: "circle" | "star" | "square" | "triangle";
  rotation: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface BurstProps {
  cx: number;
  cy: number;
  colors: string[];
  count?: number;
  spread?: number;
  sizeRange?: [number, number];
  duration?: number;
  shapes?: Particle["shape"][];
  onComplete?: () => void;
}

export function ParticleBurst({
  cx,
  cy,
  colors,
  count = 12,
  spread = 80,
  sizeRange = [3, 7],
  duration = 0.8,
  shapes = ["circle", "star"],
  onComplete,
}: BurstProps) {
  const particles = useMemo(() => {
    const rand = seededRandom(cx * 31 + cy * 17 + count);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.5;
      const dist = spread * (0.4 + rand() * 0.6);
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 20,
        angle: (rand() - 0.5) * 720,
        distance: dist,
        size: sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]),
        color: colors[Math.floor(rand() * colors.length)],
        delay: rand() * 0.15,
        shape: shapes[Math.floor(rand() * shapes.length)] as Particle["shape"],
        rotation: rand() * 360,
      };
    });
  }, [cx, cy, count, spread, sizeRange, colors, shapes]);

  return (
    <g>
      {particles.map(p => (
        <motion.g
          key={p.id}
          initial={{ x: cx, y: cy, scale: 0, opacity: 1 }}
          animate={{
            x: cx + p.x,
            y: cy + p.y,
            scale: [0, 1.2, 0.8],
            opacity: [1, 1, 0],
            rotate: p.angle,
          }}
          transition={{
            duration,
            delay: p.delay,
            ease: "easeOut",
          }}
          onAnimationComplete={p.id === 0 ? onComplete : undefined}
        >
          {p.shape === "circle" && (
            <circle cx={0} cy={0} r={p.size} fill={p.color} />
          )}
          {p.shape === "star" && (
            <text x={0} y={p.size * 0.7} textAnchor="middle" fontSize={p.size * 2.5} fill={p.color}>
              ★
            </text>
          )}
          {p.shape === "square" && (
            <rect x={-p.size} y={-p.size} width={p.size * 2} height={p.size * 2} fill={p.color} rx={1} />
          )}
          {p.shape === "triangle" && (
            <polygon
              points={`0,${-p.size} ${-p.size},${p.size} ${p.size},${p.size}`}
              fill={p.color}
            />
          )}
        </motion.g>
      ))}
    </g>
  );
}

/** Confetti rain from above a point. */
export function ConfettiRain({
  cx,
  cy,
  colors,
  count = 20,
  width = 120,
  duration = 1.5,
}: {
  cx: number;
  cy: number;
  colors: string[];
  count?: number;
  width?: number;
  duration?: number;
}) {
  const pieces = useMemo(() => {
    const rand = seededRandom(cx + cy + count);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: cx - width / 2 + rand() * width,
      drift: (rand() - 0.5) * 60,
      fallDist: 80 + rand() * 60,
      size: 3 + rand() * 4,
      color: colors[Math.floor(rand() * colors.length)],
      delay: rand() * 0.4,
      spin: rand() * 720 - 360,
    }));
  }, [cx, cy, count, width, colors]);

  return (
    <g>
      {pieces.map(p => (
        <motion.rect
          key={p.id}
          x={p.startX}
          y={cy - 10}
          width={p.size}
          height={p.size * 1.4}
          fill={p.color}
          rx={1}
          initial={{ y: cy - 10, opacity: 1, rotate: 0 }}
          animate={{
            y: cy + p.fallDist,
            opacity: [1, 1, 0],
            rotate: p.spin,
            x: p.startX + p.drift,
          }}
          transition={{
            duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </g>
  );
}

/** Animated text that pops in and fades. */
export function PopText({
  x,
  y,
  text,
  color = "#FFBE0B",
  fontSize = 16,
  duration = 1.2,
  delay = 0,
  fontWeight = "bold",
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  fontSize?: number;
  duration?: number;
  delay?: number;
  fontWeight?: string;
}) {
  return (
    <motion.text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={fontSize}
      fontWeight={fontWeight}
      fill={color}
      stroke="rgba(0,0,0,0.5)"
      strokeWidth={3}
      paintOrder="stroke"
      style={{ fontFamily: "Fredoka One, sans-serif", pointerEvents: "none" }}
      initial={{ scale: 0, opacity: 0, y: y + 10 }}
      animate={{
        scale: [0, 1.3, 1, 1, 0.9],
        opacity: [0, 1, 1, 1, 0],
        y: [y + 10, y, y, y, y - 15],
      }}
      transition={{ duration, delay, times: [0, 0.15, 0.3, 0.7, 1] }}
    >
      {text}
    </motion.text>
  );
}

/** Spinning dizzy stars around a token. */
export function DizzyStars({
  cx,
  cy,
  color = "#FFBE0B",
  count = 4,
  radius = 14,
  duration = 0.8,
}: {
  cx: number;
  cy: number;
  color?: string;
  count?: number;
  radius?: number;
  duration?: number;
}) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const startAngle = (i / count) * Math.PI * 2;
        return (
          <motion.text
            key={i}
            textAnchor="middle"
            fontSize={8}
            fill={color}
            style={{ pointerEvents: "none" }}
            initial={{
              x: cx + Math.cos(startAngle) * radius,
              y: cy + Math.sin(startAngle) * radius + 3,
              opacity: 1,
            }}
            animate={{
              x: Array.from({ length: 9 }, (_, step) =>
                cx + Math.cos(startAngle + step * 0.8) * radius
              ),
              y: Array.from({ length: 9 }, (_, step) =>
                cy + Math.sin(startAngle + step * 0.8) * radius + 3
              ),
              opacity: [1, 1, 0],
            }}
            transition={{ duration, ease: "linear" }}
          >
            ★
          </motion.text>
        );
      })}
    </g>
  );
}

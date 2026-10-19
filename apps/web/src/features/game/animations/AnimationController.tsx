/**
 * AnimationController — sits inside the SVG board, renders active animation effects.
 * Receives the current animation event and renders the appropriate visual effect.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnimationEvent, Vec2 } from "./types";
import { ParticleBurst, ConfettiRain, PopText, DizzyStars } from "./particles";
import { COLOR_HEX } from "../../../shared/constants";

interface AnimationControllerProps {
  event: AnimationEvent | null;
  onComplete: () => void;
}

const HOME_MESSAGES = [
  "HOME SWEET HOME!",
  "NAILED IT!",
  "ONE DOWN, THREE TO GO!",
  "BOOM! IN!",
  "SO SMOOTH!",
];

const BONK_MESSAGES = ["BONK!", "GOTCHA!", "BACK TO BASE!", "SEE YA!"];

export function AnimationController({ event, onComplete }: AnimationControllerProps) {
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (!event) return;
    setShowOverlay(true);
    // Safety timeout: always complete within 3.5s max
    const safety = setTimeout(onComplete, 3500);
    return () => clearTimeout(safety);
  }, [event, onComplete]);

  if (!event) return null;

  // Get the primary color for the event (varies by event type)
  const eventColor: string =
    "color" in event && event.color
      ? (COLOR_HEX[event.color as keyof typeof COLOR_HEX] ?? "#FFBE0B")
      : "capturerColor" in event
      ? (COLOR_HEX[event.capturerColor] ?? "#FFBE0B")
      : "#FFBE0B";

  switch (event.type) {
    case "token_enter_board":
      return (
        <EnterBoardAnim
          event={event}
          color={eventColor}
          onComplete={() => { setShowOverlay(false); setTimeout(onComplete, 100); }}
        />
      );

    case "token_move":
      return (
        <MoveAnim
          event={event}
          color={eventColor}
          onComplete={() => { setShowOverlay(false); setTimeout(onComplete, 50); }}
        />
      );

    case "token_capture":
      return (
        <CaptureAnim
          event={event}
          onComplete={() => { setShowOverlay(false); setTimeout(onComplete, 100); }}
        />
      );

    case "token_enter_home_lane":
      return (
        <HomeLaneAnim
          event={event}
          color={eventColor}
          onComplete={() => { setShowOverlay(false); setTimeout(onComplete, 100); }}
        />
      );

    case "token_finished":
      return (
        <TokenFinishedAnim
          event={event}
          color={eventColor}
          onComplete={() => { setShowOverlay(false); setTimeout(onComplete, 100); }}
        />
      );

    case "all_tokens_home":
      return (
        <AllTokensHomeAnim
          event={event}
          color={eventColor}
          onComplete={() => { setShowOverlay(false); setTimeout(onComplete, 100); }}
        />
      );

    case "dice_roll":
      // Dice is handled by the Dice component itself; just complete
      return <DiceAnim event={event} onComplete={onComplete} />;

    case "winner":
      // Winner overlay is handled by GameScreen; just complete
      return null;

    default:
      return null;
  }
}

/* ── Enter Board ─────────────────────────────────────────────── */
function EnterBoardAnim({
  event,
  color,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "token_enter_board" }>;
  color: string;
  onComplete: () => void;
}) {
  const [pos, setPos] = useState(event.from);

  useEffect(() => {
    const t = setTimeout(() => setPos(event.to), 50);
    return () => clearTimeout(t);
  }, [event.to]);

  return (
    <g>
      <ParticleBurst cx={pos.x} cy={pos.y} colors={[color, "#fff", "#FFBE0B"]} count={8} spread={40} duration={0.5} onComplete={onComplete} />
      <PopText x={pos.x} y={pos.y - 20} text="POP!" color={color} fontSize={13} duration={0.8} />
      <motion.circle
        cx={event.from.x}
        cy={event.from.y}
        r={10}
        fill={color}
        stroke="white"
        strokeWidth={2}
        animate={{
          cx: [event.from.x, event.to.x, event.to.x, event.to.x],
          cy: [event.from.y, event.from.y - 30, event.to.y, event.to.y],
          r: [10, 13, 10, 10],
        }}
        transition={{ duration: 0.5, times: [0, 0.4, 0.8, 1], ease: "easeOut" }}
      />
    </g>
  );
}

/* ── Normal Move ─────────────────────────────────────────────── */
function MoveAnim({
  event,
  color,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "token_move" }>;
  color: string;
  onComplete: () => void;
}) {
  const path = event.path;
  const stepDuration = Math.min(0.25, 0.8 / Math.max(path.length, 1));

  // Build keyframe arrays for smooth path following
  const xs = path.map(p => p.x);
  const ys = path.map(p => p.y);

  return (
    <g>
      <motion.circle
        cx={path[0].x}
        cy={path[0].y}
        r={11}
        fill={color}
        stroke="white"
        strokeWidth={2.5}
        animate={{ cx: xs, cy: ys }}
        transition={{
          duration: stepDuration * path.length,
          ease: "easeInOut",
          times: path.map((_, i) => i / Math.max(path.length - 1, 1)),
          onComplete,
        }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {/* Trail sparkles */}
      {path.map((p, i) =>
        i > 0 && i < path.length - 1 && i % 2 === 0 ? (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color}
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.4, delay: stepDuration * i }}
          />
        ) : null
      )}
    </g>
  );
}

/* ── Capture ─────────────────────────────────────────────────── */
function CaptureAnim({
  event,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "token_capture" }>;
  onComplete: () => void;
}) {
  const capturedColor = COLOR_HEX[event.capturedColor] ?? "#888";
  const capturerColor = COLOR_HEX[event.capturerColor] ?? "#FFBE0B";
  const bonkMsg = BONK_MESSAGES[Math.floor(Math.random() * BONK_MESSAGES.length)];

  return (
    <g>
      {/* Impact burst at capture point */}
      <ParticleBurst
        cx={event.capturePos.x}
        cy={event.capturePos.y}
        colors={[capturerColor, "#fff", "#FF6B6B", "#FFBE0B"]}
        count={14}
        spread={50}
        duration={0.6}
        shapes={["star", "circle", "square"]}
        onComplete={onComplete}
      />

      {/* BONK! text */}
      <PopText
        x={event.capturePos.x}
        y={event.capturePos.y - 25}
        text={bonkMsg}
        color="#FF6B6B"
        fontSize={18}
        duration={1.2}
      />

      {/* Dizzy stars around captured token position */}
      <DizzyStars
        cx={event.capturePos.x}
        cy={event.capturePos.y}
        color="#FFBE0B"
        duration={0.7}
      />

      {/* Captured token: dizzy spin then fly home */}
      <motion.g
        initial={{ x: event.capturePos.x, y: event.capturePos.y, rotate: 0 }}
        animate={{
          x: [
            event.capturePos.x,
            event.capturePos.x + 10,
            event.capturePos.x - 10,
            event.capturePos.x,
            event.capturedHomePos.x,
          ],
          y: [
            event.capturePos.y,
            event.capturePos.y - 8,
            event.capturePos.y + 5,
            event.capturePos.y,
            event.capturedHomePos.y,
          ],
          rotate: [0, 180, 360, 360, 360],
          scale: [1, 1.2, 0.9, 1, 0.6],
        }}
        transition={{
          duration: 1.4,
          times: [0, 0.15, 0.3, 0.45, 1],
          ease: "easeInOut",
        }}
      >
        <circle r={10} fill={capturedColor} stroke="white" strokeWidth={2} />
        {/* Dizzy face */}
        <text textAnchor="middle" y={4} fontSize={10} style={{ pointerEvents: "none" }}>
          😵
        </text>
      </motion.g>

      {/* Capturer bounce */}
      <motion.circle
        cx={event.capturePos.x}
        cy={event.capturePos.y}
        r={11}
        fill={capturerColor}
        stroke="white"
        strokeWidth={2.5}
        animate={{
          cy: [
            event.capturePos.y,
            event.capturePos.y - 15,
            event.capturePos.y,
          ],
          r: [11, 13, 11],
        }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ filter: `drop-shadow(0 0 6px ${capturerColor})` }}
      />
    </g>
  );
}

/* ── Enter Home Lane ─────────────────────────────────────────── */
function HomeLaneAnim({
  event,
  color,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "token_enter_home_lane" }>;
  color: string;
  onComplete: () => void;
}) {
  return (
    <g>
      <ParticleBurst cx={event.to.x} cy={event.to.y} colors={[color, "#fff"]} count={8} spread={35} duration={0.5} onComplete={onComplete} />
      <PopText x={event.to.x} y={event.to.y - 18} text="HOME LANE!" color={color} fontSize={12} duration={0.9} />
      {/* Glow trail */}
      <motion.circle
        cx={event.from.x}
        cy={event.from.y}
        r={11}
        fill={color}
        stroke="white"
        strokeWidth={2}
        animate={{
          cx: [event.from.x, event.to.x],
          cy: [event.from.y, event.to.y],
          r: [11, 14, 11],
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </g>
  );
}

/* ── Token Finished ──────────────────────────────────────────── */
function TokenFinishedAnim({
  event,
  color,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "token_finished" }>;
  color: string;
  onComplete: () => void;
}) {
  const msg = HOME_MESSAGES[Math.min(event.finishedCount - 1, HOME_MESSAGES.length - 1)];
  return (
    <g>
      <ParticleBurst cx={event.pos.x} cy={event.pos.y} colors={[color, "#fff", "#FFBE0B"]} count={16} spread={60} duration={0.9} onComplete={onComplete} />
      <ConfettiRain cx={event.pos.x} cy={event.pos.y - 20} colors={[color, "#FFBE0B", "#fff"]} count={8} width={60} duration={1} />
      <PopText x={event.pos.x} y={event.pos.y - 25} text={msg} color={color} fontSize={14} duration={1.3} />
      <PopText x={event.pos.x} y={event.pos.y - 42} text={`${event.finishedCount} of 4 home!`} color="#fff" fontSize={10} duration={1.1} delay={0.2} fontWeight="600" />
    </g>
  );
}

/* ── All Four Tokens Home ────────────────────────────────────── */
function AllTokensHomeAnim({
  event,
  color,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "all_tokens_home" }>;
  color: string;
  onComplete: () => void;
}) {
  return (
    <g>
      {/* Big burst */}
      <ParticleBurst cx={event.pos.x} cy={event.pos.y} colors={[color, "#fff", "#FFBE0B", "#E63946"]} count={24} spread={100} duration={1.2} shapes={["star", "circle", "square", "triangle"]} onComplete={onComplete} />
      {/* Glowing ring */}
      <motion.circle
        cx={event.pos.x}
        cy={event.pos.y}
        r={20}
        fill="none"
        stroke={color}
        strokeWidth={3}
        initial={{ r: 15, opacity: 1 }}
        animate={{ r: 60, opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <motion.circle
        cx={event.pos.x}
        cy={event.pos.y}
        r={20}
        fill="none"
        stroke={color}
        strokeWidth={2}
        initial={{ r: 15, opacity: 1 }}
        animate={{ r: 50, opacity: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
      />
      <PopText x={event.pos.x} y={event.pos.y - 30} text="ALL FOUR HOME!" color={color} fontSize={20} duration={1.8} />
      <ConfettiRain cx={event.pos.x} cy={event.pos.y - 50} colors={[color, "#FFBE0B", "#fff", "#2DC653"]} count={20} width={160} duration={2} />
    </g>
  );
}

/* ── Dice Roll ───────────────────────────────────────────────── */
function DiceAnim({
  event,
  onComplete,
}: {
  event: Extract<AnimationEvent, { type: "dice_roll" }>;
  onComplete: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onComplete, event.isSix ? 1200 : 400);
    return () => clearTimeout(t);
  }, [event, onComplete]);

  if (event.isSix) {
    return (
      <g>
        <PopText x={300} y={80} text="SIX!" color="#FFBE0B" fontSize={28} duration={1.2} />
        {event.isExtraTurn && (
          <PopText x={300} y={110} text="EXTRA TURN!" color="#2DC653" fontSize={14} duration={1.2} delay={0.3} />
        )}
      </g>
    );
  }
  return null;
}

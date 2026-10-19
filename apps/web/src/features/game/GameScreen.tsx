import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useGame } from "./GameContext";
import { Board } from "./Board";
import { Dice } from "./Dice";
import { PlayerPanel } from "./PlayerPanel";
import { canRoll, canMove } from "@ludo/game-engine";
import { COLOR_HEX } from "../../shared/constants";
import { detectAnimations } from "./animations/detector";
import { useAnimationQueue } from "./animations/useAnimationQueue";
import { AnimationController } from "./animations/AnimationController";
import { WinnerOverlay } from "./animations/WinnerOverlay";
import { useScreenShake } from "./animations/useScreenShake";

export function GameScreen() {
  const { state, rollDice, moveToken, requestRematch, leaveRoom } = useGame();
  const { game, myPlayerId, disconnectedPlayers, winner, lastRejection } = state;

  const [rolling, setRolling] = useState(false);
  const [showRejection, setShowRejection] = useState(false);
  const prevGameRef = useRef(game);
  const animQueue = useAnimationQueue();
  const shake = useScreenShake();

  // Track tokens currently being animated (hidden from Board)
  const [hiddenTokens, setHiddenTokens] = useState<Set<string>>(new Set());

  const isMyTurn = useMemo(() => {
    if (!game || !myPlayerId) return false;
    return game.players[game.activePlayerIndex]?.id === myPlayerId;
  }, [game, myPlayerId]);

  const canRollNow = useMemo(() => {
    if (!game || !myPlayerId) return false;
    return canRoll(game, myPlayerId);
  }, [game, myPlayerId]);

  const legalTokenIds = useMemo(() => {
    if (!game || !canMove(game, myPlayerId ?? "")) return new Set<string>();
    return new Set(game.legalMoves.map(m => m.tokenId));
  }, [game, myPlayerId]);

  // ── Detect animations on state change ──────────────────────
  useEffect(() => {
    if (!game) {
      prevGameRef.current = game;
      return;
    }
    const prev = prevGameRef.current;
    if (prev && prev !== game) {
      const events = detectAnimations(prev, game, myPlayerId);
      if (events.length > 0) {
        animQueue.enqueue(events);
      }
    }
    prevGameRef.current = game;
  }, [game, myPlayerId, animQueue]);

  // ── Handle current animation event ─────────────────────────
  const currentAnim = animQueue.current;

  useEffect(() => {
    if (!currentAnim) {
      setHiddenTokens(new Set());
      return;
    }

    // Hide tokens involved in the animation
    const hidden = new Set<string>();
    switch (currentAnim.type) {
      case "token_move":
      case "token_enter_board":
      case "token_enter_home_lane":
      case "token_finished":
        hidden.add(currentAnim.tokenId);
        break;
      case "token_capture":
        hidden.add(currentAnim.capturedTokenId);
        break;
    }
    setHiddenTokens(hidden);

    // Screen shake on capture
    if (currentAnim.type === "token_capture") {
      shake("large");
    } else if (currentAnim.type === "all_tokens_home") {
      shake("medium");
    } else if (currentAnim.type === "token_finished") {
      shake("small");
    }
  }, [currentAnim, shake]);

  const handleRoll = () => {
    if (!canRollNow) return;
    setRolling(true);
    rollDice();
    setTimeout(() => setRolling(false), 500);
  };

  useEffect(() => {
    if (!lastRejection) return;
    setShowRejection(true);
    const id = setTimeout(() => setShowRejection(false), 2500);
    return () => clearTimeout(id);
  }, [lastRejection]);

  // Clear animation queue on unmount
  useEffect(() => {
    return () => animQueue.clear();
  }, [animQueue]);

  if (!game) return null;

  const activePlayer = game.players[game.activePlayerIndex];
  const activePlayerName = activePlayer?.name ?? "";
  const showWinnerOverlay = game.phase === "finished" && winner !== null;

  return (
    <div id="game-root" className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-4 p-4 relative">
      {/* Board */}
      <div className="flex-shrink-0 w-full max-w-[580px] mx-auto lg:mx-0 relative">
        <Board
          game={game}
          myPlayerId={myPlayerId}
          onTokenClick={moveToken}
          legalTokenIds={legalTokenIds}
          hiddenTokens={hiddenTokens}
          animationLayer={
            <AnimationController
              event={currentAnim}
              onComplete={animQueue.onComplete}
            />
          }
        />

        {/* Skip animation button */}
        {currentAnim && animQueue.queueLength >= 0 && (
          <button
            onClick={animQueue.skip}
            className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/40 text-white/70 text-xs hover:bg-black/60 hover:text-white transition z-10"
          >
            Skip ▸
          </button>
        )}
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-3 w-full max-w-xs lg:pt-2 mx-auto lg:mx-0">
        {/* Turn indicator */}
        <div className="text-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          {game.phase === "finished" ? (
            <div className="font-display text-xl" style={{ color: winner ? COLOR_HEX[winner] : "#FFBE0B" }}>
              🎉 Game Over
            </div>
          ) : isMyTurn ? (
            <div className="font-bold text-yellow-300 text-lg">Your turn!</div>
          ) : (
            <div className="text-sm text-white/60">
              Waiting for <strong className="text-white">{activePlayerName}</strong>…
            </div>
          )}
        </div>

        {/* Players */}
        <PlayerPanel
          players={game.players}
          activePlayerIndex={game.activePlayerIndex}
          myPlayerId={myPlayerId}
          disconnectedPlayers={disconnectedPlayers}
        />

        {/* Dice */}
        <div className="flex justify-center py-1">
          <Dice
            value={game.dice.value}
            rolling={rolling}
            canRoll={canRollNow && game.phase !== "finished"}
            onRoll={handleRoll}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* Hint */}
        {game.phase !== "finished" && isMyTurn && !canRollNow && legalTokenIds.size > 0 && (
          <p className="text-center text-sm text-yellow-300 animate-pulse">
            Click a highlighted token to move
          </p>
        )}
        {game.phase !== "finished" && isMyTurn && canRollNow && (
          <p className="text-center text-sm text-white/50">
            Click the dice to roll
          </p>
        )}
        {game.phase !== "finished" && isMyTurn && !canRollNow && legalTokenIds.size === 0 && game.dice.used && (
          <p className="text-center text-sm text-white/30 italic">
            No moves available — turn passes
          </p>
        )}

        {/* Rejection toast */}
        <AnimatePresence>
          {showRejection && (
            <div className="px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm text-center">
              {lastRejection}
            </div>
          )}
        </AnimatePresence>

        {/* Turn counter */}
        <div className="text-center text-white/25 text-xs">
          Turn {game.turnNumber}
        </div>

        {/* Leave (mid-game) */}
        {game.phase !== "finished" && (
          <button
            onClick={leaveRoom}
            className="w-full py-2 rounded-xl bg-transparent text-white/25 font-bold text-xs hover:text-white/50 transition"
          >
            Leave Game
          </button>
        )}
      </div>

      {/* Winner / Loser overlay */}
      <AnimatePresence>
        {showWinnerOverlay && (
          <WinnerOverlay
            game={game}
            winner={winner!}
            myPlayerId={myPlayerId}
            onRematch={requestRematch}
            onLeave={leaveRoom}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

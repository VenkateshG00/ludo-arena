import React, { useMemo, useState, useEffect } from "react";
import { useGame } from "./GameContext";
import { Board } from "./Board";
import { Dice } from "./Dice";
import { PlayerPanel } from "./PlayerPanel";
import { canRoll, canMove } from "@ludo/game-engine";

export function GameScreen() {
  const { state, rollDice, moveToken, requestRematch, leaveRoom } = useGame();
  const { game, myPlayerId, disconnectedPlayers, winner, lastRejection } = state;

  const [rolling, setRolling] = useState(false);
  const [showRejection, setShowRejection] = useState(false);

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

  if (!game) return null;

  const activePlayer = game.players[game.activePlayerIndex];
  const activePlayerName = activePlayer?.name ?? "";

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-4 p-4 min-h-screen bg-ludo-dark">
      {/* Board */}
      <div className="flex-shrink-0 w-full max-w-[580px]">
        <Board
          game={game}
          myPlayerId={myPlayerId}
          onTokenClick={moveToken}
          legalTokenIds={legalTokenIds}
        />
      </div>

      {/* Side panel */}
      <div className="flex flex-col gap-4 w-full max-w-xs lg:pt-2">
        {/* Turn indicator */}
        <div className="text-center">
          {game.phase === "finished" ? (
            <div className="font-display text-2xl text-yellow-400">
              🎉 {winner?.toUpperCase()} WINS!
            </div>
          ) : (
            <div className="text-sm text-white/70">
              {isMyTurn ? (
                <span className="font-bold text-yellow-300 text-base">Your turn!</span>
              ) : (
                <span>Waiting for <strong>{activePlayerName}</strong>…</span>
              )}
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
        <div className="flex justify-center">
          <Dice
            value={game.dice.value}
            rolling={rolling}
            canRoll={canRollNow}
            onRoll={handleRoll}
          />
        </div>

        {/* Hint */}
        {isMyTurn && !canRollNow && legalTokenIds.size > 0 && (
          <p className="text-center text-sm text-yellow-300 animate-pulse">
            Click a highlighted token to move
          </p>
        )}
        {isMyTurn && canRollNow && (
          <p className="text-center text-sm text-white/60">
            Click the dice to roll
          </p>
        )}

        {/* Rejection toast */}
        {showRejection && (
          <div className="px-3 py-2 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm text-center">
            {lastRejection}
          </div>
        )}

        {/* Turn number */}
        <div className="text-center text-white/30 text-xs">
          Turn {game.turnNumber}
        </div>

        {/* Rematch / Leave */}
        {game.phase === "finished" && (
          <div className="flex gap-2">
            <button
              onClick={requestRematch}
              className="flex-1 py-2 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition"
            >
              Rematch
            </button>
            <button
              onClick={leaveRoom}
              className="flex-1 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition"
            >
              Leave
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

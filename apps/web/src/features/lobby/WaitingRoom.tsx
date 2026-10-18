import React, { useState } from "react";
import { useGame } from "../game/GameContext";

const COLOR_HEX: Record<string, string> = {
  red: "#E63946", green: "#2DC653", yellow: "#FFBE0B", blue: "#4361EE",
};

export function WaitingRoom() {
  const { state, setReady, startGame, leaveRoom } = useGame();
  const { roomInfo, myPlayerId } = state;
  const [copied, setCopied] = useState(false);

  if (!roomInfo) return null;

  const me = roomInfo.players.find(p => p.id === myPlayerId);
  const isHost = roomInfo.hostId === myPlayerId;
  const allReady = roomInfo.players.length >= 2 && roomInfo.players.every(p => p.ready);
  const roomLink = `${window.location.origin}?room=${roomInfo.roomCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      const el = document.getElementById("room-code-text");
      if (el) {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ludo-dark px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl text-yellow-400">Waiting Room</h1>
          <p className="text-white/50 text-sm mt-1">Share the code with friends to join</p>
        </div>

        {/* Room code */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 text-sm">Room Code</span>
            <button
              onClick={copyLink}
              className="text-xs text-yellow-400 hover:text-yellow-300 font-bold transition"
            >
              {copied ? "✓ Copied!" : "Copy invite link"}
            </button>
          </div>
          <div
            id="room-code-text"
            className="font-mono font-bold text-4xl text-yellow-400 tracking-[0.3em] text-center py-2 select-all"
            title="Room code"
          >
            {roomInfo.roomCode}
          </div>
        </div>

        {/* Players */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70 text-sm font-bold">Players ({roomInfo.players.length}/4)</span>
            <span className="text-white/30 text-xs">Need at least 2 to start</span>
          </div>
          <div className="flex flex-col gap-2">
            {roomInfo.players.map(player => (
              <div key={player.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: COLOR_HEX[player.color] }}
                />
                <span className="font-bold flex-1">
                  {player.name}
                  {player.id === myPlayerId && <span className="text-white/40 text-xs font-normal ml-1">(you)</span>}
                  {player.id === roomInfo.hostId && <span className="text-yellow-400 text-xs ml-1">👑</span>}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${player.ready ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>
                  {player.ready ? "Ready" : "Not ready"}
                </span>
              </div>
            ))}
            {/* Empty seats */}
            {Array.from({ length: 4 - roomInfo.players.length }, (_, i) => (
              <div key={`empty_${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 opacity-30">
                <div className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                <span className="text-white/40 text-sm">Waiting for player…</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {me && !me.ready && (
            <button
              onClick={() => setReady(true)}
              className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-400 transition active:scale-95"
            >
              Ready!
            </button>
          )}
          {me?.ready && (
            <button
              onClick={() => setReady(false)}
              className="w-full py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition"
            >
              Not Ready
            </button>
          )}
          {isHost && allReady && (
            <button
              onClick={startGame}
              className="w-full py-3 rounded-xl bg-yellow-400 text-ludo-dark font-bold text-lg hover:bg-yellow-300 transition active:scale-95"
            >
              Start Game!
            </button>
          )}
          {isHost && !allReady && roomInfo.players.length >= 2 && (
            <p className="text-center text-white/40 text-sm py-2">
              Waiting for all players to ready up…
            </p>
          )}
          <button
            onClick={leaveRoom}
            className="w-full py-2 rounded-xl bg-transparent text-white/40 font-bold text-sm hover:text-white/70 transition"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}

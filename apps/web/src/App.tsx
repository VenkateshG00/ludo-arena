import React, { useEffect, useState } from "react";
import { GameProvider, useGame } from "./features/game/GameContext";
import { LandingScreen } from "./features/lobby/LandingScreen";
import { WaitingRoom } from "./features/lobby/WaitingRoom";
import { GameScreen } from "./features/game/GameScreen";
import { StatsPage } from "./features/profile/StatsPage";

function AppInner() {
  const { state, joinRoom } = useGame();
  const { phase } = state;
  const [showStats, setShowStats] = useState(false);

  // Handle invite link: ?room=XXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");
    if (roomCode && phase === "idle") {
      // Pre-fill join — user still needs to enter their name
      // Store the code so LandingScreen can pick it up if needed
      sessionStorage.setItem("pendingRoomCode", roomCode.toUpperCase());
    }
  }, [phase]);

  if (showStats) {
    return <StatsPage onBack={() => setShowStats(false)} />;
  }

  if (phase === "idle" || phase === "error") {
    return <LandingScreen onShowStats={() => setShowStats(true)} />;
  }

  if (phase === "connecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ludo-dark">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🎲</div>
          <p className="text-white/60">Connecting…</p>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return <WaitingRoom />;
  }

  if (phase === "playing" || phase === "finished") {
    return <GameScreen />;
  }

  return null;
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}

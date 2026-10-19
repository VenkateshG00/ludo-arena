import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { GameProvider, useGame } from "./features/game/GameContext";
import { AuthProvider } from "./features/auth/AuthContext";
import { Layout } from "./components/Layout";
import { LandingScreen } from "./features/lobby/LandingScreen";
import { WaitingRoom } from "./features/lobby/WaitingRoom";
import { GameScreen } from "./features/game/GameScreen";
import { StatsPage } from "./features/profile/StatsPage";
import { RulesPage } from "./features/rules/RulesPage";
import { AdminPage } from "./features/admin/AdminPage";
import { NotFound } from "./features/errors/NotFound";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { ProfilePage } from "./features/auth/ProfilePage";
import { DashboardPage } from "./features/auth/DashboardPage";

function PlayRoute() {
  const { state } = useGame();
  const { phase } = state;
  const navigate = useNavigate();

  useEffect(() => {
    if (phase === "idle") {
      navigate("/", { replace: true });
    }
  }, [phase, navigate]);

  if (phase === "connecting") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-spin">🎲</div>
          <p className="text-white/60 text-lg">Connecting…</p>
        </div>
      </div>
    );
  }

  if (phase === "lobby") return <WaitingRoom />;
  if (phase === "playing" || phase === "finished") return <GameScreen />;

  return null;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/play" element={<PlayRoute />} />
        <Route path="/leaderboard" element={<StatsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}

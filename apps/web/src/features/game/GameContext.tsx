import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from "react";
import { clientReducer, initialClientState, type ClientState, type Action } from "./store";
import { GameSocket, apiCreateRoom, apiJoinRoom, type ServerMsg } from "../../services/socket";
import { supabase } from "../../services/supabase";

interface GameContextValue {
  state: ClientState;
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomCode: string, playerName: string) => Promise<void>;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  rollDice: () => void;
  moveToken: (tokenId: string) => void;
  requestRematch: () => void;
  leaveRoom: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const CRED_KEY = "ludo_arena_credentials";

interface StoredCreds {
  roomId: string;
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

function saveCreds(creds: StoredCreds) {
  try { sessionStorage.setItem(CRED_KEY, JSON.stringify(creds)); } catch { /* private mode */ }
}

function loadCreds(): StoredCreds | null {
  try {
    const raw = sessionStorage.getItem(CRED_KEY);
    return raw ? JSON.parse(raw) as StoredCreds : null;
  } catch { return null; }
}

function clearCreds() {
  try { sessionStorage.removeItem(CRED_KEY); } catch { /* private mode */ }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(clientReducer, initialClientState);
  const socketRef = useRef<GameSocket | null>(null);

  const handleServerMsg = useCallback((msg: ServerMsg) => {
    switch (msg.type) {
      case "room_updated":
        dispatch({
          type: "ROOM_UPDATED",
          roomInfo: {
            roomId: msg.roomId,
            roomCode: msg.roomCode,
            hostId: msg.hostId,
            phase: msg.phase,
            players: msg.players,
          },
          phase: msg.phase,
        });
        break;
      case "game_started":
        dispatch({ type: "GAME_STARTED", game: msg.state });
        break;
      case "dice_rolled":
      case "move_applied":
      case "turn_changed":
      case "state_snapshot":
        dispatch({ type: "GAME_STATE", game: msg.state });
        break;
      case "game_finished":
        dispatch({ type: "GAME_FINISHED", game: msg.state, winner: msg.winner });
        break;
      case "player_disconnected":
        dispatch({ type: "PLAYER_DISCONNECTED", playerId: msg.playerId });
        break;
      case "player_reconnected":
        dispatch({ type: "PLAYER_RECONNECTED", playerId: msg.playerId });
        break;
      case "action_rejected":
        dispatch({ type: "ACTION_REJECTED", reason: msg.reason });
        break;
    }
  }, []);

  const connectSocket = useCallback(async (roomCode: string, playerId: string, reconnectToken: string) => {
    const socket = new GameSocket(roomCode, playerId, reconnectToken);
    socketRef.current = socket;
    const off = socket.on(handleServerMsg);
    dispatch({ type: "SET_CONNECTING" });
    await socket.connect();
    dispatch({ type: "SET_WS_CONNECTED" });
    return off;
  }, [handleServerMsg]);

  const createRoom = useCallback(async (playerName: string) => {
    try {
      dispatch({ type: "SET_CONNECTING" });
      const userId = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
      const data = await apiCreateRoom(playerName, userId);
      dispatch({ type: "SET_CREDENTIALS", playerId: data.playerId, reconnectToken: data.reconnectToken });
      saveCreds({ roomId: data.roomId, roomCode: data.roomCode, playerId: data.playerId, reconnectToken: data.reconnectToken });
      await connectSocket(data.roomCode, data.playerId, data.reconnectToken);
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: (e as Error).message });
    }
  }, [connectSocket]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    try {
      dispatch({ type: "SET_CONNECTING" });
      const userId = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
      const data = await apiJoinRoom(roomCode, playerName, userId);
      dispatch({ type: "SET_CREDENTIALS", playerId: data.playerId, reconnectToken: data.reconnectToken });
      saveCreds({ roomId: data.roomId, roomCode: data.roomCode, playerId: data.playerId, reconnectToken: data.reconnectToken });
      await connectSocket(data.roomCode, data.playerId, data.reconnectToken);
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: (e as Error).message });
    }
  }, [connectSocket]);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.send({ type: "set_ready", ready });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.send({ type: "start_game" });
  }, []);

  const rollDice = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.send({ type: "roll_dice", actionSeq: socket.nextSeq() });
  }, []);

  const moveToken = useCallback((tokenId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.send({ type: "move_token", tokenId, actionSeq: socket.nextSeq() });
  }, []);

  const requestRematch = useCallback(() => {
    socketRef.current?.send({ type: "rematch" });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.send({ type: "leave_room" });
    socketRef.current?.disconnect();
    socketRef.current = null;
    clearCreds();
    dispatch({ type: "RESET" });
  }, []);

  // Auto-reconnect on mount if stored credentials exist
  useEffect(() => {
    const creds = loadCreds();
    if (!creds) return;
    dispatch({ type: "SET_CREDENTIALS", playerId: creds.playerId, reconnectToken: creds.reconnectToken });
    dispatch({ type: "SET_CONNECTING" });
    connectSocket(creds.roomCode, creds.playerId, creds.reconnectToken)
      .then(() => {
        // Request current state after reconnect
        socketRef.current?.send({ type: "request_state" });
      })
      .catch(() => {
        clearCreds();
        dispatch({ type: "RESET" });
      });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connectSocket]);

  return (
    <GameContext.Provider value={{ state, createRoom, joinRoom, setReady, startGame, rollDice, moveToken, requestRematch, leaveRoom }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

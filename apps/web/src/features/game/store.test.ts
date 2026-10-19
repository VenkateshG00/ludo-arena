import { describe, it, expect } from "vitest";
import { clientReducer, initialClientState, type Action } from "./store";
import type { GameState, PlayerColor } from "@ludo/game-engine";

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    roomId: "r1",
    phase: "playing",
    players: [
      {
        id: "p1", color: "red", seatIndex: 0, name: "A", connected: true,
        tokens: Array.from({ length: 4 }, (_, i) => ({
          id: `red_${i}`, color: "red" as PlayerColor, index: i,
          status: "base" as const, trackPos: -1,
        })),
      },
      {
        id: "p2", color: "green", seatIndex: 1, name: "B", connected: true,
        tokens: Array.from({ length: 4 }, (_, i) => ({
          id: `green_${i}`, color: "green" as PlayerColor, index: i,
          status: "base" as const, trackPos: -1,
        })),
      },
    ],
    activePlayerIndex: 0,
    dice: { value: null, rolledAt: null, rollCount: 0, used: false },
    legalMoves: [],
    turnNumber: 1,
    winner: null,
    config: { playerCount: 2, blockRule: false, captureBonus: false, threeConsecSixes: "skip" },
    actionSeq: 0,
    ...overrides,
  };
}

describe("clientReducer", () => {
  it("SET_CREDENTIALS stores playerId and reconnectToken", () => {
    const state = clientReducer(initialClientState, {
      type: "SET_CREDENTIALS",
      playerId: "p1",
      reconnectToken: "tok",
    });
    expect(state.myPlayerId).toBe("p1");
    expect(state.myReconnectToken).toBe("tok");
  });

  it("ROOM_UPDATED with server phase=playing keeps playing phase", () => {
    const playingState = clientReducer(initialClientState, {
      type: "GAME_STARTED",
      game: makeGameState(),
    });
    expect(playingState.phase).toBe("playing");

    const next = clientReducer(playingState, {
      type: "ROOM_UPDATED",
      roomInfo: {
        roomId: "r1", roomCode: "ABCDEF", hostId: "p1",
        phase: "playing",
        players: [
          { id: "p1", name: "A", color: "red", seatIndex: 0, connected: true, ready: true },
          { id: "p2", name: "B", color: "green", seatIndex: 1, connected: true, ready: true },
        ],
      },
      phase: "playing",
    });
    // Regression: must NOT flip back to lobby mid-game
    expect(next.phase).toBe("playing");
  });

  it("ROOM_UPDATED with server phase=waiting goes to lobby", () => {
    const next = clientReducer(initialClientState, {
      type: "ROOM_UPDATED",
      roomInfo: {
        roomId: "r1", roomCode: "ABCDEF", hostId: "p1",
        phase: "waiting",
        players: [
          { id: "p1", name: "A", color: "red", seatIndex: 0, connected: true, ready: false },
        ],
      },
      phase: "waiting",
    });
    expect(next.phase).toBe("lobby");
  });

  it("GAME_STARTED sets phase to playing", () => {
    const state = clientReducer(initialClientState, {
      type: "GAME_STARTED",
      game: makeGameState(),
    });
    expect(state.phase).toBe("playing");
    expect(state.game).not.toBeNull();
  });

  it("GAME_FINISHED sets phase to finished and records winner", () => {
    const playingState = clientReducer(initialClientState, {
      type: "GAME_STARTED",
      game: makeGameState(),
    });
    const finishedState = clientReducer(playingState, {
      type: "GAME_FINISHED",
      game: makeGameState({ phase: "finished", winner: "red" }),
      winner: "red",
    });
    expect(finishedState.phase).toBe("finished");
    expect(finishedState.winner).toBe("red");
  });

  it("PLAYER_DISCONNECTED adds to disconnectedPlayers", () => {
    const state = clientReducer(initialClientState, {
      type: "PLAYER_DISCONNECTED",
      playerId: "p2",
    });
    expect(state.disconnectedPlayers.has("p2")).toBe(true);
  });

  it("PLAYER_RECONNECTED removes from disconnectedPlayers", () => {
    let state = clientReducer(initialClientState, {
      type: "PLAYER_DISCONNECTED",
      playerId: "p2",
    });
    state = clientReducer(state, {
      type: "PLAYER_RECONNECTED",
      playerId: "p2",
    });
    expect(state.disconnectedPlayers.has("p2")).toBe(false);
  });

  it("RESET returns to initial state", () => {
    let state = clientReducer(initialClientState, {
      type: "SET_CREDENTIALS",
      playerId: "p1",
      reconnectToken: "tok",
    });
    state = clientReducer(state, { type: "RESET" });
    expect(state.myPlayerId).toBeNull();
    expect(state.phase).toBe("idle");
  });

  it("GAME_STATE updates game without changing phase", () => {
    const playingState = clientReducer(initialClientState, {
      type: "GAME_STARTED",
      game: makeGameState(),
    });
    const updated = clientReducer(playingState, {
      type: "GAME_STATE",
      game: makeGameState({ turnNumber: 5 }),
    });
    expect(updated.phase).toBe("playing");
    expect(updated.game?.turnNumber).toBe(5);
  });
});

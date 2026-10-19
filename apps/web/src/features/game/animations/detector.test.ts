import { describe, it, expect } from "vitest";
import { detectAnimations } from "./detector";
import type { GameState, Player, Token } from "@ludo/game-engine";
import { createInitialState, applyRoll, applyMove, computeLegalMoves } from "@ludo/game-engine";

function makeToken(id: string, color: Token["color"], index: number, status: Token["status"], trackPos: number): Token {
  return { id, color, index, status, trackPos };
}

function makePlayer(id: string, color: Player["color"], seatIndex: number, tokens: Token[]): Player {
  return { id, color, seatIndex, name: id, connected: true, tokens };
}

function makeState(overrides: Partial<GameState>): GameState {
  return {
    roomId: "test",
    phase: "playing",
    players: [],
    activePlayerIndex: 0,
    dice: { value: null, rolledAt: null, rollCount: 0, used: false },
    legalMoves: [],
    turnNumber: 1,
    winner: null,
    config: { playerCount: 2, blockRule: true, captureBonus: true, threeConsecSixes: "skip" },
    actionSeq: 0,
    ...overrides,
  };
}

describe("detectAnimations", () => {
  it("returns empty array for identical states", () => {
    const state = makeState({
      players: [
        makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "base", -1)]),
        makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "base", -1)]),
      ],
    });
    const events = detectAnimations(state, { ...state }, "p1");
    expect(events).toHaveLength(0);
  });

  it("detects dice roll", () => {
    const prev = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "base", -1)])],
    });
    const next = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "base", -1)])],
      dice: { value: 6, rolledAt: Date.now(), rollCount: 1, used: false },
    });
    const events = detectAnimations(prev, next, "p1");
    const diceEvent = events.find(e => e.type === "dice_roll");
    expect(diceEvent).toBeDefined();
    if (diceEvent?.type === "dice_roll") {
      expect(diceEvent.value).toBe(6);
      expect(diceEvent.isSix).toBe(true);
    }
  });

  it("detects token leaving base", () => {
    const prev = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "base", -1)])],
    });
    const next = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 0)])],
    });
    const events = detectAnimations(prev, next, "p1");
    const enterEvent = events.find(e => e.type === "token_enter_board");
    expect(enterEvent).toBeDefined();
  });

  it("detects normal track movement", () => {
    const prev = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 0)])],
    });
    const next = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 5)])],
    });
    const events = detectAnimations(prev, next, "p1");
    const moveEvent = events.find(e => e.type === "token_move");
    expect(moveEvent).toBeDefined();
    if (moveEvent?.type === "token_move") {
      expect(moveEvent.path.length).toBeGreaterThan(1);
    }
  });

  it("detects capture (token sent back to base)", () => {
    const prev = makeState({
      players: [
        makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 5)]),
        makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "track", 5)]),
      ],
    });
    const next = makeState({
      players: [
        makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 5)]),
        makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "base", -1)]),
      ],
    });
    const events = detectAnimations(prev, next, "p1");
    const captureEvent = events.find(e => e.type === "token_capture");
    expect(captureEvent).toBeDefined();
    if (captureEvent?.type === "token_capture") {
      expect(captureEvent.capturedTokenId).toBe("blue_0");
      expect(captureEvent.capturedColor).toBe("blue");
    }
  });

  it("detects token entering home lane", () => {
    const prev = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 50)])],
    });
    const next = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "home_lane", 0)])],
    });
    const events = detectAnimations(prev, next, "p1");
    const laneEvent = events.find(e => e.type === "token_enter_home_lane");
    expect(laneEvent).toBeDefined();
  });

  it("detects token finishing with correct count", () => {
    const prev = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "home_lane", 5)])],
    });
    const next = makeState({
      players: [makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "finished", -1)])],
    });
    const events = detectAnimations(prev, next, "p1");
    const finishEvent = events.find(e => e.type === "token_finished");
    expect(finishEvent).toBeDefined();
    if (finishEvent?.type === "token_finished") {
      expect(finishEvent.finishedCount).toBe(1);
    }
  });

  it("detects all four tokens home", () => {
    const prev = makeState({
      players: [
        makePlayer("p1", "red", 0, [
          makeToken("red_0", "red", 0, "finished", -1),
          makeToken("red_1", "red", 1, "finished", -1),
          makeToken("red_2", "red", 2, "finished", -1),
          makeToken("red_3", "red", 3, "home_lane", 5),
        ]),
      ],
    });
    const next = makeState({
      players: [
        makePlayer("p1", "red", 0, [
          makeToken("red_0", "red", 0, "finished", -1),
          makeToken("red_1", "red", 1, "finished", -1),
          makeToken("red_2", "red", 2, "finished", -1),
          makeToken("red_3", "red", 3, "finished", -1),
        ]),
      ],
    });
    const events = detectAnimations(prev, next, "p1");
    const allHomeEvent = events.find(e => e.type === "all_tokens_home");
    expect(allHomeEvent).toBeDefined();
  });

  it("detects winner on game finish", () => {
    const players = [
      makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "finished", -1)]),
      makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "base", -1)]),
    ];
    const prev = makeState({ phase: "playing", players });
    const next = makeState({ phase: "finished", winner: "red", players });
    const events = detectAnimations(prev, next, "p1");
    const winnerEvent = events.find(e => e.type === "winner");
    expect(winnerEvent).toBeDefined();
    if (winnerEvent?.type === "winner") {
      expect(winnerEvent.color).toBe("red");
      expect(winnerEvent.isMe).toBe(true);
    }
  });

  it("does not detect winner for non-winner", () => {
    const players = [
      makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "base", -1)]),
      makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "finished", -1)]),
    ];
    const prev = makeState({ phase: "playing", players });
    const next = makeState({ phase: "finished", winner: "blue", players });
    const events = detectAnimations(prev, next, "p1");
    const winnerEvent = events.find(e => e.type === "winner");
    expect(winnerEvent).toBeDefined();
    if (winnerEvent?.type === "winner") {
      expect(winnerEvent.isMe).toBe(false);
    }
  });

  it("generates unique event ids", () => {
    const prev = makeState({
      players: [
        makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 0)]),
        makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "track", 0)]),
      ],
    });
    const next = makeState({
      players: [
        makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 3)]),
        makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "base", -1)]),
      ],
    });
    const events1 = detectAnimations(prev, next, "p1");
    const events2 = detectAnimations(prev, next, "p1");
    const ids1 = new Set(events1.map(e => e.id));
    const ids2 = new Set(events2.map(e => e.id));
    // Same events should have different ids (unique per call)
    expect(ids1.size).toBe(events1.length);
    expect(ids2.size).toBe(events2.length);
  });

  it("handles reconnection snapshot without false animations", () => {
    const state = makeState({
      players: [
        makePlayer("p1", "red", 0, [makeToken("red_0", "red", 0, "track", 10)]),
        makePlayer("p2", "blue", 1, [makeToken("blue_0", "blue", 0, "track", 20)]),
      ],
    });
    // Same state re-sent (reconnect snapshot)
    const events = detectAnimations(state, { ...state }, "p1");
    expect(events).toHaveLength(0);
  });
});

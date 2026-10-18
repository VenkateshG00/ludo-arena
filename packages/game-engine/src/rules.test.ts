import { describe, it, expect } from "vitest";
import {
  createInitialState,
  applyRoll,
  applyMove,
  advanceTurn,
  canRoll,
  canMove,
  checkWin,
  computeLegalMoves,
} from "./rules";
import type { GameState, Player } from "./types";

// Helpers
function twoPlayerState(): GameState {
  return createInitialState("room1", [
    { id: "p1", name: "Alice", seatIndex: 0 },
    { id: "p2", name: "Bob", seatIndex: 1 },
  ]);
}

function playerById(state: GameState, id: string): Player {
  return state.players.find(p => p.id === id)!;
}

// ── Initial state ─────────────────────────────────────────────────────────────

describe("createInitialState", () => {
  it("creates correct player count", () => {
    const s = twoPlayerState();
    expect(s.players).toHaveLength(2);
  });

  it("assigns correct colors to seat indices", () => {
    const s = twoPlayerState();
    expect(s.players[0].color).toBe("red");
    expect(s.players[1].color).toBe("green");
  });

  it("all tokens start in base", () => {
    const s = twoPlayerState();
    for (const p of s.players) {
      for (const t of p.tokens) {
        expect(t.status).toBe("base");
        expect(t.trackPos).toBe(-1);
      }
    }
  });

  it("sets phase to playing", () => {
    expect(twoPlayerState().phase).toBe("playing");
  });

  it("starts at player index 0", () => {
    expect(twoPlayerState().activePlayerIndex).toBe(0);
  });
});

// ── Dice ─────────────────────────────────────────────────────────────────────

describe("applyRoll", () => {
  it("sets dice value when there are legal moves", () => {
    // Put a token on track so rolling 4 produces legal moves
    let s = twoPlayerState();
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, tokens: p.tokens.map((t, j) => j === 0 ? { ...t, status: "track" as const, trackPos: 5 } : t) }
          : p
      ),
    };
    const next = applyRoll(s, 4, 1);
    expect(next.dice.value).toBe(4);
  });

  it("auto-advances when no legal moves (rolling 4 from base)", () => {
    // All tokens in base, rolling 4 = no moves → turn advances, dice resets
    const s = applyRoll(twoPlayerState(), 4, 1);
    expect(s.activePlayerIndex).toBe(1);
    expect(s.dice.value).toBeNull();
  });

  it("does not change state if already rolled and unused (has legal moves)", () => {
    let s = twoPlayerState();
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, tokens: p.tokens.map((t, j) => j === 0 ? { ...t, status: "track" as const, trackPos: 5 } : t) }
          : p
      ),
    };
    s = applyRoll(s, 3, 1);
    expect(s.dice.value).toBe(3);
    const again = applyRoll(s, 5, 2);
    expect(again.dice.value).toBe(3); // unchanged — already rolled
  });

  it("rejects value out of range", () => {
    const s = twoPlayerState();
    expect(applyRoll(s, 7, 1).dice.value).toBeNull();
    expect(applyRoll(s, 0, 1).dice.value).toBeNull();
  });

  it("six increments rollCount", () => {
    const s = applyRoll(twoPlayerState(), 6, 1);
    expect(s.dice.rollCount).toBe(1);
  });

  it("non-six resets rollCount to 0", () => {
    let s = applyRoll(twoPlayerState(), 6, 1);
    // must move a token first to clear the dice
    // For this test, force dice used
    s = { ...s, dice: { ...s.dice, used: true } };
    s = applyRoll(s, 3, 2);
    expect(s.dice.rollCount).toBe(0);
  });

  it("three consecutive sixes skips turn", () => {
    let s = twoPlayerState();
    // Force rollCount to 2
    s = { ...s, dice: { value: null, rolledAt: null, rollCount: 2, used: true } };
    s = applyRoll(s, 6, 1);
    // Should advance turn (activePlayerIndex changes)
    expect(s.activePlayerIndex).toBe(1);
  });

  it("auto-advances turn when no legal moves and not a 6", () => {
    const s = applyRoll(twoPlayerState(), 3, 1);
    // All tokens in base, rolled 3 = no moves possible → turn advances
    expect(s.activePlayerIndex).toBe(1);
  });

  it("does NOT auto-advance on a 6 even with no moves (grants re-roll)", () => {
    const s = applyRoll(twoPlayerState(), 6, 1);
    expect(s.activePlayerIndex).toBe(0);
    expect(s.legalMoves.length).toBeGreaterThan(0); // can enter from base
  });
});

// ── Legal move computation ────────────────────────────────────────────────────

describe("computeLegalMoves", () => {
  it("rolling 6 allows base-token to enter track", () => {
    const s = twoPlayerState();
    const player = s.players[0];
    const moves = computeLegalMoves(player, s.players, 6);
    const baseMoves = moves.filter(m => m.fromStatus === "base");
    expect(baseMoves.length).toBeGreaterThan(0);
  });

  it("rolling non-6 gives no moves when all tokens are in base", () => {
    const s = twoPlayerState();
    const player = s.players[0];
    const moves = computeLegalMoves(player, s.players, 4);
    expect(moves).toHaveLength(0);
  });

  it("token on track has a move matching dice value", () => {
    // Put a token on track pos 5
    const s = twoPlayerState();
    const player: Player = {
      ...s.players[0],
      tokens: s.players[0].tokens.map((t, i) =>
        i === 0 ? { ...t, status: "track", trackPos: 5 } : t
      ),
    };
    const moves = computeLegalMoves(player, [player, s.players[1]], 3);
    expect(moves.some(m => m.tokenId === player.tokens[0].id && m.toPos === 8)).toBe(true);
  });

  it("token cannot overshoot home lane finish", () => {
    // Token in home lane pos 4, needs exact 1 to finish
    const s = twoPlayerState();
    const player: Player = {
      ...s.players[0],
      tokens: s.players[0].tokens.map((t, i) =>
        i === 0 ? { ...t, status: "home_lane", trackPos: 4 } : t
      ),
    };
    const movesWithTwo = computeLegalMoves(player, [player, s.players[1]], 2);
    expect(movesWithTwo.some(m => m.tokenId === player.tokens[0].id)).toBe(false);
    const movesWithOne = computeLegalMoves(player, [player, s.players[1]], 1);
    expect(movesWithOne.some(m => m.tokenId === player.tokens[0].id && m.toStatus === "finished")).toBe(true);
  });
});

// ── Apply move ────────────────────────────────────────────────────────────────

describe("applyMove", () => {
  it("moves token from base to track on 6", () => {
    let s = twoPlayerState();
    s = applyRoll(s, 6, 1);
    const tokenId = s.legalMoves[0].tokenId;
    s = applyMove(s, tokenId, 2);
    const token = s.players[0].tokens.find(t => t.id === tokenId)!;
    expect(token.status).toBe("track");
    expect(token.trackPos).toBe(0);
  });

  it("grants extra roll after using a 6", () => {
    let s = twoPlayerState();
    s = applyRoll(s, 6, 1);
    const tokenId = s.legalMoves[0].tokenId;
    s = applyMove(s, tokenId, 2);
    // still p1's turn (extra roll)
    expect(s.activePlayerIndex).toBe(0);
    expect(s.dice.value).toBeNull();
    expect(s.dice.used).toBe(false);
  });

  it("captures opponent token on same non-safe square", () => {
    let s = twoPlayerState();
    // Red token on track pos 10 (not safe)
    // Green token at the square red will land on
    const redPlayer: Player = {
      ...s.players[0],
      tokens: s.players[0].tokens.map((t, i) =>
        i === 0 ? { ...t, status: "track", trackPos: 7 } : t
      ),
    };
    const greenPlayer: Player = {
      ...s.players[1],
      tokens: s.players[1].tokens.map((t, i) =>
        i === 0 ? { ...t, status: "track", trackPos: 10 } : t
      ),
    };
    s = { ...s, players: [redPlayer, greenPlayer] };
    s = applyRoll(s, 3, 1);
    // Find move for red_0
    const move = s.legalMoves.find(m => m.tokenId === "red_0");
    if (!move) throw new Error("No move found");
    s = applyMove(s, "red_0", 2);
    // Green token should be back in base
    const greenToken = s.players[1].tokens[0];
    expect(greenToken.status).toBe("base");
    expect(greenToken.trackPos).toBe(-1);
  });

  it("rejects move with wrong tokenId", () => {
    let s = twoPlayerState();
    s = applyRoll(s, 6, 1);
    const before = s;
    const after = applyMove(s, "nonexistent_0", 2);
    expect(after).toBe(before); // same reference = rejected
  });

  it("advances turn after non-6 move", () => {
    let s = twoPlayerState();
    // Put red on track
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, tokens: p.tokens.map((t, j) => j === 0 ? { ...t, status: "track" as const, trackPos: 5 } : t) }
          : p
      ),
    };
    s = applyRoll(s, 3, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0");
    if (!move) throw new Error("No move found");
    s = applyMove(s, "red_0", 2);
    expect(s.activePlayerIndex).toBe(1);
  });
});

// ── Safe squares ─────────────────────────────────────────────────────────────

describe("safe squares", () => {
  it("token on safe square cannot be captured", () => {
    // Safe square 8: put red on 5, green on 8
    let s = twoPlayerState();
    const redPlayer: Player = {
      ...s.players[0],
      tokens: s.players[0].tokens.map((t, i) =>
        i === 0 ? { ...t, status: "track", trackPos: 5 } : t
      ),
    };
    const greenPlayer: Player = {
      ...s.players[1],
      tokens: s.players[1].tokens.map((t, i) =>
        i === 0 ? { ...t, status: "track", trackPos: 8 } : t
      ),
    };
    s = { ...s, players: [redPlayer, greenPlayer] };
    s = applyRoll(s, 3, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0");
    expect(move?.captures).toHaveLength(0);
  });
});

// ── Win detection ─────────────────────────────────────────────────────────────

describe("checkWin", () => {
  it("returns null when nobody has won", () => {
    expect(checkWin(twoPlayerState())).toBeNull();
  });

  it("detects winner when all tokens are finished", () => {
    let s = twoPlayerState();
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, tokens: p.tokens.map(t => ({ ...t, status: "finished" as const, trackPos: -1 })) }
          : p
      ),
    };
    expect(checkWin(s)).toBe("red");
  });
});

// ── canRoll / canMove ─────────────────────────────────────────────────────────

describe("turn eligibility", () => {
  it("canRoll true for active player before rolling", () => {
    const s = twoPlayerState();
    expect(canRoll(s, "p1")).toBe(true);
    expect(canRoll(s, "p2")).toBe(false);
  });

  it("canRoll false after rolling (not yet used)", () => {
    const s = applyRoll(twoPlayerState(), 6, 1);
    expect(canRoll(s, "p1")).toBe(false);
  });

  it("canMove true after roll with legal moves", () => {
    const s = applyRoll(twoPlayerState(), 6, 1);
    expect(canMove(s, "p1")).toBe(true);
    expect(canMove(s, "p2")).toBe(false);
  });
});

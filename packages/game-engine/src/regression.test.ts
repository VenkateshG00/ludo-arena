import { describe, it, expect } from "vitest";
import { createInitialState, applyRoll, applyMove } from "./rules";
import { tokenScreenPos } from "./board";
import { COLOR_ENTRY, HOME_LANE_ENTRY } from "./constants";
import type { GameState, PlayerColor } from "./types";

function makeState(): GameState {
  return createInitialState("r", [
    { id: "p1", name: "A", seatIndex: 0 },
    { id: "p2", name: "B", seatIndex: 1 },
  ]);
}

function putTokenOnTrack(
  s: GameState,
  colorIdx: number,
  tokenIdx: number,
  trackPos: number
): GameState {
  return {
    ...s,
    players: s.players.map((p, i) =>
      i === colorIdx
        ? {
            ...p,
            tokens: p.tokens.map((t, j) =>
              j === tokenIdx
                ? { ...t, status: "track" as const, trackPos }
                : t
            ),
          }
        : p
    ),
  };
}

describe("base exit lands on color's own start square", () => {
  for (const [color, seatIdx] of [
    ["red", 0],
    ["green", 1],
  ] as const) {
    it(`${color} base exit → trackPos ${COLOR_ENTRY[color]}`, () => {
      let s = makeState();
      s = { ...s, activePlayerIndex: seatIdx };
      s = applyRoll(s, 6, 1);
      expect(s.legalMoves.length).toBeGreaterThan(0);
      s = applyMove(s, s.legalMoves[0].tokenId, 2);
      const token = s.players[seatIdx].tokens.find(
        t => t.status === "track"
      )!;
      expect(token.trackPos).toBe(COLOR_ENTRY[color]);
    });
  }
});

describe("home lane entry", () => {
  it("exact dice from entry square enters home lane at pos 0", () => {
    let s = putTokenOnTrack(makeState(), 0, 0, HOME_LANE_ENTRY.red); // red at entry sq
    s = applyRoll(s, 1, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move).toBeDefined();
    expect(move.toStatus).toBe("home_lane");
    expect(move.toPos).toBe(0);
  });

  it("overshoot from entry square is illegal", () => {
    let s = putTokenOnTrack(makeState(), 0, 0, HOME_LANE_ENTRY.red); // red at 50
    s = applyRoll(s, 2, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0");
    expect(move).toBeUndefined();
  });

  it("token just before entry square can enter with correct count", () => {
    // red entry = 51; token at 50 needs 2 to enter (steps: 50→51→lane0)
    let s = putTokenOnTrack(makeState(), 0, 0, 50);
    s = applyRoll(s, 2, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.toStatus).toBe("home_lane");
    expect(move.toPos).toBe(0);
  });

  it("token at entry-1 cannot enter with 1 (would land on entry sq)", () => {
    let s = putTokenOnTrack(makeState(), 0, 0, 50);
    s = applyRoll(s, 1, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.toStatus).toBe("track");
    expect(move.toPos).toBe(51);
  });

  it("token at 50 with dice 1 lands on entry square 51", () => {
    let s = putTokenOnTrack(makeState(), 0, 0, 50);
    s = applyRoll(s, 1, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.toStatus).toBe("track");
    expect(move.toPos).toBe(51);
  });
});

describe("home lane movement", () => {
  it("token in home lane advances within lane", () => {
    let s = makeState();
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              tokens: p.tokens.map((t, j) =>
                j === 0
                  ? { ...t, status: "home_lane" as const, trackPos: 2 }
                  : t
              ),
            }
          : p
      ),
    };
    s = applyRoll(s, 2, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.toStatus).toBe("home_lane");
    expect(move.toPos).toBe(4);
  });

  it("exact finish from home lane", () => {
    let s = makeState();
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              tokens: p.tokens.map((t, j) =>
                j === 0
                  ? { ...t, status: "home_lane" as const, trackPos: 3 }
                  : t
              ),
            }
          : p
      ),
    };
    s = applyRoll(s, 2, 1); // 3+2=5 = finish
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.toStatus).toBe("finished");
  });

  it("overshoot in home lane is illegal", () => {
    let s = makeState();
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              tokens: p.tokens.map((t, j) =>
                j === 0
                  ? { ...t, status: "home_lane" as const, trackPos: 4 }
                  : t
              ),
            }
          : p
      ),
    };
    s = applyRoll(s, 2, 1); // 4+2=6 > 5
    const move = s.legalMoves.find(m => m.tokenId === "red_0");
    expect(move).toBeUndefined();
  });
});

describe("capture", () => {
  it("landing on opponent on non-safe square captures", () => {
    let s = putTokenOnTrack(makeState(), 0, 0, 0); // red at 0
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 1
          ? {
              ...p,
              tokens: p.tokens.map((t, j) =>
                j === 0 ? { ...t, status: "track" as const, trackPos: 5 } : t
              ),
            }
          : p
      ),
    };
    s = applyRoll(s, 5, 1); // red 0→5, green is at 5
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.captures).toContain("green_0");
  });

  it("landing on safe square does not capture", () => {
    // red at 2, green at 8 (safe). Roll 6 → land on 8, no capture.
    let s = putTokenOnTrack(makeState(), 0, 0, 2);
    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === 1
          ? {
              ...p,
              tokens: p.tokens.map((t, j) =>
                j === 0 ? { ...t, status: "track" as const, trackPos: 8 } : t
              ),
            }
          : p
      ),
    };
    s = applyRoll(s, 6, 1);
    const move = s.legalMoves.find(m => m.tokenId === "red_0")!;
    expect(move.toPos).toBe(8);
    expect(move.captures).toHaveLength(0);
  });
});

describe("board rendering", () => {
  it("token at absolute trackPos renders at correct cell (no double offset)", () => {
    // green start = 13; TRACK_GRID[13] = [1,8] → x=1*40+20=60, y=8*40+20=340
    const tok = {
      id: "green_0",
      color: "green" as const,
      index: 0,
      status: "track" as const,
      trackPos: 13,
    };
    const pos = tokenScreenPos(tok);
    expect(pos).toEqual({ x: 60, y: 340 });
  });

  it("red start renders at cell (6,1)", () => {
    const tok = {
      id: "red_0",
      color: "red" as const,
      index: 0,
      status: "track" as const,
      trackPos: 0,
    };
    const pos = tokenScreenPos(tok);
    expect(pos).toEqual({ x: 260, y: 60 }); // (6*40+20, 1*40+20)
  });

  it("each color's start cell is adjacent to their base", () => {
    const starts: Record<PlayerColor, [number, number]> = {
      red: [6, 1],     // top arm, left of red base (0-5, 0-5)
      green: [1, 8],   // left arm, below green base (0-5, 9-14)
      yellow: [8, 14], // bottom arm, right of yellow base (9-14, 9-14)
      blue: [14, 8],   // right arm, above blue base (9-14, 0-5)
    };
    for (const [color, [col, row]] of Object.entries(starts) as [PlayerColor, [number, number]][]) {
      const tok = { id: `${color}_0`, color, index: 0, status: "track" as const, trackPos: COLOR_ENTRY[color] };
      const pos = tokenScreenPos(tok);
      expect(pos.x).toBe(col * 40 + 20);
      expect(pos.y).toBe(row * 40 + 20);
    }
  });
});

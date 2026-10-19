/**
 * Board coordinate mapping.
 * Converts logical token progress (absolute trackPos / home-lane pos) to
 * pixel coordinates for SVG rendering.
 *
 * The board is a 600×600 SVG with 15×15 grid cells (40px each).
 * Main track is a 52-square ring, clockwise from red's start square.
 *
 * trackPos semantics (must match the game engine constants):
 *   - 0-51: absolute position on the shared ring
 *     starts: red=0, green=13, yellow=26, blue=38
 *     home-lane entries: red=51, green=11, yellow=25, blue=39
 *   - home-lane tokens use trackPos 0-4; finished tokens rest on cell 5
 *
 * The ring passes through three of the four center-corner cells
 * ((6,8),(8,8),(8,6)) — these are legitimate track positions.
 * The fourth corner (6,6) is not on the ring.
 */

import type { PlayerColor, Token } from "./types";

export const CELL = 40;      // px per grid cell
export const BOARD_SIZE = 600;

// Grid coordinates for each of the 52 ring squares (index = trackPos).
const TRACK_GRID: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],               // 0-4   red start, down col 6
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],       // 5-10  left along row 6
  [0, 7], [0, 8],                                       // 11-12 green entry + corner
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],               // 13-17 green start, right along row 8
  [6, 8],                                               // 18    corner (on ring)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],  // 19-24 down col 6
  [7, 14], [8, 14],                                     // 25-26 yellow entry + start
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],           // 27-31 up col 8
  [8, 8],                                               // 32    corner (on ring)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],  // 33-38 right along row 8
  [14, 7], [14, 6],                                     // 39-40 blue entry + corner
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],           // 41-45 left along row 6
  [8, 6],                                               // 46    corner (on ring)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],               // 47-51 up col 8
];

// The one center-corner cell NOT on the ring (decorative only)
export const CENTER_CORNER_CELLS: [number, number][] = [
  [6, 6],
];

// Home lane grid coordinates per color (6 squares, 0 = first inside, 5 = finish)
const HOME_LANE_GRID: Record<PlayerColor, [number, number][]> = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

// Base positions per color (the 4 token spots inside the base area)
const BASE_GRID: Record<PlayerColor, [number, number][]> = {
  red:    [[1,1],[2,1],[1,2],[2,2]],
  green:  [[1,11],[2,11],[1,12],[2,12]],
  yellow: [[11,11],[12,11],[11,12],[12,12]],
  blue:   [[11,1],[12,1],[11,2],[12,2]],
};

export function tokenScreenPos(token: Token): { x: number; y: number } {
  let col: number;
  let row: number;

  if (token.status === "base") {
    [col, row] = BASE_GRID[token.color][token.index];
  } else if (token.status === "track") {
    [col, row] = TRACK_GRID[token.trackPos];
  } else if (token.status === "home_lane") {
    [col, row] = HOME_LANE_GRID[token.color][token.trackPos];
  } else {
    // finished — rest on the innermost home cell, nudged so stacked
    // tokens stay visible
    const nudge = [
      [0, 0], [-0.15, 0.1], [0.15, 0.1], [0, -0.15],
    ][token.index];
    [col, row] = HOME_LANE_GRID[token.color][5];
    return {
      x: (col + nudge[0]) * CELL + CELL / 2,
      y: (row + nudge[1]) * CELL + CELL / 2,
    };
  }

  return {
    x: col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
  };
}

/** Returns the grid coordinate arrays for rendering */
export { TRACK_GRID, HOME_LANE_GRID, BASE_GRID };

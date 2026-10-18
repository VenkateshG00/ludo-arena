/**
 * Board coordinate mapping.
 * Converts logical token progress (trackPos / homeLanePos) to
 * pixel coordinates for SVG rendering.
 *
 * The board is a 600×600 SVG with 15×15 grid cells (40px each).
 * Main track runs clockwise from red's entry square.
 */

import type { PlayerColor, Token } from "./types";
import { COLOR_ENTRY } from "./constants";

export const CELL = 40;      // px per grid cell
export const BOARD_SIZE = 600;

// Grid coordinates for each of the 52 main track squares (index = trackPos)
// Starting at red entry (top-left area) going clockwise
const TRACK_GRID: [number, number][] = [
  // Red side: going down col 6 (squares 0-5)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
  // Bottom of top-left turning: row 6, cols 0-5 going left → right cross
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Going down left side col 0 → row 8 (green entry area)
  [0, 7], [0, 8],
  // Green entry row 8, going left
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8],
  // Down col 6 rows 9-14
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Yellow entry area: col 8 going up
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8],
  // Cross row 8 going right
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Blue entry area col 14 going up
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6],
  // Cross row 6 going left back toward red
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // Back to top
  [7, 0], [7, 1],
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
    const slot = token.index;
    [col, row] = BASE_GRID[token.color][slot];
  } else if (token.status === "track") {
    const absPos = (COLOR_ENTRY[token.color] + token.trackPos) % 52;
    [col, row] = TRACK_GRID[absPos];
  } else if (token.status === "home_lane") {
    [col, row] = HOME_LANE_GRID[token.color][token.trackPos];
  } else {
    // finished — center of home
    [col, row] = HOME_LANE_GRID[token.color][5];
  }

  return {
    x: col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
  };
}

/** Returns the set of track squares visible as "safe" to the renderer */
export { TRACK_GRID, HOME_LANE_GRID, BASE_GRID };

import type { GameState, PlayerColor, TokenStatus } from "@ludo/game-engine";

export interface Vec2 {
  x: number;
  y: number;
}

export type AnimationEvent =
  | { id: string; type: "token_move"; tokenId: string; color: PlayerColor; from: Vec2; to: Vec2; path: Vec2[] }
  | { id: string; type: "token_capture"; capturedTokenId: string; capturedColor: PlayerColor; capturerTokenId: string; capturerColor: PlayerColor; capturePos: Vec2; capturedHomePos: Vec2 }
  | { id: string; type: "token_enter_board"; tokenId: string; color: PlayerColor; from: Vec2; to: Vec2 }
  | { id: string; type: "token_enter_home_lane"; tokenId: string; color: PlayerColor; from: Vec2; to: Vec2 }
  | { id: string; type: "token_finished"; tokenId: string; color: PlayerColor; finishedCount: number; pos: Vec2 }
  | { id: string; type: "all_tokens_home"; color: PlayerColor; pos: Vec2 }
  | { id: string; type: "dice_roll"; value: number; isSix: boolean; isExtraTurn: boolean }
  | { id: string; type: "winner"; color: PlayerColor; isMe: boolean }
  | { id: string; type: "turn_skip"; color: PlayerColor };

export interface TokenSnapshot {
  id: string;
  color: PlayerColor;
  index: number;
  status: TokenStatus;
  trackPos: number;
}

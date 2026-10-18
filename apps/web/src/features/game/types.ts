import type { PlayerColor } from "@ludo/game-engine";

export interface RoomPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  seatIndex: number;
  connected: boolean;
  ready: boolean;
}

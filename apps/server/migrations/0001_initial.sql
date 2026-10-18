-- Ludo Arena D1 schema
-- Apply with: wrangler d1 migrations apply ludo-arena-db

CREATE TABLE IF NOT EXISTS matches (
  id          TEXT PRIMARY KEY,          -- UUID
  room_code   TEXT NOT NULL,
  winner_color TEXT NOT NULL,            -- red | green | yellow | blue
  player_count INTEGER NOT NULL,
  turn_count  INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,          -- wall-clock ms from start to finish
  created_at  INTEGER NOT NULL           -- unix epoch ms
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id      TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_name   TEXT NOT NULL,
  color         TEXT NOT NULL,
  seat_index    INTEGER NOT NULL,
  is_winner     INTEGER NOT NULL DEFAULT 0,  -- 0/1 (SQLite bool)
  tokens_finished INTEGER NOT NULL DEFAULT 0
);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_matches_created  ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner   ON matches(winner_color);
CREATE INDEX IF NOT EXISTS idx_mp_match         ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_mp_name          ON match_players(player_name);

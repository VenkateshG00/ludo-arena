# Ludo Arena

Free online multiplayer Ludo — 2–4 players, no sign-up required.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Cloudflare Workers + Durable Objects |
| Database | Supabase (Postgres) — match history, leaderboard, player stats |
| Shared | `@ludo/game-engine` — pure TS rules engine |
| Monorepo | pnpm workspaces |

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- Cloudflare account (free tier works) + `wrangler` CLI authenticated
- Supabase project (free tier works) — required for match history and leaderboard

## Quick start (local dev)

```bash
# Install all dependencies
pnpm install

# Set up Supabase (see below), then configure secrets:
cd apps/server
wrangler secret put SUPABASE_URL       # your Supabase project URL
wrangler secret put SUPABASE_SERVICE_KEY  # your Supabase service role key

# Start the Cloudflare Worker dev server (port 8787)
pnpm --filter @ludo/server dev

# In another terminal: start the frontend (port 5173)
cp .env.example apps/web/.env.local   # VITE_SERVER_URL=http://localhost:8787
pnpm --filter @ludo/web dev
```

Open http://localhost:5173, create a room, open a second tab, join with the code.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is sufficient).
2. Open the SQL Editor and run the schema in `apps/server/migrations/supabase_schema.sql`.
   This creates the `matches`, `match_players`, and `leaderboard` tables plus the
   `get_leaderboard` and `get_player_stats` RPC functions.
3. Copy your project URL and service role key (Settings → API) into the wrangler
   secrets shown above.

The server writes match results to Supabase after each game finishes and exposes
read-only endpoints:

- `GET /api/matches?limit=20` — recent matches with player details
- `GET /api/leaderboard?limit=10` — win-count leaderboard
- `GET /api/players/:name` — aggregated stats for a player name

## Run tests

```bash
# Game engine unit tests
pnpm --filter @ludo/game-engine test

# All tests
pnpm test
```

## Production build

```bash
pnpm build
```

## Deploy

### Backend (Cloudflare Workers)

```bash
cd apps/server

# Set production allowed origins
wrangler secret put ALLOWED_ORIGINS
# Enter: https://your-frontend.pages.dev

# Deploy
wrangler deploy
```

Note your worker URL: `https://ludo-arena-server.<subdomain>.workers.dev`

### Frontend (Cloudflare Pages)

1. Set `VITE_SERVER_URL=https://ludo-arena-server.<subdomain>.workers.dev` in your Pages environment variables.
2. Deploy:

```bash
cd apps/web
pnpm build
# Upload dist/ to Cloudflare Pages via dashboard or:
npx wrangler pages deploy dist --project-name ludo-arena
```

## Architecture

```
Browser A ──WS──┐
Browser B ──WS──┤  Cloudflare Worker (routing)
Browser C ──WS──┘       │
                         ▼
                   RoomDO (Durable Object)
                   ┌──────────────────────┐
                   │  game state          │
                   │  seat assignments    │
                   │  reconnect tokens    │
                   │  hibernation storage │
                   └──────────────────────┘
```

Each room is one Durable Object instance. WebSocket connections hibernate when idle (zero cost). Room state is persisted in Durable Object storage — survives Worker restarts.

## Limitations (first release)

- If a player disconnects during a game, the match pauses for the reconnect grace period (30 s). After that, the game will stall until all connected players leave/rematch.
- Single Worker region — add geographic distribution later with DO jurisdiction hints.

## Smoke-test checklist after deploy

- [ ] `GET /health` returns `{"ok":true}`
- [ ] Create a room from desktop browser
- [ ] Join from a different device / incognito window using the room code
- [ ] Both players can ready up and start the game
- [ ] Roll dice, move tokens, capture opponents
- [ ] Close one browser tab and reopen — player reconnects within 30 s
- [ ] First player to finish all tokens sees the winner screen

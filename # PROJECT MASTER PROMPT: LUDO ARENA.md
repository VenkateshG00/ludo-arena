# PROJECT MASTER PROMPT: LUDO ARENA

## 1. Your role

Act as a senior full-stack TypeScript engineer, real-time multiplayer game developer, game-rules specialist, security engineer, QA engineer, and UI/UX designer.

Build **Ludo Arena**, a polished, free-to-play online Ludo website supporting 2–4 players per match.

This must become a genuinely playable application, not a static prototype. Prioritize correctness, server-side game integrity, reliable multiplayer synchronization, mobile usability, and maintainable code.

Work directly in the existing repository. Inspect it before changing anything. Preserve existing working functionality where possible. Do not overwrite project files blindly.

## 2. Product goals

Players must be able to:
- Open the website on desktop or mobile.
- Create a private multiplayer room.
- Share a room code or invite link.
- Join an available seat in a room with 2–4 players.
- See the same game state as every other player.
- Roll dice, select legal tokens, move tokens, capture opponents, and finish the game.
- Refresh or temporarily disconnect and recover their seat when possible.
- Play free without payments, betting, entry fees, or paid gameplay advantages.

The first release should support guest play without requiring registration. Design authentication as an optional later enhancement.

## 3. Required technology stack

Use a TypeScript monorepo managed by pnpm.

Frontend:
- React
- TypeScript with strict mode
- Vite
- Tailwind CSS
- SVG for the board and tokens
- Socket.IO client
- Vitest and React Testing Library

Backend:
- Node.js
- TypeScript
- Express
- Socket.IO server
- Zod for validating untrusted inputs
- Vitest for unit and integration tests

Shared package:
- A framework-independent TypeScript game engine.
- Shared event payloads, game-state types, and board configuration.
- Keep the authoritative rules implementation on the server.

Persistence:
- Use in-memory state for the initial working version.
- Keep the persistence interface modular.
- Add Supabase Postgres later for player profiles and completed match history.
- Do not require paid APIs or external services for the core game.

Deployment:
- Frontend on Vercel or an equivalent static frontend host.
- Persistent Node.js hosting for the Socket.IO server.
- Configure production HTTPS/WSS connections and environment variables.

Use compatible stable package versions. Inspect the existing dependency versions before upgrading or installing packages.

## 4. Project structure

Organize the project approximately as follows:

apps/web/src/
  app/
  components/
  features/lobby/
  features/game/
  features/profile/
  hooks/
  services/
  styles/

apps/server/src/
  auth/
  rooms/
  sockets/
  game/
  persistence/
  middleware/
  index.ts

packages/game-engine/src/
  types.ts
  constants.ts
  board.ts
  rules.ts
  reducer.ts
  validation.ts

tests/
e2e/

Create shared package exports and scripts so the frontend and backend can import the same types without duplicating definitions.

## 5. Game rules

Implement a documented, deterministic rules engine, with server-generated random dice values.

Default rules:
- Support two, three, or four human players.
- Each player has four tokens.
- Assign a distinct color and starting position to each occupied seat.
- Require a six to move a token out of base.
- A six grants an additional roll.
- Players move tokens forward by the rolled value.
- Highlight all legal moves before token selection.
- Tokens on designated safe squares cannot be captured.
- Landing on a vulnerable opponent sends that opponent's token back to base.
- Each player has a private home lane.
- A token must reach the finish using the exact required dice value.
- If a player has no legal move, finish the turn according to the selected ruleset.
- The first player to finish all four tokens wins.
- A completed match cannot accept further gameplay actions.

Put variant rules in a validated room configuration. Document the default behavior for three consecutive sixes, capture bonuses, and safe-square placement. Do not silently invent inconsistent rules.

Represent token positions with explicit typed states: base, track, home lane, and finished. Separate logical token progress from screen coordinates.

The game engine must be independent of React, Express, Socket.IO, the database, and browser APIs.

Implement pure functions for:
- Initial game state.
- Determining the active player.
- Rolling-dice eligibility.
- Calculating legal token moves.
- Applying a valid move.
- Capturing opponents.
- Advancing turns.
- Checking victory.
- Producing the next game state.
- Detecting invalid or impossible state transitions.

Use atomic state transitions. Never update a token, capture, turn, or winner in separate unprotected steps.

## 6. Real-time multiplayer architecture

The server is the sole authority for live game state.

Implement a room lifecycle:
- Create room.
- Join room.
- Leave room.
- Select available player seat.
- Mark players ready.
- Start match.
- Play match.
- Handle completed match.
- Rematch or return to lobby.
- Expire abandoned rooms.

Generate room codes with sufficient randomness. Avoid sequential, easily guessable identifiers. Validate codes server-side.

Each connected player must be associated with a server-verified identity and a room membership. A client must never choose their own player ID or claim another player's seat.

Implement explicit, versioned Socket.IO event contracts for:
- create_room
- join_room
- leave_room
- set_ready
- start_game
- roll_dice
- move_token
- request_state
- rematch

Use server-to-client events for:
- room_created
- room_updated
- game_started
- dice_rolled
- move_applied
- turn_changed
- game_finished
- player_disconnected
- player_reconnected
- action_rejected
- state_snapshot

Every incoming action must be validated for:
- Authenticated connection or valid guest session.
- Correct room membership.
- Correct player turn.
- Valid phase of the game.
- Legal action parameters.
- Correct token ownership.
- Valid dice and move state.
- Rate limits and duplicate submissions.

Never accept a dice result, winner, token position, or score supplied by the client as authoritative.

Generate dice values only on the server using a cryptographically secure random-number generator. Use a trusted, unbiased method to select a value from 1 through 6.

Process actions sequentially per room. Prevent concurrent events from causing double rolls, duplicate moves, or corrupted state. Include action IDs or equivalent idempotency handling where appropriate.

Broadcast a sanitized game-state snapshot or validated state delta to the room after each accepted transition. Do not expose private session tokens, authentication credentials, or unnecessary personal data.

## 7. Room and reconnect behavior

Support 2–4 player seats and define how colors are assigned.

A player leaving before a match starts must free their seat. A temporary disconnect during a match must not immediately delete the player or corrupt the turn.

Implement a configurable reconnect grace period. Restore the same seat when the player reconnects using a valid, server-verified session or reconnect token.

Do not treat a newly connected socket as proof of ownership of an existing seat.

After the grace period, apply a documented policy. For the initial release, the server may pause the match or mark the player disconnected according to the chosen room policy. Do not silently move tokens or invent dice rolls for disconnected players.

Handle host disconnects, room abandonment, duplicate connections, stale room membership, expired rooms, and server shutdown gracefully.

The initial version may keep active matches in memory. Document that a server restart can terminate active games. Do not claim crash recovery until persistent snapshots or equivalent recovery mechanisms have been implemented and tested.

## 8. User interface and design

Create a premium, playful board-game interface with:
- Four recognizable Ludo colors: red, green, yellow, and blue.
- A centered, responsive SVG board.
- Four tokens per player with distinct visual states.
- Dice with a rolling animation.
- Legal-move highlighting.
- Current-player indicator.
- Player avatars or initials.
- Turn status and clear game instructions.
- Room code and copy-invite-link action.
- Connection status and reconnecting indicator.
- Lobby, waiting room, in-game, paused, victory, and error screens.
- Sound and music controls.
- Reduced-motion support.
- Keyboard-accessible controls and visible focus indicators.
- Mobile touch targets and layouts that work in portrait mode.

Use consistent spacing, typography, colors, and component patterns. Make the board resize without distorting token placement.

Use animations for presentation only. The authoritative state must change on the server, and visual animation must eventually reconcile with the accepted state.

Do not use animations that make a player appear to move a token before the server has accepted the action. Handle rejected moves by restoring the confirmed position.

All buttons must perform real actions. Do not leave fake links, placeholder controls, or nonfunctional game settings.

## 9. Security requirements

Treat every client event and every request as untrusted.

- Validate event payloads with Zod.
- Use secure guest-session handling and cryptographically random reconnect tokens.
- Never trust client-supplied player identities or room membership.
- Never accept client-generated dice rolls or token positions.
- Restrict actions to authorized players in the correct room and turn.
- Apply per-socket and per-IP rate limits, with appropriate proxy configuration.
- Limit room codes, event payload sizes, connection rates, and the number of rooms a guest can create.
- Validate Origin and configure CORS for known production domains.
- Keep secrets in environment variables.
- Never put Supabase service-role keys or server secrets in frontend code.
- Use parameterized database operations and appropriate Supabase Row Level Security policies when persistence is added.
- Avoid logging session tokens or sensitive credentials.
- Return safe, structured errors without stack traces to clients.
- Add dependency auditing and production build checks.
- Document the trust boundaries and guest identity limitations.

For the first release, there are no payments, wagering, or cash prizes.

## 10. Testing requirements

Unit tests:
- Initial state and player assignment.
- Dice range and distribution method.
- Six required for entering the board.
- Legal and illegal movement.
- Token ownership.
- Safe-square behavior.
- Capture behavior.
- Home-lane entry and exact finishing.
- Extra-turn rules.
- No-legal-move handling.
- Win detection.
- Invalid phase transitions.
- Invalid or repeated actions.

Integration tests:
- Room creation and joining.
- Full-room rejection.
- Seat and color assignment.
- Start-game requirements.
- Turn enforcement.
- Unauthorized move rejection.
- Duplicate action handling.
- Two players acting simultaneously.
- State synchronization.
- Disconnect and reconnect.
- Room cleanup and expiration.

End-to-end tests with Playwright:
- Create a room in one browser context.
- Join from two, three, and four independent browser contexts.
- Start a match and play through representative legal moves.
- Verify all clients show the same accepted state.
- Attempt invalid moves and confirm they are rejected.
- Disconnect and reconnect a player.
- Complete a match and verify the winner screen.
- Test desktop and mobile viewport layouts.

Use deterministic test fixtures for rule scenarios. Do not use real timers, random values, or live external services unnecessarily in unit tests.

Run tests and production builds after each meaningful milestone. Report actual results, including failures and anything not yet tested.

## 11. Observability and reliability

Add structured server logs for room lifecycle events, invalid actions, disconnections, and unexpected errors. Avoid logging credentials.

Provide:
- A health endpoint for deployment checks.
- Graceful shutdown.
- Room cleanup.
- Connection error handling.
- Basic metrics or logs for active rooms and connected players.
- A clear client-side message when the game server is unavailable.
- A documented recovery process after a deployment or server restart.

Avoid introducing a complex distributed architecture before it is needed. Document the limitations of single-process in-memory state. If the game later scales to multiple server instances, design a migration path involving a Socket.IO-compatible adapter and shared room-state coordination or a dedicated authoritative room service.

## 12. Deployment

Prepare separate development and production configurations.

Provide:
- .env.example containing variable names and safe placeholders only.
- A README with installation and local development commands.
- Monorepo build and test scripts.
- A production frontend build.
- A production server start command.
- CORS and WebSocket configuration instructions.
- Frontend and backend deployment instructions.
- Environment-variable configuration for the production frontend and server.
- Optional Supabase setup instructions.
- A smoke-test checklist after deployment.

The frontend must connect to the deployed game server using a configurable public server URL. Do not hardcode localhost in production builds.

Do not expose private server secrets in Vite variables prefixed with VITE_.

## 13. Development workflow

Work in these stages:

Stage 1: Inspect the repository and produce a concise architecture plan.

Stage 2: Build the shared rules engine and comprehensive unit tests.

Stage 3: Build the responsive board and a fully playable local game.

Stage 4: Implement rooms and authoritative Socket.IO multiplayer.

Stage 5: Add reconnect handling, validation, rate limits, and security tests.

Stage 6: Polish animations, accessibility, mobile support, and error states.

Stage 7: Run end-to-end tests, build for production, and prepare deployment documentation.

Do not implement every stage in a single giant change. Make small, coherent changes, run checks, and fix problems before proceeding.

Do not stop after writing a plan. Begin implementing Stage 1 and continue with the next stage when the preceding acceptance criteria are met.

If a choice is ambiguous, prefer the simplest reliable implementation and document the decision. Ask me only when a decision blocks progress or materially changes the product.

Do not claim that a feature is complete unless the relevant code and checks support that claim.

## 14. Definition of done

The initial release is complete only when:
- A visitor can create and join a private room.
- Two to four independent browser sessions can join one match.
- All players receive consistent authoritative state.
- Legal moves, captures, turns, and winning conditions work correctly.
- Invalid, unauthorized, and duplicate actions are rejected.
- Players can recover from supported temporary disconnections.
- The game works on desktop and mobile browsers.
- Automated rules and multiplayer tests pass.
- The production build succeeds.
- The README accurately describes installation, limitations, and deployment.
- The public frontend and real-time backend can communicate over secure connections.

Start by inspecting the repository, reporting the current setup, and implementing the first milestone.
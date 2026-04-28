# Cadavre Exquis Multiplayer Room Plan (v1)

## Locked v1 Scope
- 2-4 players per room (hard limit).
- Fixed 3x3 board (9 total cells).
- Turn-based drawing with one active player at a time.
- Active player must select one unfilled cell before drawing.
- Players only see neighboring edge hints (top/right/bottom/left strips) from completed adjacent cells.
- Game ends exactly when all 9 cells are complete.
- On finish, reveal the full composed 3x3 image to all players.

## Goal
Implement a room-based multiplayer flow where players create/join rooms, start host-controlled sessions, and fill a shared 3x3 board one cell per turn until completion.

## Current Baseline
- Backend: `src/server.js` serves static files with Express + HTTP server.
- Frontend: lobby/game pages in `public/lobby.js`, `public/game.js`, `public/index.html`, `public/room.html`.
- Multiplayer room/task intent exists, but plan doc was based on prior linear strip-hint flow.

## Proposed Architecture
- Use Socket.IO for room lifecycle, game state sync, and turn authority.
- Server remains authoritative for:
  - membership and host ownership
  - active turn and valid actions
  - cell claim/complete transitions
  - persisted image per board cell
  - end-of-game detection (all 9 cells complete)
- Client is responsible for local drawing UI and rendering only the hint strips provided for the selected cell.

## Dependency Changes
- Ensure `socket.io` is installed server-side.
- Ensure client socket script is available on room/game views.

## Server Data Model (In Memory)
In `src/server.js`:

```js
rooms = Map<roomCode, {
  code: string,
  hostSocketId: string,
  status: 'lobby' | 'in_progress' | 'finished',
  createdAt: number,
  players: Array<{
    socketId: string,
    name: string,
    joinedAt: number,
    connected: boolean
  }>,
  turnIndex: number,
  turnNumber: number,
  board: {
    rows: 3,
    cols: 3,
    cells: Array<{
      index: number, // 0..8
      row: number,   // 0..2
      col: number,   // 0..2
      claimedBySocketId: string | null,
      completedBySocketId: string | null,
      imageDataUrl: string | null,
      completedAt: number | null
    }>
  },
  currentTurn: {
    playerSocketId: string,
    selectedCellIndex: number | null,
    startedAt: number
  } | null
}>

socketToRoom = Map<socketId, roomCode>
```

## Room and Gameplay Rules (Authoritative)
1. Room create/join is allowed only while `status = lobby`.
2. Room size must stay within 2-4 players.
3. Host-only start: reject non-host `room:start` requests.
4. Host start requires at least 2 connected players.
5. Turn order is deterministic (join order).
6. Only active player can select a cell and submit drawing.
7. Selected cell must be currently unfilled.
8. When a valid turn is submitted:
   - server stores image in selected cell
   - marks cell complete
   - clears current turn selection
   - broadcasts board update
9. Turn advances to next connected player.
10. When all 9 cells are complete, status becomes `finished` and full board is revealed.

## Cell Claim + Lock Semantics
- `turn:select-cell` creates a temporary claim for the active player during their turn.
- If player changes selection (optional behavior), prior claim is released and replaced.
- On `turn:submit`, claim becomes completion lock.
- Completed cells are permanently locked and cannot be edited.
- Server rejects stale, duplicate, or already-filled cell submissions.

## Neighbor-Edge Hint Rules
For currently selected cell `(r, c)`, server/client derives hints only from completed direct neighbors:
- top: `(r-1, c)` bottom strip
- right: `(r, c+1)` left strip
- bottom: `(r+1, c)` top strip
- left: `(r, c-1)` right strip

Constraints:
- Reveal strips only, never full neighboring images.
- If a neighbor is incomplete, that edge hint is empty.
- Hint strip thickness is fixed for v1 (constant value).

## Socket Event Contract

### Client -> Server
- `room:create` `{ name }`
- `room:join` `{ code, name }`
- `room:start` `{ code }`
- `turn:select-cell` `{ code, cellIndex }`
- `turn:submit` `{ code, cellIndex, imageDataUrl }`
- `room:leave` `{ code }` (optional)

### Server -> Client
- `room:created` `{ code, room, selfSocketId }`
- `room:joined` `{ code, room, selfSocketId }`
- `room:update` `{ room }`
- `turn:started` `{ code, activePlayerSocketId, turnNumber }`
- `cell:selected` `{ code, bySocketId, cellIndex }`
- `turn:accepted` `{ code, bySocketId, cellIndex, filledCount }`
- `game:finished` `{ code, board }`
- `error:event` `{ code, message }`

## Frontend Changes

### `public/index.html` / `public/room.html`
- Room UI must render:
  - room code
  - 2-4 player roster
  - host-only start control
  - status labels (`lobby`, `in progress`, `finished`)
- Game UI must render:
  - 3x3 grid with clear states (available, claimed, completed)
  - active turn indicator
  - drawing panel enabled only for active player
  - selected-cell context + neighbor-edge hint strips

### `public/game.js` / `public/lobby.js`
- Ensure create/join selectors and handlers are aligned.
- Keep local room state synced from `room:update`.
- Enforce client-side guardrails (UI disable) while relying on server validation.
- Replace any prior linear gallery/strip-only assumptions with board-based submission.

### `public/styles.css`
- Add visual states for:
  - grid cell availability/claim/completion
  - active player and disabled controls
  - neighbor-edge hint overlays around drawing surface

## Backend Changes

### `src/server.js`
- Add helpers:
  - room code generation with collision checks
  - board initialization (9 cells)
  - adjacency calculation for neighbor hints
  - room cleanup and host reassignment
- Validate all critical actions:
  - room exists
  - membership is valid
  - status allows action
  - actor is active player for turn actions
  - selected cell is valid and unfilled
  - payload size/type checks for image data
- Disconnect handling:
  - remove/disconnect player
  - if host leaves, reassign host deterministically
  - if active player disconnects, advance turn safely
  - delete room when empty

## Execution Plan (Aligned to Task Board)
1. Lock rules and update documentation (this file + task board consistency).
2. Define and implement room + board in-memory model.
3. Fix lobby wiring mismatch for create/join actions.
4. Implement `room:create` + `room:join` server/client flow.
5. Implement room UI state rendering.
6. Implement host-only `room:start` with 2+ player guard.
7. Implement turn lock permissions (active player only).
8. Implement 3x3 cell select/claim flow.
9. Implement submit persistence to selected cell.
10. Implement neighbor-edge hint visibility logic.
11. Implement turn advance and disconnect continuity.
12. Implement finish logic and full-board reveal.
13. Add error guardrails and payload limits.
14. Run manual QA for 2-player and 4-player sessions.

## v1 Acceptance Criteria
- Room enforces min 2 and max 4 players.
- Board is fixed at 3x3 and all 9 cells are tracked.
- Only active player can select/submit.
- Only unfilled cells can be selected/submitted.
- Completed cells are locked.
- Neighbor-edge hints are limited to adjacent completed cells and strips only.
- Turn progression is deterministic and resilient to disconnects.
- Game completion triggers exactly when all 9 cells are filled.
- Finished state reveals the full composed board to all room members.

## Out of Scope (v1)
- Persistent storage (DB/Redis)
- Spectator mode
- Matchmaking beyond room code join
- Advanced anti-cheat and moderation tooling

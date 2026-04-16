# Cadavre Exquis Multiplayer Room + Turn System Plan

## Goal
Add a room-based multiplayer flow where users can create or join a room, take turns drawing in sequence, and only see the bottom strip of the previous drawing (about 15px) as a continuation hint.

## Current Baseline
- Backend: `src/server.js` serves static files with Express and HTTP server.
- Frontend: single-player canvas app in `public/index.html` + `public/game.js`.
- No real-time transport yet (no WebSocket/Socket.IO).

## Proposed Architecture
- Use Socket.IO for real-time room state and turn control.
- Server is authoritative for:
  - room membership
  - player order
  - active turn
  - accepted submissions
- Client draws locally, submits final image to server at end of turn.
- Server computes and broadcasts the 15px hint strip for the next player.

## Dependency Changes
- Add package: `socket.io`
- Add client script include: `/socket.io/socket.io.js` in `public/index.html`

## Data Model (Server Memory)
In `src/server.js`, keep an in-memory map:

```js
rooms = Map<roomCode, {
  code: string,
  hostSocketId: string,
  status: 'lobby' | 'in_progress' | 'finished',
  createdAt: number,
  players: Array<{ socketId: string, name: string, joinedAt: number }>,
  turnIndex: number,
  turnNumber: number,
  drawings: Array<{
    playerSocketId: string,
    playerName: string,
    imageDataUrl: string
  }>,
  currentTurn: {
    playerSocketId: string,
    startedAt: number
  } | null
}>
```

Also keep reverse lookup:

```js
socketToRoom = Map<socketId, roomCode>
```

## Room/Turn Rules
1. User lands on lobby UI: choose **Create Room** or **Join Room**.
2. Host creates room -> receives generated short room code (e.g., 6 chars).
3. Joiners enter code + display name.
4. Host starts game once at least 2 players are present.
5. Turn order = join order (deterministic, simple initial version).
6. Only active player can draw and submit.
7. On submit:
   - server stores full drawing
   - server derives hint strip from drawing bottom 15px
   - next player gets a fresh canvas + hint strip shown at top overlay
8. Repeat until desired turn limit (initial: one round through all players), then game finishes and gallery remains visible.

## Socket Event Contract

### Client -> Server
- `room:create` `{ name }`
- `room:join` `{ code, name }`
- `room:start` `{ code }`
- `turn:submit` `{ code, imageDataUrl }`
- `room:leave` `{ code }` (optional explicit leave)

### Server -> Client
- `room:created` `{ code, room, selfSocketId }`
- `room:joined` `{ code, room, selfSocketId }`
- `room:update` `{ room }` (membership/status/turn index changes)
- `turn:started` `{ code, activePlayerSocketId, activePlayerName, turnNumber, hintStripDataUrl }`
- `turn:accepted` `{ code, bySocketId, byName, drawingCount }`
- `game:finished` `{ code, drawings }`
- `error:event` `{ code, message }`

## Image/Hint Handling
- Client submits PNG data URL (`canvas.toDataURL("image/png")`).
- Server creates hint strip from submitted image:
  - decode image
  - crop region: `y = canvasHeight - 15`, `height = 15`
  - re-encode cropped strip as PNG data URL
- Send this strip to next player as `hintStripDataUrl`.

Implementation option:
- Add dependency `canvas` (node-canvas) for reliable server-side crop.
- If avoiding native dependency complexity, temporary alternative:
  - send full previous image and crop on client before display.
  - still keep server authoritative for turn transitions.

Recommended path: start with **client-side crop fallback**, then migrate to server-side crop when needed.

## Frontend UI Changes

### `public/index.html`
- Add pre-game panel:
  - display name input
  - create room button
  - join room input + button
- Add room status section:
  - room code
  - player list
  - host controls (`Start Game`)
  - current turn label
- Add gallery container below active canvas where completed drawings stack vertically.
- Keep toolbar/canvas; disable for non-active players.

### `public/styles.css`
- Add layout for:
  - lobby controls
  - room/player list
  - turn status badge
  - drawing gallery column (stacked images)
  - hint strip presentation (top overlay above active drawing area)
- Add disabled visual state for canvas and done button when not active turn.

### `public/game.js`
- Refactor into modules/functions:
  - socket lifecycle and event handlers
  - local room state rendering
  - turn enable/disable state
  - drawing submit/reset flow
  - gallery rendering
  - hint strip render
- Replace current `saveCanvas()` behavior (download file) with turn submit event.
- Keep download as optional post-game action, not primary done action.

## Backend Changes

### `src/server.js`
- Keep Express static serving.
- Attach Socket.IO to existing HTTP server.
- Implement:
  - room code generation with collision check
  - create/join/start/submit event handling
  - server-side validations:
    - room exists
    - game state allows action
    - submitter is active player
    - image payload format and size limit
  - disconnect behavior:
    - remove player
    - if active player disconnects, advance turn or pause based on remaining players
    - if host disconnects, reassign host to earliest joined player

## Validation and Constraints
- Cap room size (initial suggestion: 8 players).
- Reject oversized image payloads (limit bytes/length).
- Trim and sanitize names (length cap).
- Ignore/deny submissions from non-turn players.

## Failure/Edge Cases
- Joining invalid/nonexistent room code -> user-facing error.
- Duplicate names in room -> allow, but display unique suffix in UI if desired.
- Player disconnect mid-lobby/game -> room updates for everyone.
- Room empties -> delete room from memory.
- Server restart -> rooms lost (acceptable for v1 in-memory design).

## Implementation Steps (Concrete)
1. Add Socket.IO dependency and wire server + static client script.
2. Implement room state store and helper functions in `src/server.js`.
3. Add socket event handlers with validation and broadcasts.
4. Update `public/index.html` with lobby + room + gallery sections.
5. Refactor `public/game.js` to manage room lifecycle and turn-gated drawing.
6. Add hint strip rendering pipeline (client-side crop fallback first).
7. Update `public/styles.css` for new states/layout.
8. Manual multi-client verification:
   - create/join flow
   - host start
   - turn lock/unlock behavior
   - hint strip visibility for next player only
   - stacked gallery order
   - disconnect handling
9. Iterate on UX polish and error messaging.

## Acceptance Criteria
- User can create room and share code.
- Other users can join room by code.
- Host can start turn-based game.
- Only active player can draw and click done.
- On submit, drawing appears in stacked history below previous drawings.
- Next player receives only bottom ~15px continuation hint.
- Turn advances reliably through all players.
- Basic disconnect/join errors are surfaced clearly.

## Future Enhancements (After v1)
- Persistent room/game storage (Redis/DB).
- Spectator mode.
- Configurable hint strip height and turn timer.
- Anti-cheat image integrity checks.
- Shareable replay/export of full cadavre sequence.

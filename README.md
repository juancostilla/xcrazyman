# XCRAZYMAN — Neon demolition

[Play online](https://juancostilla.github.io/xcrazyman/)

An original maze-bombing arcade game. Single-player works without dependencies; online versus loads PeerJS 1.5.5 on demand.

## Play with a friend

1. Open **Play with a friend · Online versus**.
2. Enter a room-only password (at least six characters) and choose **Create room**.
3. Use **Copy invite link** and send the password separately.
4. Your friend opens the invite, enters the password, and selects **Join room**. They can also paste the room code manually.
5. The lobby shows whether your friend has joined and whether each player is ready.
6. Both players choose **I am ready**. A three-second countdown starts the match.
7. After the result, both players must become ready again for a rematch.

Player 1 is blue; Player 2 is purple. Each has separate bomb capacity and range. All bombs can eliminate either player. Exactly one AI enemy threatens both; no reinforcements spawn in versus. The last surviving human wins even if the AI remains. Both humans dying in the same simulation step is a draw.

## Connection details

The creator's browser runs the authoritative simulation and sends snapshots over WebRTC. Keep that tab open and visible throughout the match. A lost connection stops the game; rejoin a new room to continue. There is no host migration.

PeerJS Cloud provides signaling, and the pinned PeerJS library loads from jsDelivr. Some networks block direct WebRTC connections; connection errors explain how to retry. No dedicated TURN relay is configured. This is friend-to-friend play, not a competitive anti-cheat service: the host controls the simulation.

Passwords are not included in invite URLs or stored in browser storage. Room-specific PBKDF2-derived HMAC keys prove knowledge of the password using fresh challenges. Pending authentication and room capacity are limited, and failed attempts are throttled. Use a unique room password, never an account password.

## Solo and controls

- Move: arrow keys / WASD, or touch direction buttons.
- Bomb: Space / touch BOMB.
- Pause solo: P, Escape, or Pause. Online matches cannot be paused by one player.
- Destroy all bots to win solo. A reinforcement arrives each minute, up to six living bots.
- Bombs have a two-second fuse. Walls block blasts; crates break and stop the blast. Chain reactions are possible.
- Collect the animated mini bomb to increase bomb capacity, or three flames to increase blast range.
- Power-ups trigger munch animations. Characters blink, glance, walk, and react comically when trapped or defeated.
- Sound is optional; solo high scores save on your device.

## Local development

Open index.html for solo, or run `python -m http.server 8765` here and visit http://localhost:8765. Online play requires HTTPS or localhost for Web Crypto and internet access for signaling.

## Validation

Gameplay and randomized layout tests; multiplayer password proofs, ready gate, countdown, per-player bombs, simultaneous deaths, human victory with a surviving AI, rematch readiness, and disabled reinforcements were checked. Two actual browser sessions verified incorrect-password rejection, joining, readiness synchronization, match results and disconnect handling.

# XCRAZYMAN — Neon demolition

An original, Bomberman-inspired single-player browser arcade game. No dependencies or build step.

## Play

Download index.html and open it in a modern browser, or run `python -m http.server 8765` from this folder and visit http://localhost:8765.

- Move: arrow keys or WASD; touch direction buttons on smaller screens.
- Drop bomb: Space or the touch BOMB button.
- Pause/resume: P, Escape, or the Pause button.
- Defeat every bot, then reach the bottom-right exit. Complete three sectors to win.
- Bombs explode after two seconds. Walls block blasts, crates stop a blast and break, and bombs trigger chain reactions. Your explosions hurt you too.
- Crates may reveal capacity, range, or movement-speed upgrades. Upgrades reset each sector.
- Sound is optional. Best score saves locally when browser storage is available.

All artwork is drawn procedurally with Canvas. No external assets, tracking, or network requests.

## Checks

Gameplay logic verified for bomb capacity, collision, blast blocking, chain reactions, damage, progression, victory and pausing. Browser rendering and start/pause controls were checked in the Codex browser.

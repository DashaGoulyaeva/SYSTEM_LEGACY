## 2024.06.03 — Weeks 1-2: Foundation. Core Loop and State.

### Status
Implemented the minimal game core: autonomous loop, UI update, and state persistence. The project has moved from the mock-up stage to a working prototype.

### Code Changes (`game.js`)
1.  **Global State:**
    *   Declared variables: `stability` (number, %), `memory` (number, GB), `knowledge` (number).
2.  **Core Game Loop:**
    *   Implemented `gameTick()` function. Called every 1000 ms via `setInterval`.
    *   **Logic per tick:** `stability -= 0.5`, `memory += 1.2`.
    *   `updateInterface()` function synchronizes variable values with the DOM (`progressBar.value`, `textContent`).
3.  **Save System:**
    *   Implemented `saveGame()` and `loadGame()` functions.
    *   State is serialized to JSON and stored in `localStorage` under the key `systemLegacySave`.
    *   Load is called on start, save is called after each `gameTick()`.
4.  **Interface:**
    *   The "SCAN" button has a basic handler that spends 5 units of `memory`.

### Commits
*   `Add core game loop: auto-decay of stability and memory generation`
*   `Implement save/load system using localStorage`

### Next Tasks
1.  Data model for the process grid (3x3).
2.  Grid visualization in the interface.
3.  Logic for degradation and breakdown of individual processes.
4.  Mechanics of `FIX` and `ANALYZE` commands for interacting with processes.
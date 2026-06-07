# Hint engine scans techniques independently from the solver

`hints/engine.ts:getHint()` iterates `ALL_TECHNIQUES` directly rather than delegating to `solver/solve.ts:solve()`. This is intentional: `solve()` computes candidates purely from cell values and ignores any pencil marks the player has entered manually. `getHint()` needs to respect the player's candidates — when the player has pencil marks in a cell, those override the computed candidates so the hint operates on what the player can actually see.

**When to revisit:** If a unified candidate-sourcing abstraction is introduced (e.g. a function that merges computed and player candidates into a single `SolverState`), `getHint()` could be reimplemented on top of it and the duplicate loop removed.

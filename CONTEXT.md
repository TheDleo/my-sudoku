# My Sudoku

A browser-based Sudoku game with a human-technique solver, puzzle generator, progressive hint engine, and manual coloring tools.

## Language

### Puzzle & Board

**Puzzle**:
A Sudoku problem: a stable record of the initial clue grid, its unique solution, a difficulty tier, and a generated id.
_Avoid_: Board, game, problem

**Given**:
A clue cell whose digit is fixed at puzzle load and cannot be edited by the player.
_Avoid_: Clue, preset, locked cell

**Candidates**:
The set of digits that remain valid for an empty cell, whether entered manually by the player or computed automatically from constraints.
_Avoid_: Pencil marks (UI metaphor only — not a domain term)

**Digit**:
An integer 1–9 placed in a cell.
_Avoid_: Number, value

### Board Structure

**Unit**:
A row, column, or box — the three types of constraint groups in a Sudoku grid.

**Box**:
A 3×3 block of cells. One of the three unit types.
_Avoid_: Block, region, square

**Peer**:
Any cell that shares a unit with a given cell. A cell has 20 peers.

### Solving

**Technique**:
A named human-readable rule for deducing a placement or elimination (e.g. Naked Single, X-Wing).

**Step**:
One application of a technique: identifies the technique used, which cells are highlighted, what placements or eliminations follow, and an explanation string.

**Placement**:
A deduction that a specific digit must go in a specific cell.

**Elimination**:
A deduction that a specific digit cannot go in a specific cell, removing it from that cell's candidates.

**Difficulty**:
The tier of the hardest technique required to solve a puzzle without guessing: easy / medium / hard / expert.

### Game

**Game**:
The active play session: current cell values, selection, pencil mode, mistakes, timer, hints used, undo/redo history, and coloring state.

**Mistake**:
A digit placement that conflicts with a peer in the same row, column, or box. Tracked as a count for the player's awareness; has no gameplay consequence (no move limit, no failure state).

**Screen**:
The top-level view the player sees: either the landing screen (difficulty selection) or the game board. A separate concern from the Game itself.
_Avoid_: Route, page

**Hint**:
A progressively disclosed Step surfaced to the player on request. Four levels: (1) existence signal, (2) technique name, (3) cell highlights, (4) full explanation. Never auto-applied.

**Color Mark**:
A player-placed A or B label on a cell, used for manual coloring analysis. Distinct from the _Coloring_ solving technique.

## Relationships

- A **Puzzle** has exactly one **Difficulty**
- A **Puzzle** produces one **Game** when loaded
- A **Game** contains 81 cells, some of which are **Givens**
- Each empty cell has a set of **Candidates** (zero or more **Digits**)
- Each cell has exactly 20 **Peers**
- A **Unit** contains exactly 9 cells; each cell belongs to exactly 3 **Units** (one row, one column, one box)
- A **Hint** wraps a **Step** from the solver and exposes it progressively
- A **Step** produces zero or more **Placements** and zero or more **Eliminations**
- The **Landing Screen** and the **Game** are separate concerns; the **Landing Screen** is where the player selects a **Difficulty** before a **Game** begins

## Example dialogue

> **Dev:** "When the player picks a difficulty, does that load a **Puzzle** into the **Game**?"
> **Domain expert:** "Yes — the **Landing Screen** lets the player choose a **Difficulty**, then a **Puzzle** is generated at that tier and the **Game** begins. The **Landing Screen** is not part of the **Game**."

> **Dev:** "If the player requests a **Hint** and the current step involves the _Coloring_ technique, do we auto-place the **Color Marks**?"
> **Domain expert:** "No — **Hints** are educational only. The player places **Color Marks** manually for their own analysis."

## Flagged ambiguities

- "coloring" was used to mean both the _Coloring_ solving **Technique** and the player's **Color Mark** feature — resolved: these are distinct concepts sharing a root word. Use **Color Mark** for the player UI feature.
- "pencil marks" and "candidates" both referred to possible digits for an empty cell — resolved: **Candidates** is the domain term; "pencil marks" is a UI label only.
- `screen` in `GameState` couples **Screen** routing to **Game** state — resolved: **Screen** is a separate concern; this is an implementation choice, not a domain relationship.

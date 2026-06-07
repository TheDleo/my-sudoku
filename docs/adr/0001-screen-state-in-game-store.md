# Screen navigation state lives in GameState

The `screen` field (`'landing' | 'game'`) is stored inside `GameState` and managed by the game Zustand store, rather than in a separate routing or navigation layer. This was a deliberate simplicity tradeoff: the app has exactly two screens, the transition between them is triggered by game actions (loading a puzzle, returning to landing), and a separate navigation store would add indirection with no benefit at this scale.

**Considered Options**

- Separate navigation store or React Router — rejected: two screens don't justify the abstraction
- `screen` as local React state in `app.tsx` — rejected: it would need to be threaded through to components that also need game state, or force additional context

**When to revisit:** If a third screen is added (e.g. statistics, settings as a full screen, or an onboarding flow), or if the persistence logic that manually resets `screen` on save becomes a recurring source of bugs.

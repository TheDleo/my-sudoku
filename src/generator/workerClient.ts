import type { Difficulty, Puzzle } from '../types';

export type ClientMessage = { type: 'generate'; difficulty: Difficulty };

export type WorkerMessage =
  | { type: 'puzzle'; difficulty: Difficulty; puzzle: Puzzle }
  | { type: 'error'; difficulty: Difficulty; message: string };

export type WorkerLike = {
  postMessage(msg: ClientMessage): void;
  onmessage: ((ev: { data: WorkerMessage }) => void) | null;
  terminate(): void;
};

export type WorkerClient = {
  getPuzzle(difficulty: Difficulty): Promise<Puzzle>;
  terminate(): void;
};

const TIERS: ReadonlyArray<Difficulty> = ['easy', 'medium', 'hard', 'expert'];

/**
 * Creates a main-thread client that delegates puzzle generation to a Web
 * Worker and maintains a 1-deep pre-generation cache per difficulty tier.
 *
 * At construction the client posts one `generate` request per tier so that
 * by the time the user picks a difficulty, every tier is likely warm.
 *
 * When several `getPuzzle(tier)` calls arrive while the cache is empty and
 * a generate is in flight, all of them resolve with the same puzzle when
 * it lands; the next call triggers a fresh generate. This is a defensive
 * contract — realistic UI usage never produces concurrent same-tier calls.
 *
 * Pass `workerLike` for tests; in production omit it and the factory will
 * construct a real Worker.
 */
export function createWorkerClient(workerLike?: WorkerLike): WorkerClient {
  const worker: WorkerLike =
    workerLike ??
    (new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as WorkerLike);

  type Waiter = { resolve: (p: Puzzle) => void; reject: (e: Error) => void };
  const cache: Record<Difficulty, Puzzle | undefined> = {
    easy: undefined,
    medium: undefined,
    hard: undefined,
    expert: undefined,
  };
  const pending: Record<Difficulty, Waiter[]> = {
    easy: [],
    medium: [],
    hard: [],
    expert: [],
  };
  const inflight: Record<Difficulty, boolean> = {
    easy: false,
    medium: false,
    hard: false,
    expert: false,
  };

  function postGenerate(tier: Difficulty): void {
    worker.postMessage({ type: 'generate', difficulty: tier });
    inflight[tier] = true;
  }

  function dispatch(msg: WorkerMessage): void {
    const tier = msg.difficulty;
    inflight[tier] = false;
    if (msg.type === 'puzzle') {
      const waiters = pending[tier];
      if (waiters.length > 0) {
        for (const w of waiters) w.resolve(msg.puzzle);
        pending[tier] = [];
        postGenerate(tier); // keep the slot warm for next time
      } else {
        cache[tier] = msg.puzzle;
      }
    } else {
      // 'error' — Task 4 fills this branch in
    }
  }

  worker.onmessage = (ev) => dispatch(ev.data);

  for (const tier of TIERS) {
    postGenerate(tier);
  }

  return {
    getPuzzle(tier: Difficulty): Promise<Puzzle> {
      const cached = cache[tier];
      if (cached !== undefined) {
        cache[tier] = undefined;
        if (!inflight[tier]) postGenerate(tier);
        return Promise.resolve(cached);
      }
      if (!inflight[tier]) postGenerate(tier);
      return new Promise<Puzzle>((resolve, reject) => {
        pending[tier].push({ resolve, reject });
      });
    },
    terminate(): void {
      worker.terminate(); // Full implementation in Task 4.
    },
  };
}

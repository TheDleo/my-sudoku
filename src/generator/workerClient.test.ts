import { describe, it, expect } from 'vitest';
import type { Difficulty, Digit, Puzzle } from '../types';
import {
  createWorkerClient,
  type ClientMessage,
  type WorkerLike,
  type WorkerMessage,
} from './workerClient';

const TIERS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function makeFakePuzzle(difficulty: Difficulty): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  const solution: Digit[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => 1 as Digit),
  );
  return { id: `fake-${difficulty}`, difficulty, initialBoard, solution };
}

class FakeWorker implements WorkerLike {
  private readonly messages: ClientMessage[] = [];
  public terminated = false;
  public onmessage: ((ev: { data: WorkerMessage }) => void) | null = null;

  postMessage(msg: ClientMessage): void {
    this.messages.push(msg);
  }

  terminate(): void {
    this.terminated = true;
  }

  receivedMessages(): ReadonlyArray<ClientMessage> {
    return this.messages;
  }

  resolveNext(tier: Difficulty, puzzle: Puzzle): void {
    this.onmessage?.({ data: { type: 'puzzle', difficulty: tier, puzzle } });
  }

  rejectNext(tier: Difficulty, message: string): void {
    this.onmessage?.({ data: { type: 'error', difficulty: tier, message } });
  }
}

describe('createWorkerClient', () => {
  it('posts one generate message per tier on construction', () => {
    const fake = new FakeWorker();
    createWorkerClient(fake);
    expect(fake.receivedMessages()).toEqual(
      TIERS.map((tier) => ({ type: 'generate', difficulty: tier })),
    );
  });

  it('getPuzzle returns the cached puzzle immediately and posts a refill', async () => {
    const fake = new FakeWorker();
    const client = createWorkerClient(fake);
    const easyPuzzle = makeFakePuzzle('easy');
    fake.resolveNext('easy', easyPuzzle);

    await expect(client.getPuzzle('easy')).resolves.toBe(easyPuzzle);

    // Boot posted 4; the cached-hit refill posts a 5th targeting 'easy'.
    expect(fake.receivedMessages()).toEqual([
      { type: 'generate', difficulty: 'easy' },
      { type: 'generate', difficulty: 'medium' },
      { type: 'generate', difficulty: 'hard' },
      { type: 'generate', difficulty: 'expert' },
      { type: 'generate', difficulty: 'easy' },
    ]);
  });

  it('getPuzzle on a cold tier returns a pending promise resolved by the next response', async () => {
    const fake = new FakeWorker();
    const client = createWorkerClient(fake);
    const promise = client.getPuzzle('medium');
    const mediumPuzzle = makeFakePuzzle('medium');
    fake.resolveNext('medium', mediumPuzzle);
    await expect(promise).resolves.toBe(mediumPuzzle);
  });

  it('two concurrent getPuzzle calls for the same tier resolve with the same puzzle', async () => {
    const fake = new FakeWorker();
    const client = createWorkerClient(fake);
    const a = client.getPuzzle('hard');
    const b = client.getPuzzle('hard');
    const hardPuzzle = makeFakePuzzle('hard');
    fake.resolveNext('hard', hardPuzzle);
    const [pa, pb] = await Promise.all([a, b]);
    expect(pa).toBe(hardPuzzle);
    expect(pb).toBe(hardPuzzle);
  });
});

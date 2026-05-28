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

void makeFakePuzzle;

describe('createWorkerClient', () => {
  it('posts one generate message per tier on construction', () => {
    const fake = new FakeWorker();
    createWorkerClient(fake);
    expect(fake.receivedMessages()).toEqual(
      TIERS.map((tier) => ({ type: 'generate', difficulty: tier })),
    );
  });
});

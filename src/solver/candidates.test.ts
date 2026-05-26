import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { computeCandidates, removeCandidateFromPeers } from './candidates';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyValues(): (Digit | null)[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null as Digit | null));
}

function emptyCandidates(): Set<Digit>[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<Digit>(ALL)));
}

describe('computeCandidates', () => {
  it('on an empty board, every cell has all 9 candidates', () => {
    const result = computeCandidates(emptyValues());
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result[r]?.[c]).toEqual(new Set<Digit>(ALL));
      }
    }
  });

  it('cells with a value have an empty candidate set', () => {
    const values = emptyValues();
    values[0]![0] = 5;
    const result = computeCandidates(values);
    expect(result[0]?.[0]?.size).toBe(0);
  });

  it('placing a 5 at (0,0) removes 5 from candidates in row 0, col 0, and box 0', () => {
    const values = emptyValues();
    values[0]![0] = 5;
    const result = computeCandidates(values);

    // row 0 peers
    for (let c = 1; c < 9; c++) {
      expect(result[0]?.[c]?.has(5)).toBe(false);
    }
    // col 0 peers
    for (let r = 1; r < 9; r++) {
      expect(result[r]?.[0]?.has(5)).toBe(false);
    }
    // box 0 peers (excluding row 0 and col 0 cells, which are already covered)
    expect(result[1]?.[1]?.has(5)).toBe(false);
    expect(result[1]?.[2]?.has(5)).toBe(false);
    expect(result[2]?.[1]?.has(5)).toBe(false);
    expect(result[2]?.[2]?.has(5)).toBe(false);

    // cells outside row 0, col 0, and box 0 should still have 5 as a candidate
    expect(result[4]?.[4]?.has(5)).toBe(true);
    expect(result[8]?.[8]?.has(5)).toBe(true);
  });

  it('multiple placements compound correctly', () => {
    const values = emptyValues();
    values[0]![0] = 5;
    values[0]![1] = 3;
    const result = computeCandidates(values);

    // cell (0, 2) should be missing both 5 (same row) and 3 (same row)
    expect(result[0]?.[2]?.has(5)).toBe(false);
    expect(result[0]?.[2]?.has(3)).toBe(false);
    // but should still have other digits
    expect(result[0]?.[2]?.has(1)).toBe(true);
  });

  it('a fully filled board yields all empty candidate sets', () => {
    // Build a trivially solved 9x9 (any valid Latin-square-style fill works; we use modular shift)
    const values: (Digit | null)[][] = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (((r * 3 + Math.floor(r / 3) + c) % 9) + 1) as Digit),
    );
    const result = computeCandidates(values);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result[r]?.[c]?.size).toBe(0);
      }
    }
  });
});

describe('removeCandidateFromPeers', () => {
  it('removes the digit from all 20 peers', () => {
    const candidates = emptyCandidates();
    const result = removeCandidateFromPeers(candidates, { row: 4, col: 4 }, 7);

    // sample a few peers
    expect(result[4]?.[0]?.has(7)).toBe(false); // same row
    expect(result[0]?.[4]?.has(7)).toBe(false); // same col
    expect(result[3]?.[3]?.has(7)).toBe(false); // same box
    expect(result[5]?.[5]?.has(7)).toBe(false); // same box
  });

  it('does not affect cells that are not peers', () => {
    const candidates = emptyCandidates();
    const result = removeCandidateFromPeers(candidates, { row: 0, col: 0 }, 5);

    // (4, 4) is not a peer of (0, 0)
    expect(result[4]?.[4]?.has(5)).toBe(true);
    // (8, 8) is not a peer of (0, 0)
    expect(result[8]?.[8]?.has(5)).toBe(true);
  });

  it('does not mutate the input grid', () => {
    const candidates = emptyCandidates();
    const before = candidates[4]?.[0]?.has(7);
    removeCandidateFromPeers(candidates, { row: 4, col: 4 }, 7);
    const after = candidates[4]?.[0]?.has(7);
    expect(before).toBe(true);
    expect(after).toBe(true);
  });

  it('is idempotent — applying twice equals applying once', () => {
    const candidates = emptyCandidates();
    const once = removeCandidateFromPeers(candidates, { row: 2, col: 5 }, 9);
    const twice = removeCandidateFromPeers(once, { row: 2, col: 5 }, 9);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(once[r]?.[c]).toEqual(twice[r]?.[c]);
      }
    }
  });

  it('leaves the placed cell untouched in the returned grid', () => {
    const candidates = emptyCandidates();
    const result = removeCandidateFromPeers(candidates, { row: 3, col: 3 }, 4);
    // The cell at (3,3) itself was not a peer; the function does not modify it.
    expect(result[3]?.[3]).toEqual(candidates[3]?.[3]);
  });
});

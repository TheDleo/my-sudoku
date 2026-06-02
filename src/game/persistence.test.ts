import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit } from '../types';
import {
  initialEmptyState,
  loadPuzzle,
  setColorMark,
  togglePencilMark,
  selectCell,
} from './reducers';
import { deserialize, load, save, serialize, STORAGE_KEY } from './persistence';
import { makePuzzle } from './testHelpers';

describe('serialize / deserialize round-trip', () => {
  it('preserves cells (including pencilMarks as Sets), given, puzzle, pencilMode, mistakes, elapsedMs', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withMark = togglePencilMark(selected, 3 as Digit);
    const dirty = { ...withMark, pencilMode: true, mistakes: 2, elapsedMs: 5000 };

    const json = serialize(dirty);
    const restored = deserialize(json);

    expect(restored).not.toBeNull();
    expect(restored!.puzzle).toEqual(dirty.puzzle);
    expect(restored!.given).toEqual(dirty.given);
    expect(restored!.cells[1]![1]!.pencilMarks).toBeInstanceOf(Set);
    expect([...restored!.cells[1]![1]!.pencilMarks]).toEqual([3]);
    expect(restored!.pencilMode).toBe(true);
    expect(restored!.mistakes).toBe(2);
    expect(restored!.elapsedMs).toBe(5000);
  });

  it('does NOT serialize selection or history (restored state has defaults)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const dirty = {
      ...selected,
      history: {
        past: [{ cells: selected.cells, pencilMode: false, colorMarks: selected.colorMarks }],
        future: [],
      },
    };
    const restored = deserialize(serialize(dirty));
    expect(restored).not.toBeNull();
    expect(restored!.selection).toEqual({ cell: null, number: null });
    expect(restored!.history).toEqual({ past: [], future: [] });
  });

  it('writes sorted pencil-mark arrays (diff-stable)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    let s = togglePencilMark(selected, 7 as Digit);
    s = togglePencilMark(s, 2 as Digit);
    s = togglePencilMark(s, 5 as Digit);
    const json = serialize(s);
    const parsed = JSON.parse(json) as { cells: { value: null; pencilMarks: number[] }[][] };
    expect(parsed.cells[1]![1]!.pencilMarks).toEqual([2, 5, 7]);
  });

  it('round-trips hintsUsed through serialize → deserialize', () => {
    const state = { ...loadPuzzle(initialEmptyState, makePuzzle()), hintsUsed: 7 };
    const restored = deserialize(serialize(state));
    expect(restored).not.toBeNull();
    expect(restored!.hintsUsed).toBe(7);
  });
});

describe('deserialize error handling', () => {
  it('returns null on malformed JSON', () => {
    expect(deserialize('not json')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(deserialize('{}')).toBeNull();
    expect(deserialize('{"puzzle": {}}')).toBeNull();
  });

  it('returns null on jagged cells/given rows (column count mismatch)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const json = serialize(loaded);
    const parsed = JSON.parse(json) as { cells: unknown[][]; given: unknown[][] };
    parsed.cells[0] = parsed.cells[0]!.slice(0, 8); // 8 cells instead of 9
    expect(deserialize(JSON.stringify(parsed))).toBeNull();
  });
});

describe('load / save', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: () => null,
      length: 0,
    });
  });

  it('save writes serialized state to STORAGE_KEY', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    save(loaded);
    expect(storage[STORAGE_KEY]).toBeDefined();
    const parsed = deserialize(storage[STORAGE_KEY]!);
    expect(parsed!.puzzle.id).toBe('test');
  });

  it('load returns the deserialized state when present', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    save(loaded);
    const restored = load();
    expect(restored).not.toBeNull();
    expect(restored!.puzzle.id).toBe('test');
  });

  it('load returns null when STORAGE_KEY is absent', () => {
    expect(load()).toBeNull();
  });

  it('save swallows quota-exceeded errors without throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    });
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(() => save(loaded)).not.toThrow();
  });
});

describe('colorMarks persistence', () => {
  it('round-trips colorMarks through serialize → deserialize', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const withMarks = setColorMark(
      setColorMark(loaded, { row: 1, col: 2 }, 'A'),
      { row: 7, col: 8 },
      'B',
    );
    const restored = deserialize(serialize(withMarks));
    expect(restored).not.toBeNull();
    expect(restored!.colorMarks[1]![2]).toBe('A');
    expect(restored!.colorMarks[7]![8]).toBe('B');
    expect(restored!.colorMarks[0]![0]).toBeNull();
  });

  it('defaults to all-null grid when colorMarks is absent in saved data', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const json = serialize(loaded);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    delete parsed.colorMarks;
    const restored = deserialize(JSON.stringify(parsed));
    expect(restored).not.toBeNull();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) expect(restored!.colorMarks[r]![c]).toBeNull();
  });
});

describe('hintsUsed fallback', () => {
  it('deserializes legacy saves missing hintsUsed as 0', () => {
    const state = loadPuzzle(initialEmptyState, makePuzzle());
    const raw = JSON.parse(serialize(state)) as Record<string, unknown>;
    delete raw['hintsUsed'];
    const restored = deserialize(JSON.stringify(raw));
    expect(restored).not.toBeNull();
    expect(restored!.hintsUsed).toBe(0);
  });
});

import type { Digit, Puzzle } from '../types';

export function makePuzzle(): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  initialBoard[0]![0] = 5;
  initialBoard[4]![4] = 7;
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
  );
  return { id: 'test', difficulty: 'easy', initialBoard, solution };
}

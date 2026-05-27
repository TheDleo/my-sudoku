import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf, peersOf, unitsContaining } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function key(c: CellCoord): string {
  return `${c.row},${c.col}`;
}

function scanDigit(state: SolverState, digit: Digit): Step | null {
  const candidateCells: CellCoord[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      if (state.candidates[r]![c]!.has(digit)) candidateCells.push({ row: r, col: c });
    }
  }
  if (candidateCells.length < 2) return null;

  const adj = new Map<string, CellCoord[]>();
  for (const cell of candidateCells) adj.set(key(cell), []);
  const allUnits: ReadonlyArray<ReadonlyArray<CellCoord>> = [
    ...rowsOf(),
    ...colsOf(),
    ...boxesOf(),
  ];
  for (const unit of allUnits) {
    const inUnit = cellsWithDigit(state, unit, digit);
    if (inUnit.length !== 2) continue;
    const [a, b] = inUnit;
    adj.get(key(a!))!.push(b!);
    adj.get(key(b!))!.push(a!);
  }

  const colorByKey = new Map<string, 0 | 1>();
  const componentByKey = new Map<string, number>();
  const components: CellCoord[][] = [];
  for (const start of candidateCells) {
    if (colorByKey.has(key(start))) continue;
    if (adj.get(key(start))!.length === 0) continue;
    const queue: CellCoord[] = [start];
    colorByKey.set(key(start), 0);
    const componentIdx = components.length;
    componentByKey.set(key(start), componentIdx);
    const comp: CellCoord[] = [start];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curColor = colorByKey.get(key(cur))!;
      for (const nb of adj.get(key(cur))!) {
        if (colorByKey.has(key(nb))) continue;
        colorByKey.set(key(nb), (curColor === 0 ? 1 : 0) as 0 | 1);
        componentByKey.set(key(nb), componentIdx);
        comp.push(nb);
        queue.push(nb);
      }
    }
    components.push(comp);
  }

  for (let i = 0; i < components.length; i++) {
    const comp = components[i]!;
    if (comp.length < 2) continue;
    const colorA: CellCoord[] = [];
    const colorB: CellCoord[] = [];
    for (const cell of comp) {
      const col = colorByKey.get(key(cell))!;
      if (col === 0) colorA.push(cell);
      else colorB.push(cell);
    }

    const wrappedColor = wrapColor(colorA, colorB);
    if (wrappedColor !== null) {
      const losingCells = wrappedColor === 0 ? colorA : colorB;
      const eliminations: Elimination[] = losingCells.map((cell) => ({ cell, digit }));
      return {
        technique: 'coloring',
        highlights: comp,
        placements: [],
        eliminations,
        explanation: `Coloring: digit ${digit} has a chain where one color repeats inside a unit; that color is eliminated from ${losingCells.length} cells.`,
      };
    }

    const compKeys = new Set(comp.map(key));
    const elimCells: CellCoord[] = [];
    for (const outside of candidateCells) {
      if (compKeys.has(key(outside))) continue;
      const peers = peersOf(outside);
      let seenA = false;
      let seenB = false;
      for (const p of peers) {
        const pk = key(p);
        const c = colorByKey.get(pk);
        if (c === undefined) continue;
        if (componentByKey.get(pk) !== i) continue;
        if (c === 0) seenA = true;
        else seenB = true;
        if (seenA && seenB) break;
      }
      if (seenA && seenB) elimCells.push(outside);
    }
    if (elimCells.length > 0) {
      const eliminations: Elimination[] = elimCells.map((cell) => ({ cell, digit }));
      return {
        technique: 'coloring',
        highlights: comp,
        placements: [],
        eliminations,
        explanation: `Coloring: digit ${digit} forms a 2-colored chain; ${elimCells.length} outside cell(s) see both colors and cannot be ${digit}.`,
      };
    }
  }
  return null;
}

function wrapColor(colorA: CellCoord[], colorB: CellCoord[]): 0 | 1 | null {
  if (sameColorSharesUnit(colorA)) return 0;
  if (sameColorSharesUnit(colorB)) return 1;
  return null;
}

function sameColorSharesUnit(cells: CellCoord[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i]!;
      const b = cells[j]!;
      const aUnits = unitsContaining(a);
      for (const u of aUnits) {
        if (u.some((k) => k.row === b.row && k.col === b.col)) return true;
      }
    }
  }
  return false;
}

export const coloring: TechniqueDetector = (state: SolverState): Step | null => {
  for (const digit of DIGITS) {
    const step = scanDigit(state, digit);
    if (step) return step;
  }
  return null;
};

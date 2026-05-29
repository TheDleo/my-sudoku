import './Board.css';
import { useGameStore } from './store';
import { getHighlights } from './highlights';
import { Cell } from './Cell';

export function Board() {
  const cells = useGameStore((s) => s.cells);
  const given = useGameStore((s) => s.given);
  const selection = useGameStore((s) => s.selection);

  const highlights = getHighlights({ cells, given, selection });

  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (
          <Cell key={`${r}-${c}`} row={r} col={c} highlight={highlights[r]![c]!} />
        )),
      )}
    </div>
  );
}

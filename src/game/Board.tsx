import './Board.css';
import { useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { getHighlights } from './highlights';
import { handleKey } from './keyboard';
import { Cell } from './Cell';

export function Board() {
  const cells = useGameStore((s) => s.cells);
  const given = useGameStore((s) => s.given);
  const selection = useGameStore((s) => s.selection);
  const pencilMode = useGameStore((s) => s.pencilMode);
  const currentHint = useGameStore((s) => s.currentHint);
  const hintLevel = useGameStore((s) => s.hintLevel);
  const colorMarks = useGameStore((s) => s.colorMarks);
  const possiblePlacements = useSettingsStore((s) => s.possiblePlacements);
  const boardRef = useRef<HTMLDivElement>(null);

  const highlights = getHighlights(
    { cells, given, selection, pencilMode, currentHint, hintLevel, colorMarks },
    possiblePlacements,
  );

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) =>
      handleKey(e, useGameStore.getState(), useGameStore.getState());
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, []);

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]');
    const store = useGameStore.getState();
    if (!target) {
      store.selectCell(null);
      store.setSelectedNumber(null);
      return;
    }
    const row = parseInt(target.dataset.row!, 10);
    const col = parseInt(target.dataset.col!, 10);
    if (store.colorMode !== null) {
      const current = store.colorMarks[row]![col];
      store.setColorMark({ row, col }, current === store.colorMode ? null : store.colorMode);
      return;
    }
    if (store.selection.cell?.row === row && store.selection.cell?.col === col) {
      store.selectCell(null);
      store.setSelectedNumber(null);
    } else {
      store.selectCell({ row, col });
      store.setSelectedNumber(store.cells[row]![col]!.value);
    }
  };

  return (
    <div
      className="board"
      role="grid"
      aria-label="Sudoku board"
      tabIndex={0}
      ref={boardRef}
      onClick={handleBoardClick}
    >
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (
          <Cell key={`${r}-${c}`} row={r} col={c} highlight={highlights[r]![c]!} />
        )),
      )}
    </div>
  );
}

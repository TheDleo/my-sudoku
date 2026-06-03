import './NumberPad.css';
import type { Digit } from '../types';
import { useGameStore } from './store';
import { getRemainingCounts } from './helpers';

const ROW1: Digit[] = [1, 2, 3, 4, 5];
const ROW2: Digit[] = [6, 7, 8, 9];

export function NumberPad() {
  const cells = useGameStore((s) => s.cells);
  const remaining = getRemainingCounts(cells);

  const handleDigit = (d: Digit) => {
    const store = useGameStore.getState();
    if (store.selection.cell !== null) {
      if (store.pencilMode) {
        store.togglePencilMark(d);
      } else {
        store.placeDigit(d);
      }
    } else {
      store.setSelectedNumber(d);
    }
  };

  const handleErase = () => {
    useGameStore.getState().eraseCell();
  };

  const renderDigit = (d: Digit) => (
    <button
      key={d}
      className="number-pad__digit"
      data-digit={d}
      disabled={remaining[d] === 0}
      onClick={() => handleDigit(d)}
    >
      <span className="number-pad__label">{d}</span>
      <span className="number-pad__count">{remaining[d]}</span>
    </button>
  );

  return (
    <div className="number-pad" onClick={(e) => e.stopPropagation()}>
      <div className="number-pad__row">{ROW1.map(renderDigit)}</div>
      <div className="number-pad__row">
        {ROW2.map(renderDigit)}
        <button className="number-pad__erase" aria-label="Erase" onClick={handleErase}>
          ⌫
        </button>
      </div>
    </div>
  );
}

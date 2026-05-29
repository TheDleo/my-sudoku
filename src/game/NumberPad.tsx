import './NumberPad.css';
import type { Digit } from '../types';
import { useGameStore } from './store';
import { getRemainingCounts } from './helpers';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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

  return (
    <div className="number-pad" onClick={(e) => e.stopPropagation()}>
      {DIGITS.map((d) => (
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
      ))}
      <button className="number-pad__erase" aria-label="Erase" onClick={handleErase}>
        ⌫
      </button>
    </div>
  );
}

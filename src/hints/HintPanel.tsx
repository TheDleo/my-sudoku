import './HintPanel.css';
import { useGameStore } from '../game/store';
import { TECHNIQUE_LABELS } from './engine';

export function HintPanel() {
  const currentHint = useGameStore((s) => s.currentHint);
  const hintLevel = useGameStore((s) => s.hintLevel);

  const handleRequestHint = () => useGameStore.getState().requestHint();
  const handleAdvanceHint = () => useGameStore.getState().advanceHint();
  const handleDismissHint = () => useGameStore.getState().dismissHint();

  if (currentHint === null) {
    return (
      <div className="hint-panel">
        <button className="hint-panel__request" onClick={handleRequestHint}>
          Hint
        </button>
      </div>
    );
  }

  return (
    <div className="hint-panel hint-panel--active">
      <button className="hint-panel__dismiss" onClick={handleDismissHint} aria-label="Dismiss hint">
        ×
      </button>
      <div className="hint-panel__content">
        {hintLevel === 1 && <span>There is a technique you can apply.</span>}
        {hintLevel >= 2 && <span>{TECHNIQUE_LABELS[currentHint.technique]}</span>}
        {hintLevel >= 4 && <p className="hint-panel__explanation">{currentHint.explanation}</p>}
      </div>
      {hintLevel < 4 && (
        <button className="hint-panel__more" onClick={handleAdvanceHint}>
          Show more
        </button>
      )}
    </div>
  );
}

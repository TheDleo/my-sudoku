import './HintPanel.css';
import { useState } from 'react';
import { useGameStore } from '../game/store';
import { TECHNIQUE_LABELS } from './engine';
import { TechniqueExplainer } from './TechniqueExplainer';
import type { TechniqueName } from '../solver/types';

export function HintPanel() {
  const currentHint = useGameStore((s) => s.currentHint);
  const hintLevel = useGameStore((s) => s.hintLevel);
  const [explainerTechnique, setExplainerTechnique] = useState<TechniqueName | null>(null);

  const handleRequestHint = () => useGameStore.getState().requestHint();
  const handleAdvanceHint = () => useGameStore.getState().advanceHint();
  const handleDismissHint = () => useGameStore.getState().dismissHint();

  if (currentHint === null) {
    return (
      <div className="hint-panel" onClick={(e) => e.stopPropagation()}>
        <button className="hint-panel__request" onClick={handleRequestHint}>
          Hint
        </button>
      </div>
    );
  }

  return (
    <div className="hint-panel hint-panel--active" onClick={(e) => e.stopPropagation()}>
      <button className="hint-panel__dismiss" onClick={handleDismissHint} aria-label="Dismiss hint">
        ×
      </button>
      <div className="hint-panel__content">
        {hintLevel === 1 && <span>There is a technique you can apply.</span>}
        {hintLevel >= 2 && (
          <span className="hint-panel__technique-row">
            <span>{TECHNIQUE_LABELS[currentHint.technique]}</span>
            {hintLevel < 4 && (
              <button
                className="hint-panel__explainer-link"
                onClick={() => setExplainerTechnique(currentHint.technique)}
              >
                What is this?
              </button>
            )}
          </span>
        )}
        {hintLevel >= 4 && <p className="hint-panel__explanation">{currentHint.explanation}</p>}
      </div>
      {hintLevel < 4 && (
        <button className="hint-panel__more" onClick={handleAdvanceHint}>
          Show more
        </button>
      )}
      <TechniqueExplainer
        technique={explainerTechnique}
        onClose={() => setExplainerTechnique(null)}
      />
    </div>
  );
}

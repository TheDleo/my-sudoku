import './TechniqueExplainer.css';
import { useEffect, useRef } from 'react';
import type { TechniqueName } from '../solver/types';
import { EXPLAINERS } from './explainers/index';

type Props = {
  technique: TechniqueName | null;
  onClose: () => void;
};

export function TechniqueExplainer({ technique, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!technique) return;
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [technique, onClose]);

  if (!technique) return null;

  const { title, summary, Diagram } = EXPLAINERS[technique];

  return (
    <div className="technique-explainer__backdrop" onClick={onClose}>
      <div
        className="technique-explainer__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="technique-explainer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="technique-explainer__header">
          <h2 id="technique-explainer-title" className="technique-explainer__title">
            {title}
          </h2>
          <button
            className="technique-explainer__close"
            aria-label="Close"
            onClick={onClose}
            ref={closeRef}
          >
            ×
          </button>
        </div>
        <div className="technique-explainer__diagram">
          <Diagram />
        </div>
        <p className="technique-explainer__summary">{summary}</p>
      </div>
    </div>
  );
}

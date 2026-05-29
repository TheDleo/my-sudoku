import './ActionBar.css';
import { useGameStore } from './store';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);

  const handlePencilToggle = () => {
    useGameStore.getState().togglePencilMode();
  };

  const handleFillCandidates = () => {
    useGameStore.getState().fillCandidates();
  };

  return (
    <div className="action-bar" onClick={(e) => e.stopPropagation()}>
      <button
        className={`action-bar__pencil${pencilMode ? ' action-bar__pencil--active' : ''}`}
        aria-pressed={pencilMode}
        onClick={handlePencilToggle}
      >
        ✏️ Pencil
      </button>
      <button className="action-bar__candidates" onClick={handleFillCandidates}>
        Candidates
      </button>
    </div>
  );
}

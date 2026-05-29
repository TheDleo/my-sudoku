import './ActionBar.css';
import { useGameStore } from './store';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);
  const canUndo = useGameStore((s) => s.history.past.length > 0);
  const canRedo = useGameStore((s) => s.history.future.length > 0);

  const handlePencilToggle = () => {
    useGameStore.getState().togglePencilMode();
  };

  const handleFillCandidates = () => {
    useGameStore.getState().fillCandidates();
  };

  const handleUndo = () => {
    useGameStore.getState().undo();
  };

  const handleRedo = () => {
    useGameStore.getState().redo();
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
      <button className="action-bar__undo" onClick={handleUndo} disabled={!canUndo}>
        Undo
      </button>
      <button className="action-bar__redo" onClick={handleRedo} disabled={!canRedo}>
        Redo
      </button>
    </div>
  );
}

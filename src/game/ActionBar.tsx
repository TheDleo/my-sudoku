// src/game/ActionBar.tsx
import './ActionBar.css';
import { useState } from 'react';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { SettingsModal } from '../settings/SettingsModal';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);
  const canUndo = useGameStore((s) => s.history.past.length > 0);
  const canRedo = useGameStore((s) => s.history.future.length > 0);
  const colorMode = useGameStore((s) => s.colorMode);
  const autoCandidates = useSettingsStore((s) => s.autoCandidates);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      {!autoCandidates && (
        <button className="action-bar__candidates" onClick={handleFillCandidates}>
          Candidates
        </button>
      )}
      <button className="action-bar__undo" onClick={handleUndo} disabled={!canUndo}>
        Undo
      </button>
      <button className="action-bar__redo" onClick={handleRedo} disabled={!canRedo}>
        Redo
      </button>
      <button
        className={`action-bar__color-a${colorMode === 'A' ? ' action-bar__color-a--active' : ''}`}
        aria-pressed={colorMode === 'A'}
        onClick={() => useGameStore.getState().toggleColorMode('A')}
      >
        🔵 A
      </button>
      <button
        className={`action-bar__color-b${colorMode === 'B' ? ' action-bar__color-b--active' : ''}`}
        aria-pressed={colorMode === 'B'}
        onClick={() => useGameStore.getState().toggleColorMode('B')}
      >
        🟡 B
      </button>
      <button
        className="action-bar__settings"
        aria-label="Settings"
        onClick={() => setIsSettingsOpen(true)}
      >
        ⚙
      </button>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

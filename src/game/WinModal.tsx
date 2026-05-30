import './WinModal.css';
import type { Difficulty } from '../types';
import { useGameStore } from './store';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function WinModal() {
  const mistakes = useGameStore((s) => s.mistakes);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const difficulty = useGameStore((s) => s.puzzle.difficulty);

  const handleNewGame = () => useGameStore.getState().setScreen('landing');
  const handleClose = () => useGameStore.getState().dismissWin();

  return (
    <div className="win-backdrop" onClick={handleClose}>
      <div className="win-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="win-title">Puzzle Complete!</h2>
        <p className="win-difficulty">{DIFFICULTY_LABELS[difficulty]}</p>
        <p className="win-stat">Mistakes: {mistakes}</p>
        <p className="win-stat">Time: {formatTime(elapsedMs)}</p>
        <div className="win-actions">
          <button className="win-btn win-btn--new-game" onClick={handleNewGame}>
            New Game
          </button>
          <button className="win-btn win-btn--close" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

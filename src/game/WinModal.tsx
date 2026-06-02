import { useState, useEffect, useRef } from 'react';
import './WinModal.css';
import type { Difficulty } from '../types';
import { formatTime } from './helpers';
import { useGameStore } from './store';
import { Confetti } from './Confetti';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export function WinModal() {
  const mistakes = useGameStore((s) => s.mistakes);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const difficulty = useGameStore((s) => s.puzzle.difficulty);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const [showConfetti, setShowConfetti] = useState(true);
  const newGameRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    newGameRef.current?.focus();
  }, []);

  const handleNewGame = () => useGameStore.getState().setScreen('landing');
  const handleClose = () => useGameStore.getState().dismissWin();

  return (
    <div className="win-backdrop" onClick={handleClose}>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div
        className="win-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="win-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="win-modal-title" className="win-title">
          Puzzle Complete!
        </h2>
        <p className="win-difficulty">{DIFFICULTY_LABELS[difficulty]}</p>
        <p className="win-stat">Mistakes: {mistakes}</p>
        <p className="win-stat">Hints: {hintsUsed}</p>
        <p className="win-stat">Time: {formatTime(elapsedMs)}</p>
        <div className="win-actions">
          <button className="win-btn win-btn--new-game" onClick={handleNewGame} ref={newGameRef}>
            New Game
          </button>
          <button className="win-btn" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import './GameHeader.css';
import { useEffect } from 'react';
import type { Difficulty } from '../types';
import { formatTime } from './helpers';
import { useGameStore } from './store';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export function GameHeader() {
  const difficulty = useGameStore((s) => s.puzzle.difficulty);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const won = useGameStore((s) => s.won);

  useEffect(() => {
    if (won) return;
    const id = setInterval(() => useGameStore.getState().tickTimer(), 1000);
    return () => clearInterval(id);
  }, [won]);

  const handleNewGame = () => {
    const confirmed = window.confirm('Start a new game? Your current progress will be lost.');
    if (confirmed) {
      useGameStore.getState().setScreen('landing');
    }
  };

  return (
    <div className="game-header" onClick={(e) => e.stopPropagation()}>
      <span className="game-header__difficulty">{DIFFICULTY_LABELS[difficulty]}</span>
      <span className="game-header__time">{formatTime(elapsedMs)}</span>
      <button className="game-header__new-game" onClick={handleNewGame}>
        New Game
      </button>
    </div>
  );
}

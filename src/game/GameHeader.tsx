// src/game/GameHeader.tsx
import './GameHeader.css';
import { useState, useEffect } from 'react';
import type { Difficulty } from '../types';
import { formatTime } from './helpers';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { SettingsModal } from '../settings/SettingsModal';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export function GameHeader() {
  const difficulty = useGameStore((s) => s.puzzle.difficulty);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const mistakes = useGameStore((s) => s.mistakes);
  const won = useGameStore((s) => s.won);
  const showTimer = useSettingsStore((s) => s.showTimer);
  const showMistakes = useSettingsStore((s) => s.showMistakes);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      <div className="game-header__top">
        <button
          className="game-header__settings"
          aria-label="Settings"
          onClick={() => setIsSettingsOpen(true)}
        >
          ⚙
        </button>
        <div className="game-header__center">
          <h1 className="game-header__title">Sudoku</h1>
          <div className="game-header__stats">
            <span className="game-header__difficulty">{DIFFICULTY_LABELS[difficulty]}</span>
            {showTimer && <span className="game-header__time">{formatTime(elapsedMs)}</span>}
            {showMistakes && <span className="game-header__mistakes">✕{mistakes}</span>}
          </div>
        </div>
        <button className="game-header__new-game" onClick={handleNewGame}>
          New Game
        </button>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

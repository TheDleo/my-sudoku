import { useState } from 'react';
import './LandingScreen.css';
import type { Difficulty } from '../types';
import { workerClient } from '../generator/client';
import * as persistence from '../game/persistence';
import { useGameStore } from '../game/store';

const DIFFICULTIES: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'medium', label: 'Medium' },
  { difficulty: 'hard', label: 'Hard' },
  { difficulty: 'expert', label: 'Expert' },
];

export function LandingScreen() {
  const [generating, setGenerating] = useState<Difficulty | null>(null);
  const [hasSavedGame] = useState(() => {
    const saved = persistence.load();
    return saved !== null && saved.puzzle.id !== '';
  });

  const handleDifficulty = async (d: Difficulty) => {
    setGenerating(d);
    const puzzle = await workerClient.getPuzzle(d);
    useGameStore.getState().loadPuzzle(puzzle);
    useGameStore.getState().setScreen('game');
  };

  const handleResume = () => {
    useGameStore.getState().resumeGame();
  };

  return (
    <div className="landing-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="landing-card">
        <p className="landing-title">Sudoku</p>
        {hasSavedGame && (
          <button
            className="landing-btn landing-btn--resume"
            onClick={handleResume}
            disabled={generating !== null}
          >
            Resume
          </button>
        )}
        <div className="landing-difficulties">
          {DIFFICULTIES.map(({ difficulty, label }) => (
            <button
              key={difficulty}
              className="landing-btn"
              onClick={() => {
                void handleDifficulty(difficulty);
              }}
              disabled={generating !== null}
            >
              {generating === difficulty ? 'Generating…' : label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

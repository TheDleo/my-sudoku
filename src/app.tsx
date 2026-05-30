import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
import { GameHeader } from './game/GameHeader';
import { HintPanel } from './hints/HintPanel';
import { NumberPad } from './game/NumberPad';
import { LandingScreen } from './landing/LandingScreen';
import { useGameStore } from './game/store';

export function App() {
  const screen = useGameStore((s) => s.screen);

  const handleMainClick = () => {
    const store = useGameStore.getState();
    store.selectCell(null);
    store.setSelectedNumber(null);
  };

  return (
    <main onClick={handleMainClick}>
      {screen === 'landing' && <LandingScreen />}
      <h1>Sudoku</h1>
      {screen === 'game' && <GameHeader />}
      <Board />
      <ActionBar />
      <HintPanel />
      <NumberPad />
    </main>
  );
}

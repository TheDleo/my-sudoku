import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
import { GameHeader } from './game/GameHeader';
import { HintPanel } from './hints/HintPanel';
import { NumberPad } from './game/NumberPad';
import { LandingScreen } from './landing/LandingScreen';
import { WinModal } from './game/WinModal';
import { useGameStore } from './game/store';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const won = useGameStore((s) => s.won);

  const handleMainClick = () => {
    const store = useGameStore.getState();
    store.selectCell(null);
    store.setSelectedNumber(null);
  };

  return (
    <main onClick={handleMainClick}>
      {screen === 'landing' && <LandingScreen />}
      {won && screen === 'game' && <WinModal />}
      <h1>Sudoku</h1>
      {screen === 'game' && <GameHeader />}
      <Board />
      <ActionBar />
      <HintPanel />
      <NumberPad />
    </main>
  );
}

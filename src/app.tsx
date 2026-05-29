import { Board } from './game/Board';
import { useGameStore } from './game/store';

export function App() {
  const handleMainClick = () => {
    const store = useGameStore.getState();
    store.selectCell(null);
    store.setSelectedNumber(null);
  };

  return (
    <main onClick={handleMainClick}>
      <h1>Sudoku</h1>
      <Board />
    </main>
  );
}

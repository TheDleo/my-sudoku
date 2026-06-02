import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createWorkerClient } from './generator/workerClient';
import { useGameStore } from './game/store';
import { applyTheme } from './settings/theme';
import { useSettingsStore } from './settings/store';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

declare global {
  interface Window {
    __sudoku__?: {
      createWorkerClient: typeof createWorkerClient;
      store: typeof useGameStore;
    };
  }
}
window.__sudoku__ = { createWorkerClient, store: useGameStore };

applyTheme(useSettingsStore.getState().theme);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

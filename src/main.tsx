import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createWorkerClient } from './generator/workerClient';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Debug/test hook: exposes the worker client factory for Playwright tests and
// manual experimentation. Harmless in a fully client-side app; safe to remove
// if __sudoku__ ever grows beyond debug use.
declare global {
  interface Window {
    __sudoku__?: { createWorkerClient: typeof createWorkerClient };
  }
}
window.__sudoku__ = { createWorkerClient };

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

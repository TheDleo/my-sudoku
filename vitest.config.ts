import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/vitest-setup.ts'],
    css: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache}/**', 'tests/e2e/**'],
  },
});

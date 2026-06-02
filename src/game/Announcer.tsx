import { useGameStore } from './store';
import { TECHNIQUE_LABELS } from '../hints/engine';

export function Announcer() {
  const hintLevel = useGameStore((s) => s.hintLevel);
  const currentHint = useGameStore((s) => s.currentHint);

  let message = '';
  if (hintLevel === 2 && currentHint !== null) {
    message = `Hint: ${TECHNIQUE_LABELS[currentHint.technique]}. Press Show more for details.`;
  }

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

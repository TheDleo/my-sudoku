// src/settings/SettingsModal.tsx
import './SettingsModal.css';
import { useEffect, useRef } from 'react';
import { useSettingsStore } from './store';
import type { Theme } from './types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsModal({ isOpen, onClose }: Props) {
  const autoCandidates = useSettingsStore((s) => s.autoCandidates);
  const possiblePlacements = useSettingsStore((s) => s.possiblePlacements);
  const showTimer = useSettingsStore((s) => s.showTimer);
  const showMistakes = useSettingsStore((s) => s.showMistakes);
  const theme = useSettingsStore((s) => s.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal__backdrop" onClick={onClose}>
      <div
        className="settings-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal__header">
          <h2 id="settings-modal-title" className="settings-modal__title">
            Settings
          </h2>
          <button
            className="settings-modal__close"
            aria-label="Close"
            onClick={onClose}
            ref={closeRef}
          >
            ×
          </button>
        </div>

        <div className="settings-modal__body">
          <label className="settings-modal__row">
            <span>Auto-candidates</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={autoCandidates}
              onChange={() => updateSetting('autoCandidates', !autoCandidates)}
            />
          </label>
          <label className="settings-modal__row">
            <span>Possible placements</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={possiblePlacements}
              onChange={() => updateSetting('possiblePlacements', !possiblePlacements)}
            />
          </label>
          <label className="settings-modal__row">
            <span>Show timer</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={showTimer}
              onChange={() => updateSetting('showTimer', !showTimer)}
            />
          </label>
          <label className="settings-modal__row">
            <span>Show mistakes</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={showMistakes}
              onChange={() => updateSetting('showMistakes', !showMistakes)}
            />
          </label>

          <div className="settings-modal__section">
            <span className="settings-modal__section-label">Theme</span>
            <div className="settings-modal__theme-group" role="group" aria-label="Theme">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  className={`settings-modal__theme-btn${theme === value ? ' settings-modal__theme-btn--active' : ''}`}
                  aria-pressed={theme === value}
                  onClick={() => updateSetting('theme', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

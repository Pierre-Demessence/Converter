import { useState, useRef, useEffect, useCallback } from 'react';
import type { Theme } from '../hooks/useTheme';

const ICONS: Record<Theme, string> = {
  light: '☀️',
  system: '💻',
  dark: '🌙',
};

const LABELS: Record<Theme, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
};

const OPTIONS: Theme[] = ['light', 'system', 'dark'];

interface ThemeToggleProps {
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onChangeTheme }: ThemeToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, close]);

  return (
    <div className="theme-dropdown" ref={ref}>
      <button
        type="button"
        className="theme-dropdown__trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${LABELS[theme]}`}
      >
        <span className="theme-dropdown__icon">{ICONS[theme]}</span>
        <span className="theme-dropdown__label">{LABELS[theme]}</span>
        <svg className="theme-dropdown__chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {open && (
        <ul className="theme-dropdown__menu" role="listbox" aria-label="Theme">
          {OPTIONS.map(opt => (
            <li key={opt} role="option" aria-selected={theme === opt}>
              <button
                type="button"
                className={`theme-dropdown__item${theme === opt ? ' theme-dropdown__item--active' : ''}`}
                onClick={() => { onChangeTheme(opt); close(); }}
              >
                <span>{ICONS[opt]}</span>
                <span>{LABELS[opt]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

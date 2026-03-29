import { useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { FormatInfo } from '../lib/types';

interface FormatPickerProps {
  formats: FormatInfo[];
  selected: FormatInfo | null;
  onSelect: (format: FormatInfo) => void;
}

export function FormatPicker({ formats, selected, onSelect }: FormatPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const idx = formats.findIndex(f => f.extension === selected?.extension);
    let next = idx;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (idx + 1) % formats.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (idx - 1 + formats.length) % formats.length;
    } else {
      return;
    }

    onSelect(formats[next]);
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[next]?.focus();
  }, [formats, selected, onSelect]);

  return (
    <div
      className="format-picker"
      role="radiogroup"
      aria-label="Output format"
      ref={groupRef}
      onKeyDown={handleKeyDown}
    >
      {formats.map((format, i) => {
        const isSelected = selected?.extension === format.extension;
        return (
          <button
            key={format.extension}
            role="radio"
            aria-checked={isSelected}
            className={`format-pill${isSelected ? ' format-pill--selected' : ''}`}
            onClick={() => onSelect(format)}
            tabIndex={isSelected || (!selected && i === 0) ? 0 : -1}
            type="button"
          >
            {format.label}
          </button>
        );
      })}
    </div>
  );
}

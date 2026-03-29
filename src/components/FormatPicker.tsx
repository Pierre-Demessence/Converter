import type { FormatInfo } from '../lib/types';

interface FormatPickerProps {
  formats: FormatInfo[];
  selected: FormatInfo | null;
  onSelect: (format: FormatInfo) => void;
}

export function FormatPicker({ formats, selected, onSelect }: FormatPickerProps) {
  return (
    <div className="format-picker">
      {formats.map(format => (
        <button
          key={format.extension}
          className={`format-pill${selected?.extension === format.extension ? ' format-pill--selected' : ''}`}
          onClick={() => onSelect(format)}
          type="button"
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}

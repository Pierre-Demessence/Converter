import { useCallback, useMemo, useRef, useState } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { getAcceptString, getFormatsByCategory } from '../lib/formats';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
}

export function DropZone({ onFilesAdded }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const acceptString = useMemo(() => getAcceptString(), []);
  const formatsByCategory = useMemo(() => getFormatsByCategory(), []);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesAdded(files);
  }, [onFilesAdded]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFilesAdded(files);
    e.target.value = '';
  }, [onFilesAdded]);

  return (
    <div
      className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to browse"
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileChange}
        className="dropzone__input"
      />

      <div className="dropzone__icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M24 32V16M24 16L17 23M24 16L31 23"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="dropzone__title">Drop files here or click to browse</p>
      <div className="dropzone__formats">
        {Object.entries(formatsByCategory).map(([category, labels]) => (
          <p key={category} className="dropzone__format-row">
            <span className="dropzone__format-category">{category}</span>
            {labels.join(', ')}
          </p>
        ))}
      </div>
    </div>
  );
}

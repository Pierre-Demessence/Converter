import type { ConversionJob, FormatInfo } from '../lib/types';
import { FormatPicker } from './FormatPicker';

interface ConversionCardProps {
  job: ConversionJob;
  availableFormats: FormatInfo[];
  onSelectFormat: (format: FormatInfo) => void;
  onConvert: () => void;
  onDownload: () => void;
  onRemove: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  image: '🖼️',
  audio: '🎵',
  video: '🎬',
  document: '📄',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function ConversionCard({
  job,
  availableFormats,
  onSelectFormat,
  onConvert,
  onDownload,
  onRemove,
}: ConversionCardProps) {
  return (
    <div className="card">
      <div className="card__header">
        <div className="card__file-info">
          <span className="card__icon">
            {CATEGORY_ICONS[job.inputFormat.category] ?? '📁'}
          </span>
          <div className="card__file-details">
            <p className="card__filename">{job.file.name}</p>
            <p className="card__meta">
              {job.inputFormat.label} · {formatSize(job.file.size)}
            </p>
          </div>
        </div>
        <button
          className="card__remove"
          onClick={onRemove}
          aria-label="Remove file"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M5 5L13 13M13 5L5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="card__body">
        <p className="card__label">Convert to</p>
        <FormatPicker
          formats={availableFormats}
          selected={job.outputFormat}
          onSelect={onSelectFormat}
        />
      </div>

      {job.status === 'converting' && (
        <div className="card__progress">
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <span className="card__progress-text">
            {Math.round(job.progress)}%
          </span>
        </div>
      )}

      {job.status === 'error' && (
        <div className="card__error">{job.error}</div>
      )}

      <div className="card__actions">
        {job.status === 'done' ? (
          <button className="btn btn--success" onClick={onDownload} type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V11M8 11L5 8M8 11L11 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Download {job.outputFormat?.label}
            {job.outputBlob ? ` (${formatSize(job.outputBlob.size)})` : ''}
          </button>
        ) : (
          <button
            className="btn btn--primary"
            onClick={onConvert}
            disabled={!job.outputFormat || job.status === 'converting'}
            type="button"
          >
            {job.status === 'converting' ? 'Converting…' : 'Convert'}
          </button>
        )}
      </div>
    </div>
  );
}

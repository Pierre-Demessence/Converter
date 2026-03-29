import { useState, useCallback, useRef, useMemo } from 'react';
import type { ConversionJob, FormatInfo } from './lib/types';
import { detectFormat, getOutputFormats } from './lib/formats';
import { convertFile } from './lib/converter';
import { checkFileSize } from './lib/validation';
import { useTheme } from './hooks/useTheme';
import { DropZone } from './components/DropZone';
import { ConversionCard } from './components/ConversionCard';
import { ThemeToggle } from './components/ThemeToggle';
import './App.css';

let nextId = 1;

export default function App() {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const [batchSize, setBatchSize] = useState(0);
  const { theme, setTheme } = useTheme();

  const updateJob = useCallback((id: string, updates: Partial<ConversionJob>) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...updates } : j)));
  }, []);

  const handleFilesAdded = useCallback((files: File[]) => {
    const newJobs: ConversionJob[] = [];
    for (const file of files) {
      const format = detectFormat(file);
      if (format) {
        const sizeError = checkFileSize(file, format.category);
        newJobs.push({
          id: String(nextId++),
          file,
          inputFormat: format,
          outputFormat: null,
          status: sizeError ? 'error' : 'idle',
          progress: 0,
          outputBlob: null,
          error: sizeError,
          errorKind: sizeError ? 'validation' : undefined,
        });
      }
    }
    if (newJobs.length > 0) {
      setJobs(prev => [...prev, ...newJobs]);
    }
  }, []);

  const handleSelectFormat = useCallback((id: string, format: FormatInfo) => {
    updateJob(id, { outputFormat: format, status: 'idle', error: null });
  }, [updateJob]);

  const handleConvert = useCallback(async (id: string) => {
    const job = jobsRef.current.find(j => j.id === id);
    if (!job?.outputFormat) return;

    updateJob(id, { status: 'converting', progress: 0, error: null, outputBlob: null });

    try {
      const blob = await convertFile(
        job.file,
        job.inputFormat,
        job.outputFormat,
        (progress) => updateJob(id, { progress }),
      );
      updateJob(id, { status: 'done', progress: 100, outputBlob: blob });
    } catch (err) {
      updateJob(id, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err ?? 'Conversion failed'),
        errorKind: 'conversion',
      });
    }
  }, [updateJob]);

  const handleConvertAll = useCallback(async () => {
    const pending = jobsRef.current.filter(j => j.outputFormat && j.status === 'idle');
    setBatchSize(pending.length);
    for (const job of pending) {
      await handleConvert(job.id);
    }
    setBatchSize(0);
  }, [handleConvert]);

  const handleRetryFailed = useCallback(async () => {
    if (convertingCount > 0) return;
    const failed = jobsRef.current.filter(j => j.status === 'error' && j.errorKind !== 'validation');
    setBatchSize(failed.length);
    for (const job of failed) {
      await handleConvert(job.id);
    }
    setBatchSize(0);
  }, [handleConvert, convertingCount]);

  const handleDownload = useCallback((id: string) => {
    const job = jobsRef.current.find(j => j.id === id);
    if (!job?.outputBlob || !job.outputFormat) return;

    const name = job.file.name.replace(/\.[^.]+$/, '') + '.' + job.outputFormat.extension;
    const url = URL.createObjectURL(job.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setJobs([]);
  }, []);

  const readyCount = jobs.filter(j => j.outputFormat && j.status === 'idle').length;
  const doneCount = jobs.filter(j => j.status === 'done').length;
  const failedCount = jobs.filter(j => j.status === 'error' && j.errorKind !== 'validation').length;
  const convertingCount = jobs.filter(j => j.status === 'converting').length;
  const processedCount = doneCount + failedCount;

  const statusSummary = useMemo(() => {
    const parts: string[] = [];
    if (convertingCount) parts.push(`${convertingCount} converting`);
    if (doneCount) parts.push(`${doneCount} done`);
    if (failedCount) parts.push(`${failedCount} failed`);
    if (readyCount) parts.push(`${readyCount} ready`);
    return parts.join(', ');
  }, [convertingCount, doneCount, failedCount, readyCount]);

  return (
    <div className="app">
      <header className="header">
        <ThemeToggle theme={theme} onChangeTheme={setTheme} />
        <h1 className="header__title">Converter</h1>
        <p className="header__subtitle">
          Convert files entirely in your browser. Private. Fast. No uploads.
        </p>
        <span className="badge">100% Client-Side</span>
      </header>

      <main className="main">
        <DropZone onFilesAdded={handleFilesAdded} />

        {jobs.length > 0 && (
          <>
            <div className="toolbar">
              <span className="toolbar__count">
                {jobs.length} file{jobs.length !== 1 ? 's' : ''}
                {batchSize > 0 && (
                  <> &mdash; {processedCount} of {batchSize} processed</>
                )}
              </span>
              <div className="toolbar__actions">
                {readyCount > 0 && (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={handleConvertAll}
                    type="button"
                  >
                    Convert All ({readyCount})
                  </button>
                )}
                {failedCount > 0 && convertingCount === 0 && (
                  <button
                    className="btn btn--outline btn--sm"
                    onClick={handleRetryFailed}
                    type="button"
                  >
                    Retry Failed ({failedCount})
                  </button>
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={handleClearAll}
                  type="button"
                >
                  Clear All
                </button>
              </div>
            </div>

            {batchSize > 0 && (
              <div
                className="batch-progress"
                role="progressbar"
                aria-valuenow={processedCount}
                aria-valuemin={0}
                aria-valuemax={batchSize}
                aria-label={`Batch progress: ${doneCount} completed, ${failedCount} failed out of ${batchSize} files`}
              >
                <div
                  className="batch-progress__fill"
                  style={{ width: `${(processedCount / batchSize) * 100}%` }}
                />
              </div>
            )}

            <div className="jobs">
              {jobs.map(job => (
                <ConversionCard
                  key={job.id}
                  job={job}
                  availableFormats={getOutputFormats(job.inputFormat)}
                  onSelectFormat={f => handleSelectFormat(job.id, f)}
                  onConvert={() => handleConvert(job.id)}
                  onDownload={() => handleDownload(job.id)}
                  onRemove={() => handleRemove(job.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>All processing happens locally. Files never leave your device.</p>
      </footer>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusSummary}
      </div>
    </div>
  );
}

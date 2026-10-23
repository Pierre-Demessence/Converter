import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { FormatInfo } from './lib/types';
import { getOutputFormats } from './lib/formats';
import { convertFile } from './lib/converter';
import { canStart, createJob, getSummary, initialJobsState, jobsReducer } from './lib/jobs';
import { useTheme } from './hooks/useTheme';
import { DropZone } from './components/DropZone';
import { ConversionCard } from './components/ConversionCard';
import { ThemeToggle } from './components/ThemeToggle';
import './App.css';

let nextId = 1;

export default function App() {
  const [state, dispatch] = useReducer(jobsReducer, initialJobsState);
  const stateRef = useRef(state);
  stateRef.current = state;
  // `dispatch` doesn't say whether the reducer applied the action, and a second click can land
  // before React re-renders (so `stateRef` still shows the job as idle). These refs are updated
  // synchronously and block a duplicate `convertFile` call; the reducer guards keep state
  // consistent if a stale event still slips through.
  const runningRef = useRef(new Set<string>());
  const batchActiveRef = useRef(false);
  const { theme, setTheme } = useTheme();

  const handleFilesAdded = useCallback((files: File[]) => {
    const jobs = files.flatMap(file => createJob(file, String(nextId++)) ?? []);
    dispatch({ type: 'add', jobs });
  }, []);

  const handleSelectFormat = useCallback((id: string, format: FormatInfo) => {
    dispatch({ type: 'selectFormat', id, format });
  }, []);

  const handleConvert = useCallback(async (id: string) => {
    const job = stateRef.current.jobs.find(j => j.id === id);
    if (!job?.outputFormat || !canStart(job) || runningRef.current.has(id)) return;

    runningRef.current.add(id);
    dispatch({ type: 'start', id });

    try {
      const blob = await convertFile(
        job.file,
        job.inputFormat,
        job.outputFormat,
        (progress) => dispatch({ type: 'progress', id, progress }),
      );
      dispatch({ type: 'finish', id, blob });
    } catch (err) {
      dispatch({
        type: 'fail',
        id,
        message: err instanceof Error ? err.message : String(err ?? 'Conversion failed'),
      });
    } finally {
      runningRef.current.delete(id);
    }
  }, []);

  const runBatch = useCallback(async (ids: string[]) => {
    if (batchActiveRef.current || ids.length === 0) return;
    batchActiveRef.current = true;
    dispatch({ type: 'startBatch', ids });
    try {
      for (const id of ids) {
        await handleConvert(id);
      }
    } finally {
      batchActiveRef.current = false;
      dispatch({ type: 'endBatch' });
    }
  }, [handleConvert]);

  const handleConvertAll = useCallback(() => {
    const ids = stateRef.current.jobs
      .filter(j => j.outputFormat && j.status === 'idle')
      .map(j => j.id);
    return runBatch(ids);
  }, [runBatch]);

  const handleRetryFailed = useCallback(() => {
    const { jobs } = stateRef.current;
    if (jobs.some(j => j.status === 'converting')) return;
    const ids = jobs
      .filter(j => j.status === 'error' && j.errorKind !== 'validation')
      .map(j => j.id);
    return runBatch(ids);
  }, [runBatch]);

  const handleDownload = useCallback((id: string) => {
    const job = stateRef.current.jobs.find(j => j.id === id);
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
    dispatch({ type: 'remove', id });
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const { jobs } = state;
  const summary = getSummary(state);
  const { ready: readyCount, done: doneCount, failed: failedCount, converting: convertingCount, batch } = summary;

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
                {batch && batch.total > 0 && (
                  <> &mdash; {batch.processed} of {batch.total} processed</>
                )}
              </span>
              <div className="toolbar__actions">
                {readyCount > 0 && (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={handleConvertAll}
                    disabled={batch !== null}
                    type="button"
                  >
                    Convert All ({readyCount})
                  </button>
                )}
                {failedCount > 0 && convertingCount === 0 && batch === null && (
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

            {batch && batch.total > 0 && (
              <div
                className="batch-progress"
                role="progressbar"
                aria-valuenow={batch.processed}
                aria-valuemin={0}
                aria-valuemax={batch.total}
                aria-label={`Batch progress: ${batch.done} completed, ${batch.failed} failed out of ${batch.total} files`}
              >
                <div
                  className="batch-progress__fill"
                  style={{ width: `${(batch.processed / batch.total) * 100}%` }}
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

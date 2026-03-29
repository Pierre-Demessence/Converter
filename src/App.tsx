import { useState, useCallback, useRef } from 'react';
import type { ConversionJob, FormatInfo } from './lib/types';
import { detectFormat, getOutputFormats } from './lib/formats';
import { convertFile } from './lib/converter';
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
  const { theme, setTheme } = useTheme();

  const updateJob = useCallback((id: string, updates: Partial<ConversionJob>) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...updates } : j)));
  }, []);

  const handleFilesAdded = useCallback((files: File[]) => {
    const newJobs: ConversionJob[] = [];
    for (const file of files) {
      const format = detectFormat(file);
      if (format) {
        newJobs.push({
          id: String(nextId++),
          file,
          inputFormat: format,
          outputFormat: null,
          status: 'idle',
          progress: 0,
          outputBlob: null,
          error: null,
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
      });
    }
  }, [updateJob]);

  const handleConvertAll = useCallback(async () => {
    const pending = jobsRef.current.filter(j => j.outputFormat && j.status === 'idle');
    for (const job of pending) {
      await handleConvert(job.id);
    }
  }, [handleConvert]);

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
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={handleClearAll}
                  type="button"
                >
                  Clear All
                </button>
              </div>
            </div>

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
    </div>
  );
}

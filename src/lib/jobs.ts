import type { ConversionJob, FormatInfo } from './types';
import { detectFormat } from './formats';
import { checkFileSize } from './validation';

export interface BatchState {
  /** Jobs in this batch, in run order. */
  ids: string[];
  /** Keyed by job id, so a job that fails and is retried counts once. */
  settled: Record<string, 'done' | 'error'>;
}

export interface JobsState {
  jobs: ConversionJob[];
  batch: BatchState | null;
}

export type JobsAction =
  | { type: 'add'; jobs: ConversionJob[] }
  | { type: 'selectFormat'; id: string; format: FormatInfo }
  | { type: 'start'; id: string }
  | { type: 'progress'; id: string; progress: number }
  | { type: 'finish'; id: string; blob: Blob }
  | { type: 'fail'; id: string; message: string }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'startBatch'; ids: string[] }
  | { type: 'endBatch' };

export interface BatchSummary {
  total: number;
  processed: number;
  done: number;
  failed: number;
}

export interface JobsSummary {
  ready: number;
  done: number;
  failed: number;
  converting: number;
  batch: BatchSummary | null;
}

export const initialJobsState: JobsState = { jobs: [], batch: null };

export function createJob(file: File, id: string): ConversionJob | null {
  const format = detectFormat(file);
  if (!format) return null;
  const sizeError = checkFileSize(file, format.category);
  return {
    id,
    file,
    inputFormat: format,
    outputFormat: null,
    status: sizeError ? 'error' : 'idle',
    progress: 0,
    outputBlob: null,
    error: sizeError,
    errorKind: sizeError ? 'validation' : undefined,
  };
}

export function canStart(job: ConversionJob): boolean {
  if (!job.outputFormat) return false;
  return job.status === 'idle' || (job.status === 'error' && job.errorKind !== 'validation');
}

export function canSelectFormat(job: ConversionJob): boolean {
  return job.status !== 'converting' && !(job.status === 'error' && job.errorKind === 'validation');
}

function updateJob(
  state: JobsState,
  id: string,
  applies: (job: ConversionJob) => boolean,
  update: (job: ConversionJob) => ConversionJob,
): JobsState {
  const job = state.jobs.find(j => j.id === id);
  if (!job || !applies(job)) return state;
  return { ...state, jobs: state.jobs.map(j => (j.id === id ? update(j) : j)) };
}

function settle(state: JobsState, id: string, result: 'done' | 'error'): JobsState {
  if (!state.batch?.ids.includes(id)) return state;
  return {
    ...state,
    batch: { ...state.batch, settled: { ...state.batch.settled, [id]: result } },
  };
}

const isConverting = (job: ConversionJob) => job.status === 'converting';

/** Invalid transitions return the same `state` object, so stale or duplicate events are harmless. */
export function jobsReducer(state: JobsState, action: JobsAction): JobsState {
  switch (action.type) {
    case 'add':
      return action.jobs.length > 0 ? { ...state, jobs: [...state.jobs, ...action.jobs] } : state;

    case 'selectFormat':
      return updateJob(state, action.id, canSelectFormat, job => ({
        ...job,
        outputFormat: action.format,
        status: 'idle',
        progress: 0,
        outputBlob: null,
        error: null,
        errorKind: undefined,
      }));

    case 'start': {
      const next = updateJob(state, action.id, canStart, job => ({
        ...job,
        status: 'converting',
        progress: 0,
        outputBlob: null,
        error: null,
        errorKind: undefined,
      }));
      const { batch } = next;
      if (next === state || !batch || !(action.id in batch.settled)) return next;
      // A retried batch job is unsettled again until its new run ends.
      const settled = Object.fromEntries(Object.entries(batch.settled).filter(([id]) => id !== action.id));
      return { ...next, batch: { ...batch, settled } };
    }

    case 'progress':
      return updateJob(state, action.id, isConverting, job => ({ ...job, progress: action.progress }));

    case 'finish': {
      const next = updateJob(state, action.id, isConverting, job => ({
        ...job,
        status: 'done',
        progress: 100,
        outputBlob: action.blob,
      }));
      return next === state ? state : settle(next, action.id, 'done');
    }

    case 'fail': {
      const next = updateJob(state, action.id, isConverting, job => ({
        ...job,
        status: 'error',
        error: action.message,
        errorKind: 'conversion',
      }));
      return next === state ? state : settle(next, action.id, 'error');
    }

    case 'remove': {
      const { batch } = state;
      return {
        jobs: state.jobs.filter(j => j.id !== action.id),
        batch: batch && {
          ids: batch.ids.filter(id => id !== action.id),
          settled: Object.fromEntries(Object.entries(batch.settled).filter(([id]) => id !== action.id)),
        },
      };
    }

    case 'clear':
      return { jobs: [], batch: null };

    case 'startBatch':
      if (state.batch !== null || action.ids.length === 0) return state;
      return { ...state, batch: { ids: action.ids, settled: {} } };

    case 'endBatch':
      return state.batch === null ? state : { ...state, batch: null };
  }
}

export function getSummary(state: JobsState): JobsSummary {
  let ready = 0;
  let done = 0;
  let failed = 0;
  let converting = 0;
  for (const job of state.jobs) {
    if (job.status === 'done') done++;
    else if (job.status === 'converting') converting++;
    else if (job.status === 'error') {
      if (job.errorKind !== 'validation') failed++;
    } else if (job.outputFormat) ready++;
  }

  let batch: BatchSummary | null = null;
  if (state.batch) {
    const results = Object.values(state.batch.settled);
    const batchDone = results.filter(r => r === 'done').length;
    batch = {
      total: state.batch.ids.length,
      processed: results.length,
      done: batchDone,
      failed: results.length - batchDone,
    };
  }

  return { ready, done, failed, converting, batch };
}

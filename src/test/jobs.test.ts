import { describe, it, expect } from 'vitest';
import type { ConversionJob, FormatInfo } from '../lib/types';
import { FORMATS } from '../lib/formats';
import {
  canSelectFormat,
  canStart,
  createJob,
  getSummary,
  jobsReducer,
  type JobsState,
} from '../lib/jobs';

const MB = 1024 * 1024;

function format(extension: string): FormatInfo {
  const found = FORMATS.find(f => f.extension === extension);
  if (!found) throw new Error(`unknown format ${extension}`);
  return found;
}

function makeJob(id: string, overrides: Partial<ConversionJob> = {}): ConversionJob {
  return {
    id,
    file: new File(['x'], `${id}.wav`),
    inputFormat: format('wav'),
    outputFormat: format('mp3'),
    status: 'idle',
    progress: 0,
    outputBlob: null,
    error: null,
    ...overrides,
  };
}

function stateOf(jobs: ConversionJob[], batch: JobsState['batch'] = null): JobsState {
  return { jobs, batch };
}

const blob = new Blob(['out']);

describe('createJob', () => {
  it('creates an idle job with no output format', () => {
    const job = createJob(new File(['x'], 'a.wav'), '1');
    expect(job).toMatchObject({
      id: '1',
      status: 'idle',
      outputFormat: null,
      error: null,
      outputBlob: null,
      progress: 0,
    });
    expect(job?.inputFormat.extension).toBe('wav');
  });

  it('returns null for an unsupported extension', () => {
    expect(createJob(new File(['x'], 'a.xyz'), '1')).toBeNull();
  });

  it('creates a job in validation error when the file is too large', () => {
    const file = new File(['x'], 'a.json');
    Object.defineProperty(file, 'size', { value: 11 * MB });
    const job = createJob(file, '1');
    expect(job?.status).toBe('error');
    expect(job?.errorKind).toBe('validation');
    expect(job?.error).toContain('too large');
  });
});

describe('canStart / canSelectFormat', () => {
  it('canStart needs an output format', () => {
    expect(canStart(makeJob('1', { outputFormat: null }))).toBe(false);
    expect(canStart(makeJob('1'))).toBe(true);
  });

  it('canStart allows a conversion error but not a validation error', () => {
    expect(canStart(makeJob('1', { status: 'error', errorKind: 'conversion', error: 'x' }))).toBe(true);
    expect(canStart(makeJob('1', { status: 'error', errorKind: 'validation', error: 'x' }))).toBe(false);
  });

  it('canStart rejects converting and done jobs', () => {
    expect(canStart(makeJob('1', { status: 'converting' }))).toBe(false);
    expect(canStart(makeJob('1', { status: 'done' }))).toBe(false);
  });

  it('canSelectFormat rejects converting and validation-error jobs only', () => {
    expect(canSelectFormat(makeJob('1'))).toBe(true);
    expect(canSelectFormat(makeJob('1', { status: 'done' }))).toBe(true);
    expect(canSelectFormat(makeJob('1', { status: 'error', errorKind: 'conversion', error: 'x' }))).toBe(true);
    expect(canSelectFormat(makeJob('1', { status: 'converting' }))).toBe(false);
    expect(canSelectFormat(makeJob('1', { status: 'error', errorKind: 'validation', error: 'x' }))).toBe(false);
  });
});

describe('jobsReducer', () => {
  describe('add', () => {
    it('appends jobs', () => {
      const state = jobsReducer(stateOf([makeJob('1')]), { type: 'add', jobs: [makeJob('2')] });
      expect(state.jobs.map(j => j.id)).toEqual(['1', '2']);
    });
  });

  describe('selectFormat', () => {
    it('sets the format and resets the job to idle', () => {
      const done = makeJob('1', { status: 'done', outputBlob: blob, progress: 100 });
      const state = jobsReducer(stateOf([done]), { type: 'selectFormat', id: '1', format: format('ogg') });
      expect(state.jobs[0]).toMatchObject({
        outputFormat: format('ogg'),
        status: 'idle',
        outputBlob: null,
        progress: 0,
        error: null,
      });
    });

    it('clears a conversion error', () => {
      const failed = makeJob('1', { status: 'error', error: 'boom', errorKind: 'conversion' });
      const state = jobsReducer(stateOf([failed]), { type: 'selectFormat', id: '1', format: format('ogg') });
      expect(state.jobs[0].status).toBe('idle');
      expect(state.jobs[0].error).toBeNull();
      expect(state.jobs[0].errorKind).toBeUndefined();
    });

    it('B1: keeps a validation error untouched', () => {
      const tooBig = makeJob('1', {
        outputFormat: null,
        status: 'error',
        error: 'File is too large',
        errorKind: 'validation',
      });
      const before = stateOf([tooBig]);
      const after = jobsReducer(before, { type: 'selectFormat', id: '1', format: format('ogg') });
      expect(after).toBe(before);
    });

    it('B2: is ignored while the job is converting', () => {
      const converting = makeJob('1', { status: 'converting' });
      const before = stateOf([converting]);
      const after = jobsReducer(before, { type: 'selectFormat', id: '1', format: format('ogg') });
      expect(after).toBe(before);
    });

    it('is a no-op for an unknown id', () => {
      const before = stateOf([makeJob('1')]);
      expect(jobsReducer(before, { type: 'selectFormat', id: '9', format: format('ogg') })).toBe(before);
    });
  });

  describe('start', () => {
    it('moves an idle job to converting and clears error and blob', () => {
      const state = jobsReducer(stateOf([makeJob('1')]), { type: 'start', id: '1' });
      expect(state.jobs[0]).toMatchObject({ status: 'converting', progress: 0, error: null, outputBlob: null });
    });

    it('restarts a job that failed with a conversion error', () => {
      const failed = makeJob('1', { status: 'error', error: 'boom', errorKind: 'conversion' });
      const state = jobsReducer(stateOf([failed]), { type: 'start', id: '1' });
      expect(state.jobs[0]).toMatchObject({ status: 'converting', error: null });
    });

    it('B3: unsettles a batch job that is retried by hand mid-batch', () => {
      const failed = makeJob('1', { status: 'error', error: 'boom', errorKind: 'conversion' });
      const before = stateOf([failed], { ids: ['1'], settled: { 1: 'error' } });
      const after = jobsReducer(before, { type: 'start', id: '1' });
      expect(after.batch?.settled).toEqual({});
      expect(getSummary(after).batch?.processed).toBe(0);
    });

    it('B4: is a no-op on a converting job', () => {
      const before = stateOf([makeJob('1', { status: 'converting', progress: 40 })]);
      expect(jobsReducer(before, { type: 'start', id: '1' })).toBe(before);
    });

    it('is a no-op without an output format, on a validation error, and on a done job', () => {
      const noFormat = stateOf([makeJob('1', { outputFormat: null })]);
      expect(jobsReducer(noFormat, { type: 'start', id: '1' })).toBe(noFormat);
      const invalid = stateOf([makeJob('1', { status: 'error', errorKind: 'validation', error: 'x' })]);
      expect(jobsReducer(invalid, { type: 'start', id: '1' })).toBe(invalid);
      const done = stateOf([makeJob('1', { status: 'done' })]);
      expect(jobsReducer(done, { type: 'start', id: '1' })).toBe(done);
    });
  });

  describe('progress', () => {
    it('updates a converting job', () => {
      const state = jobsReducer(stateOf([makeJob('1', { status: 'converting' })]), {
        type: 'progress',
        id: '1',
        progress: 42,
      });
      expect(state.jobs[0].progress).toBe(42);
    });

    it('ignores a job that is no longer converting', () => {
      const before = stateOf([makeJob('1', { status: 'idle' })]);
      expect(jobsReducer(before, { type: 'progress', id: '1', progress: 42 })).toBe(before);
    });

    it('ignores a removed job', () => {
      const before = stateOf([]);
      expect(jobsReducer(before, { type: 'progress', id: '1', progress: 42 })).toBe(before);
    });
  });

  describe('finish', () => {
    it('marks a converting job done with its blob', () => {
      const state = jobsReducer(stateOf([makeJob('1', { status: 'converting' })]), {
        type: 'finish',
        id: '1',
        blob,
      });
      expect(state.jobs[0]).toMatchObject({ status: 'done', progress: 100, outputBlob: blob });
    });

    it('ignores a job that is not converting', () => {
      const before = stateOf([makeJob('1', { status: 'idle' })]);
      expect(jobsReducer(before, { type: 'finish', id: '1', blob })).toBe(before);
    });

    it('ignores a removed job', () => {
      const before = stateOf([]);
      expect(jobsReducer(before, { type: 'finish', id: '1', blob })).toBe(before);
    });

    it('settles a batch job as done', () => {
      const before = stateOf([makeJob('1', { status: 'converting' })], { ids: ['1'], settled: {} });
      const after = jobsReducer(before, { type: 'finish', id: '1', blob });
      expect(after.batch?.settled).toEqual({ 1: 'done' });
    });

    it('leaves the batch alone for a job outside it', () => {
      const before = stateOf([makeJob('1', { status: 'converting' }), makeJob('2')], { ids: ['2'], settled: {} });
      const after = jobsReducer(before, { type: 'finish', id: '1', blob });
      expect(after.batch?.settled).toEqual({});
    });
  });

  describe('fail', () => {
    it('marks a converting job as a conversion error', () => {
      const state = jobsReducer(stateOf([makeJob('1', { status: 'converting' })]), {
        type: 'fail',
        id: '1',
        message: 'boom',
      });
      expect(state.jobs[0]).toMatchObject({ status: 'error', error: 'boom', errorKind: 'conversion' });
    });

    it('ignores a job that is not converting', () => {
      const before = stateOf([makeJob('1', { status: 'done' })]);
      expect(jobsReducer(before, { type: 'fail', id: '1', message: 'boom' })).toBe(before);
    });

    it('settles a batch job as error', () => {
      const before = stateOf([makeJob('1', { status: 'converting' })], { ids: ['1'], settled: {} });
      const after = jobsReducer(before, { type: 'fail', id: '1', message: 'boom' });
      expect(after.batch?.settled).toEqual({ 1: 'error' });
    });

    it('counts a batch job once when it fails and is then retried and finishes', () => {
      let state = stateOf([makeJob('1', { status: 'converting' })], { ids: ['1'], settled: {} });
      state = jobsReducer(state, { type: 'fail', id: '1', message: 'boom' });
      state = jobsReducer(state, { type: 'start', id: '1' });
      state = jobsReducer(state, { type: 'finish', id: '1', blob });
      expect(Object.keys(state.batch?.settled ?? {})).toHaveLength(1);
      expect(state.batch?.settled).toEqual({ 1: 'done' });
    });
  });

  describe('remove', () => {
    it('drops the job', () => {
      const state = jobsReducer(stateOf([makeJob('1'), makeJob('2')]), { type: 'remove', id: '1' });
      expect(state.jobs.map(j => j.id)).toEqual(['2']);
    });

    it('B3: drops the job from the running batch', () => {
      const before = stateOf([makeJob('1'), makeJob('2')], { ids: ['1', '2'], settled: { 1: 'done' } });
      const after = jobsReducer(before, { type: 'remove', id: '1' });
      expect(after.batch).toEqual({ ids: ['2'], settled: {} });
    });
  });

  describe('clear', () => {
    it('empties jobs and batch', () => {
      const state = jobsReducer(stateOf([makeJob('1')], { ids: ['1'], settled: {} }), { type: 'clear' });
      expect(state).toEqual({ jobs: [], batch: null });
    });
  });

  describe('startBatch / endBatch', () => {
    it('starts a batch', () => {
      const state = jobsReducer(stateOf([makeJob('1')]), { type: 'startBatch', ids: ['1'] });
      expect(state.batch).toEqual({ ids: ['1'], settled: {} });
    });

    it('B4: ignores a second batch while one is running', () => {
      const before = stateOf([makeJob('1'), makeJob('2')], { ids: ['1'], settled: {} });
      expect(jobsReducer(before, { type: 'startBatch', ids: ['2'] })).toBe(before);
    });

    it('ignores an empty batch', () => {
      const before = stateOf([makeJob('1')]);
      expect(jobsReducer(before, { type: 'startBatch', ids: [] })).toBe(before);
    });

    it('endBatch clears the batch and is a no-op without one', () => {
      const running = stateOf([makeJob('1')], { ids: ['1'], settled: {} });
      expect(jobsReducer(running, { type: 'endBatch' }).batch).toBeNull();
      const idle = stateOf([makeJob('1')]);
      expect(jobsReducer(idle, { type: 'endBatch' })).toBe(idle);
    });
  });
});

describe('getSummary', () => {
  it('counts ready, done, failed and converting jobs', () => {
    const summary = getSummary(stateOf([
      makeJob('1'),
      makeJob('2', { outputFormat: null }),
      makeJob('3', { status: 'done' }),
      makeJob('4', { status: 'error', errorKind: 'conversion', error: 'x' }),
      makeJob('5', { status: 'error', errorKind: 'validation', error: 'x' }),
      makeJob('6', { status: 'converting' }),
    ]));
    expect(summary).toMatchObject({ ready: 1, done: 1, failed: 1, converting: 1, batch: null });
  });

  it('B3: batch progress ignores jobs outside the batch', () => {
    const summary = getSummary(stateOf(
      [makeJob('1', { status: 'done' }), makeJob('2'), makeJob('3')],
      { ids: ['2', '3'], settled: {} },
    ));
    expect(summary.batch).toEqual({ total: 2, processed: 0, done: 0, failed: 0 });
  });

  it('B3: a failed job being retried is not processed until it settles', () => {
    const failed = makeJob('1', { status: 'error', errorKind: 'conversion', error: 'x' });
    let state = stateOf([failed], { ids: ['1'], settled: {} });
    state = jobsReducer(state, { type: 'start', id: '1' });
    expect(getSummary(state).batch).toEqual({ total: 1, processed: 0, done: 0, failed: 0 });
    state = jobsReducer(state, { type: 'finish', id: '1', blob });
    expect(getSummary(state).batch).toEqual({ total: 1, processed: 1, done: 1, failed: 0 });
  });

  it('counts done and failed batch jobs', () => {
    const summary = getSummary(stateOf(
      [makeJob('1'), makeJob('2'), makeJob('3')],
      { ids: ['1', '2', '3'], settled: { 1: 'done', 2: 'error' } },
    ));
    expect(summary.batch).toEqual({ total: 3, processed: 2, done: 1, failed: 1 });
  });

  it('B3: removing a batch job lets the bar reach 100 %', () => {
    let state = stateOf([makeJob('1', { status: 'converting' }), makeJob('2')], { ids: ['1', '2'], settled: {} });
    state = jobsReducer(state, { type: 'remove', id: '2' });
    state = jobsReducer(state, { type: 'finish', id: '1', blob });
    const batch = getSummary(state).batch;
    expect(batch?.processed).toBe(batch?.total);
  });
});

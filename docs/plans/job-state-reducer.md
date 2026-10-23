# D6 Job state reducer (fixes B1–B4)

## Goal

Move all job and batch state transitions out of the ad-hoc `updateJob` calls in `src/App.tsx` into a pure reducer with explicit, guarded transitions, which fixes B1–B4 and makes the job logic testable without rendering. Each bug gets a regression test that fails before the change.

## Acceptance criteria

- **B1** WHEN the user picks an output format on a job whose size check failed (`errorKind: 'validation'`), THE SYSTEM SHALL keep the job in `error` with its size message, and keep it unconvertible.
- **B1** WHILE a job has a validation error, THE SYSTEM SHALL disable its format picker.
- **B2** WHILE a job is `converting`, THE SYSTEM SHALL disable its format picker and ignore any format change for it.
- **B2** WHEN a conversion finishes, THE SYSTEM SHALL label and name the download with the format the conversion ran for.
- **B2** WHEN the user picks a different format on a `done` job, THE SYSTEM SHALL return it to `idle` and drop its previous output.
- **B3** WHEN a batch (Convert All or Retry Failed) starts, THE SYSTEM SHALL show "0 of N processed", N being the batch's jobs, whatever other jobs are already done or failed.
- **B3** WHEN a batch job finishes or fails, THE SYSTEM SHALL count it once in the batch progress; failed jobs being retried SHALL not count as processed before their new run settles.
- **B3** WHEN a job that is part of a running batch is removed, THE SYSTEM SHALL drop it from the batch total, so the bar can still reach 100 %.
- **B4** WHILE a batch is running, THE SYSTEM SHALL disable "Convert All" and hide "Retry Failed".
- **B4** IF "Convert All" or a card's "Convert" is triggered again for a job that is already converting, THEN THE SYSTEM SHALL not start a second conversion of it.
- **B4** IF a second batch is requested while one is running, THEN THE SYSTEM SHALL ignore it, and the running batch's progress SHALL stay visible until that batch ends.
- WHEN a progress, finish or fail event arrives for a job that is no longer `converting` (removed, cleared), THE SYSTEM SHALL ignore it.

## Design

### Module

New file `src/lib/jobs.ts`, plain TypeScript with no React import (it fits the `src/lib/` rule):

```ts
export interface BatchState {
  ids: string[];                                   // jobs in this batch, in run order
  settled: Record<string, 'done' | 'error'>;       // keyed by id, so a job counts once
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

export function jobsReducer(state: JobsState, action: JobsAction): JobsState;
export function createJob(file: File, id: string): ConversionJob | null; // detectFormat + checkFileSize, moved from handleFilesAdded
export function canStart(job: ConversionJob): boolean;        // has outputFormat, and idle or conversion error
export function canSelectFormat(job: ConversionJob): boolean; // not converting, not a validation error
export function getSummary(state: JobsState): JobsSummary;    // ready/done/failed/converting counts + batch { total, processed, done, failed } | null
```

`ConversionJob` (`src/lib/types.ts`) is unchanged.

### Transitions

Every action that doesn't apply returns the same `state` object (a no-op), so a stale or duplicate event can't corrupt a job.

| Action | Applies when | Effect |
| --- | --- | --- |
| `selectFormat` | `canSelectFormat(job)` | `outputFormat` set; `status: 'idle'`, `error: null`, `errorKind` cleared, `outputBlob: null`, `progress: 0` |
| `start` | `canStart(job)` | `status: 'converting'`, `progress: 0`, error and blob cleared |
| `progress` | job is `converting` | `progress` set |
| `finish` | job is `converting` | `status: 'done'`, `progress: 100`, `outputBlob`; if in batch, `settled[id] = 'done'` |
| `fail` | job is `converting` | `status: 'error'`, `error`, `errorKind: 'conversion'`; if in batch, `settled[id] = 'error'` |
| `remove` | always | job dropped; id dropped from `batch.ids` and `batch.settled` |
| `clear` | always | `jobs: []`, `batch: null` |
| `startBatch` | `batch === null` and `ids` non-empty | `batch = { ids, settled: {} }` |
| `endBatch` | always | `batch: null` |

B2's "download uses the format the conversion ran for" follows from `selectFormat` being rejected while converting: `outputFormat` can't change between `start` and `finish`.

### App wiring (`src/App.tsx`)

- `useReducer(jobsReducer, initialJobsState)` replaces `useState<ConversionJob[]>` and `batchSize`; `updateJob` is deleted. `stateRef` mirrors the state, like `jobsRef` today.
- `handleConvert(id)`: reads the job from `stateRef`, returns if `!canStart(job)` or the id is in `runningRef` (a `Set<string>`), adds it to `runningRef`, dispatches `start`, awaits `convertFile`, dispatches `finish` or `fail`, and removes the id from `runningRef` in `finally`.
- `handleConvertAll` / `handleRetryFailed`: return if `batchActiveRef.current`; set it, dispatch `startBatch` with the pending ids, run them in sequence through `handleConvert`, then dispatch `endBatch` and reset the ref in `finally`. Retry Failed keeps its "nothing converting" guard.
- Why refs as well as the reducer guards: `dispatch` doesn't return whether the action applied, and a second click can land before React re-renders, so `stateRef` may still show the job as `idle`. The refs are updated synchronously inside the handler and block the duplicate `convertFile` call; the reducer guards keep state consistent if any event slips through. A short comment in the code says this.
- Toolbar: counts and the batch bar come from `getSummary(state)`. "Convert All" gets `disabled={batch !== null}`; "Retry Failed" renders only when `failed > 0 && converting === 0 && batch === null`. The bar's `aria-valuenow`, width and label use `batch.processed` / `batch.total`.
- `handleDownload` is unchanged.

### Components

- `FormatPicker` gets a `disabled?: boolean` prop: each radio button gets `disabled`, and `handleKeyDown` returns early when disabled. The disabled pill style comes from the existing `.btn`/pill tokens; add a `.format-pill:disabled` rule in `src/App.css` (reduced opacity, `cursor: not-allowed`) using existing custom properties only. Disabled state is shown by more than color (opacity and cursor, plus the browser's native disabled semantics), per the colorblind rule.
- `ConversionCard` passes `disabled={!canSelectFormat(job)}`.

### Edge cases

- Removing a converting job: the conversion keeps running and its `finish`/`fail` is ignored (cancellation is I3).
- "Clear All" during a batch: `batch` becomes `null`; the loop's remaining `handleConvert` calls find no job and return; `endBatch` is then a no-op.
- A batch job converted by hand before the loop reaches it: the loop's `handleConvert` sees it is not `idle` and skips it; its `finish` still settles it in the batch.
- Files added during a batch: they are not in `batch.ids`; "Convert All" stays disabled until the batch ends.
- A single "Convert" during a batch is allowed (FFmpeg already serializes through `enqueueFFmpeg`).

### Tests

- `src/test/jobs.test.ts`: pure reducer tests, written first (TDD): one per bug (B1 validation error survives `selectFormat`; B2 `selectFormat` ignored while converting; B3 batch progress ignores jobs outside the batch and pre-failed retries; B4 `start` on a converting job and a second `startBatch` are no-ops), plus one per guard in the Transitions table. The reducer is new code, so the "fails before the fix" evidence comes from the App tests below.
- `src/test/App.test.tsx`: Testing Library with `fireEvent` (no `user-event`: it isn't installed and isn't needed). `vi.mock('../lib/converter')` with a `convertFile` that returns controllable deferred promises. Stub `window.matchMedia` in the test file (`useTheme` calls it; jsdom lacks it). Files are added through the DropZone's file `<input>` with `fireEvent.change`; an oversized file uses `Object.defineProperty(file, 'size', …)`. These tests fail on today's `App.tsx`:
  - B1: oversized file → picker radios disabled, alert still shows the size message, "Convert" disabled after a click on a format.
  - B2: during a pending conversion, the picker radios are disabled; after resolving, the download label names the original format.
  - B3: one job already done, two new jobs → "0 of 2 processed" after "Convert All".
  - B4: two clicks on "Convert All" → `convertFile` called once per job; "Convert All" disabled while the batch runs.

## Docs

- `docs/backlog.md`: delete B1, B2, B3, B4 and D6; in D7 delete the "No tests for the App job/batch logic" clause (worker-path tests and stale test names remain).
- `AGENTS.md`: Layout gains `jobs.ts` (job state reducer and selectors) under `src/lib/`; the `src/App.tsx` line says it wires the reducer to `convertFile` and owns the batch loop; Invariants gain "Job and batch state changes go through `jobsReducer`; invalid transitions are no-ops". The `src/test/` line mentions the App tests mocking `convertFile`.
- `docs/decisions.md`: no entry expected; the ref-plus-reducer guard is explained by a code comment.

## Checklist

- [x] 1. `src/lib/jobs.ts` + `src/test/jobs.test.ts`: types, `createJob`, `canStart`, `canSelectFormat`, `jobsReducer`, `getSummary`, per the Transitions table. TDD: write the tests first. Verify: `npm test -- jobs`.
- [x] 2. `src/test/App.test.tsx`: the four bug regressions above, run against the current `App.tsx` and confirmed failing (record which assertion fails for each). Verify: `npm test -- App` shows 4 failures for the expected reasons.
- [x] 3. `FormatPicker` `disabled` prop, `.format-pill:disabled` style in `src/App.css`, `ConversionCard` passes it. Verify: lint, build.
- [x] 4. `src/App.tsx` rewired to the reducer, `runningRef` and `batchActiveRef` guards, toolbar from `getSummary`. Verify: `npm test` all green (the 4 App regressions now pass), `npm run lint`, `npm run build`.
- [x] 5. Browser check on the dev server: oversized file (B1), picker disabled mid-conversion with an FFmpeg audio conversion (B2), batch counter with a pre-done job (B3), double-click "Convert All" (B4), light and dark themes for the disabled pill.
- [x] 6. Docs per the Docs section; delete this plan in the feature's final commit.

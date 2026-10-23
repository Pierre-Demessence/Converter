# Converter

Browser-only file converter: React 19, Vite 8 and TypeScript. There is no backend. Every conversion runs in the page, through Canvas/OffscreenCanvas, FFmpeg.wasm, or plain TypeScript for JSON ↔ CSV.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | `tsc -b` then `vite build` |
| `npm run lint` | ESLint |
| `npm test` | Vitest, single run (jsdom) |
| `npm run test:watch` | Vitest, watch mode |

## Docs map

- `README.md`: what the app does and how to run it.
- `docs/backlog.md`: known bugs, tech debt and ideas.
- `docs/decisions.md`: decisions a reader would otherwise question.

## Layout

- `src/lib/`: conversion logic, with no React dependency.
  - `formats/`: the format registry, one file per category, combined in `formats/index.ts`.
  - `converter.ts`: the router (`convertFile`).
  - `converters/`: one engine per family: `image.ts` (main-thread canvas), `ffmpeg.ts`, `document.ts`.
  - `image-worker-client.ts` + `workers/image.worker.ts`: OffscreenCanvas image conversion off the main thread.
  - `ffmpeg-manager.ts`: lazy FFmpeg singleton.
  - `validation.ts`: per-category size limits.
- `src/App.tsx`: owns all job state (`ConversionJob[]`) and the batch logic. Components in `src/components/` are presentational.
- `src/test/`: Vitest suites. jsdom has no `OffscreenCanvas` or `Worker`, so the worker path is not covered; FFmpeg is mocked in `converter-integration.test.ts`.
- `public/ffmpeg/`: the `@ffmpeg/core` build served as static files (see Invariants).

## Conversion pipeline

`convertFile` (`src/lib/converter.ts`) routes in this order:

1. Image input and an output with `canvasOutput` (PNG, JPEG, WebP): the OffscreenCanvas worker when `OffscreenCanvas` exists, otherwise main-thread canvas. Any error goes to FFmpeg (step 3); the worker path never falls back to main-thread canvas.
2. Input or output with `converterHint: 'document'`: `converters/document.ts`.
3. Everything else: FFmpeg, with arguments built by `buildFFmpegArgs` from the output format's `codec` metadata.

Output choices (`getOutputFormats`) stay within the input's category and exclude the input format. SVG is input-only and converts only to `canvasOutput` formats. Detection uses the file extension only, and `.jpeg` is normalized to `jpg`.

### Adding a format

Add an entry to `src/lib/formats/<category>.ts`:

- `extension` (lowercase; it is the detection key), `mimeType`, `category`, `label`.
- `canvasOutput: true` only if every target browser can encode it with `canvas.toBlob` / `convertToBlob`.
- `codec` for FFmpeg outputs: `audio` and/or `video` codec with extra args, and `stripVideo: true` for audio-only outputs. Without `codec`, the command is `-i in -y out`, and FFmpeg picks the container's default encoders.
- The encoder must exist in the shipped `@ffmpeg/core` build. Check it in a real browser; unit tests mock FFmpeg.
- Add a case to `src/test/converter-args.test.ts`.

## Invariants

- `public/ffmpeg/` holds the **ESM** build (`node_modules/@ffmpeg/core/dist/esm/`), not the UMD build. The `@ffmpeg/ffmpeg` module worker loads the core with `import()`, which needs an ES module default export; with the UMD build, loading fails with `failed to import ffmpeg-core.js`. The copy must match the installed `@ffmpeg/core` version.
- The FFmpeg core is single-threaded (`@ffmpeg/core`, not `@ffmpeg/core-mt`); see `docs/decisions.md`.
- The ~32 MB FFmpeg wasm is fetched on the first FFmpeg conversion only. Keep `FFmpeg` and `toBlobURL` behind the dynamic `import()` in `ffmpeg-manager.ts`.
- FFmpeg runs one command at a time: every call goes through `enqueueFFmpeg` (`converters/ffmpeg.ts`). Virtual file names carry a random suffix and are deleted after each run (see B25 for the gaps).
- `errorKind: 'validation'` errors (size limit) are permanent and never retried; `'conversion'` errors are retryable.
- The inline script in `index.html` applies `data-theme` before first paint. Its storage key (`converter-theme`) must match `STORAGE_KEY` in `src/hooks/useTheme.ts`.
- Colors come only from the CSS custom properties in `src/index.css` (`:root` and `[data-theme="dark"]`); there are no hard-coded colors in components.

## Conventions

- Plain CSS with BEM-like class names (`block__element--modifier`) in `src/App.css`; no UI library; icons are inline SVG.
- Mobile layout at 600 px and below, with 44 px minimum touch targets.
- Interactive widgets carry ARIA roles and keyboard support (format picker is a `radiogroup` with arrow keys and roving `tabIndex`; per-card progress is a `progressbar`; errors are `alert`s; an `aria-live` region announces the job summary).

## Never

- Never send file contents or file names off the device: no upload, no analytics on files. "Files never leave your device" is the product.

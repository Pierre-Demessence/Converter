# Backlog

IDs are stable: a finished item is deleted, and its ID is never reused.

## Bugs

- **B5** CSV values containing line breaks are corrupted: `csvToJson` splits lines before parsing quotes, so a JSON → CSV → JSON round trip of a multi-line value yields broken rows. `jsonToCsv` also leaves values containing `\r` unquoted. `src/lib/converters/document.ts:56`, `src/lib/converters/document.ts:42`
- **B6** JSON → CSV writes nested objects as `[object Object]`, and takes headers from the first object only, silently dropping keys that appear later. `src/lib/converters/document.ts:38`, `src/lib/converters/document.ts:41`
- **B7** If the image worker fails to load or crashes, the conversion never settles: the client listens only for `message`, not `error`/`messageerror`, and the card stays on "Converting…". Inferred from the code, not reproduced. `src/lib/image-worker-client.ts:58`
- **B8** SVG input never converts in Chromium: `createImageBitmap` can't decode SVG in the worker, the error goes straight to FFmpeg (no main-thread canvas attempt), and FFmpeg has no SVG decoder. `src/lib/converter.ts:25`
- **B9** After an FFmpeg crash (e.g. out of memory on a large video), the cached instance is kept and every later FFmpeg conversion fails until reload. Inferred, not reproduced. `src/lib/ffmpeg-manager.ts:29`
- **B10** Files with an unsupported extension are dropped without any feedback. `src/App.tsx:29`
- **B11** Dropping a file outside the drop zone makes the browser open it in the tab, losing every job. `src/components/DropZone.tsx:61`
- **B12** `localStorage` access is unguarded: when storage is blocked, the `useTheme` initializer throws, the app fails to mount and "Try Again" fails the same way. `src/hooks/useTheme.ts:18`, `index.html:18`
- **B13** The FFmpeg core URL is built from `window.location.origin`, so it breaks when the app is deployed under a sub-path (e.g. a GitHub Pages project site). Use `import.meta.env.BASE_URL`. `src/lib/ffmpeg-manager.ts:22`
- **B14** H.264 outputs (MP4, MKV, MOV) don't force `-pix_fmt yuv420p`: 4:4:4 or 10-bit inputs give files most browsers and players can't play, and odd frame sizes fail. Inferred, not reproduced. `src/lib/formats/video.ts`
- **B15** `--color-text-primary` is not defined; the drop zone category labels fall back to the inherited color. `src/App.css:198`
- **B16** Format picker: ArrowLeft with nothing selected selects the second-to-last format instead of the last. `src/components/FormatPicker.tsx:23`
- **B17** Theme menu ARIA: `option` elements wrap `button`s (interactive content inside an option), there is no arrow-key navigation, and focus isn't moved into the menu. `src/components/ThemeToggle.tsx:65`
- **B18** Decorative emoji and SVG icons aren't `aria-hidden`, so screen readers announce "framed picture" and the like. `src/components/ConversionCard.tsx:40`
- **B19** The Google Fonts `@import` sends a request to Google on every page load (IP address and referrer), which conflicts with the privacy pitch and prevents offline use. Self-host the font or use the system stack. `src/index.css:1`
- **B20** Converting a transparent image to JPEG gives a black background: canvas is not filled before drawing. `src/lib/workers/image.worker.ts:48`, `src/lib/converters/image.ts:40`
- **B21** AVIF output always fails: the shipped FFmpeg core has no AV1 encoder, yet AVIF is offered. Drop it from outputs, or encode through canvas where the browser supports it. `src/lib/formats/image.ts`
- **B22** ICO output fails for images larger than 256×256 (FFmpeg's ICO limit); scale down first. `src/lib/formats/image.ts`
- **B23** FFmpeg failures show only "Conversion failed (FFmpeg exit code 1)"; FFmpeg's log isn't captured, so the user can't tell an unsupported codec from a corrupt file. `src/lib/converters/ffmpeg.ts:56`
- **B24** Low contrast in the dark theme: the "100% Client-Side" badge (blue on dark blue) and error text on its red tint. `src/index.css`
- **B25** FFmpeg virtual files leak when `writeFile` or `readFile` throws: `cleanup()` only runs on the exec paths. `src/lib/converters/ffmpeg.ts:34`, `src/lib/converters/ffmpeg.ts:61`
- **B26** When a browser can't encode the requested type (e.g. WebP on older Safari), canvas silently returns PNG, but the result is labelled and named as the requested format. Check the returned blob's type. Inferred, not reproduced. `src/lib/workers/image.worker.ts:57`
- **B27** Batch edge cases: after "Clear All" mid-batch, `batchActiveRef` stays set until the running conversion ends, so a re-enabled "Convert All" does nothing meanwhile; and a batch job started by hand makes the loop skip it, so `endBatch` can hide the bar while that job still runs. `src/App.tsx:62`, `src/App.tsx:70`

## Tech debt

- **D1** `public/ffmpeg/` is a byte-identical 32 MB copy of `node_modules/@ffmpeg/core/dist/esm/` committed to git. Copy it at dev/build time (a small Vite plugin or a `predev`/`prebuild` script) and ignore it.
- **D2** `converters/ffmpeg.ts` statically imports `fetchFile` from `@ffmpeg/util`, so the `ffmpeg` chunk is modulepreloaded at startup (~2 KB gzip) instead of being lazy. `src/lib/converters/ffmpeg.ts:3`
- **D3** Vite template leftovers and stray files: `src/assets/` (hero.png, react.svg, vite.svg), `public/favicon.svg` and `public/icons.svg` are unused; `test-audio.wav` at the repo root is unused.
- **D4** Dead code: `isFFmpegLoaded` (`src/lib/ffmpeg-manager.ts:6`), the unused `'canvas' | 'ffmpeg'` members of `converterHint` (`src/lib/types.ts:20`), and the `buildFFmpegArgs` re-export kept only for tests (`src/lib/converter.ts:7`).
- **D5** The canvas encode settings (quality 0.92, PNG lossless) are duplicated between the worker and the main-thread path. `src/lib/workers/image.worker.ts:51`, `src/lib/converters/image.ts:43`
- **D7** No tests for the worker path. Stale test names: `src/test/validation.test.ts:43` says "rejects" but asserts acceptance; `src/test/converter-integration.test.ts:108` mentions a removed `CANVAS_OUTPUT_TYPES`.
- **D8** No Node version pin (`engines`, `mise.toml`) and no CI running lint, tests and build.

## Ideas

- **I1** Apply an output format to every file at once (or a default per category). Today each card needs its own pick, which makes "Convert All" tedious.
- **I2** Video → audio extraction (MP4 → MP3). Audio formats already carry `stripVideo`; only the same-category filter blocks it. `src/lib/formats/index.ts:23`
- **I3** Cancel a running conversion (terminate the worker or FFmpeg instance and reload it).
- **I4** Show progress for the first FFmpeg download; the card sits at 5 % during the 32 MB fetch.
- **I5** Download all results as one ZIP (needs a dependency such as fflate).
- **I6** Output options: JPEG/WebP quality, resize, audio bitrate, video quality.
- **I7** Paste files from the clipboard, and accept drops anywhere on the page.
- **I8** Offline support: a service worker caching the app and the FFmpeg core.
- **I9** HEIC input for iPhone photos (needs a libheif wasm dependency).
- **I10** Animated GIF → WebP keeps only the first frame through canvas; route animated inputs to FFmpeg or warn.
- **I11** Semicolon-delimited CSV, the default for Excel in French and other European locales: detect the delimiter.
- **I12** Better GIF output with FFmpeg's `palettegen`/`paletteuse` filters.
- **I13** A Content-Security-Policy `<meta>` tag (self, `blob:` workers, `wasm-unsafe-eval`; a hash for the inline theme script) to back the privacy claim technically.

# Tech Stack

| Layer         | Technology               | Version |
| ------------- | ------------------------ | ------- |
| Language      | TypeScript               | ~5.9    |
| Runtime       | Browser (no Node server) | —       |
| Framework     | React                    | 19.x    |
| Build Tool    | Vite (Rolldown)          | 8.x     |
| Conversion    | FFmpeg.wasm (ESM)        | 0.12.x  |
| Conversion    | Canvas API / OffscreenCanvas | native |
| Testing       | Vitest + Testing Library | 4.x     |
| Package Mgr   | npm                      | —       |
| Lint          | ESLint                   | 9.x     |

## Build Output

Vite produces separate chunks via `manualChunks`:

| Chunk      | Size (gzip) | Loading       |
| ---------- | ----------- | ------------- |
| App code   | ~8 KB       | Immediate     |
| React      | ~60 KB      | Immediate     |
| FFmpeg     | ~2 KB       | Lazy (dynamic `import()`) |

## FFmpeg.wasm Setup

`public/ffmpeg/` must contain the **ESM** build (`dist/esm/`) of `@ffmpeg/core`, not the UMD build. The `@ffmpeg/ffmpeg` ESM entry creates a module worker (`type: "module"`) which uses `import()` to load the core — this requires an ESM module with `export default`. The UMD build lacks this export and will fail with `"failed to import ffmpeg-core.js"`.

# Tech Stack

| Layer         | Technology               | Version |
| ------------- | ------------------------ | ------- |
| Language      | TypeScript               | ~5.9    |
| Runtime       | Browser (no Node server) | —       |
| Framework     | React                    | 19.x    |
| Build Tool    | Vite                     | 8.x    |
| Conversion    | FFmpeg.wasm (ESM)        | 0.12.x  |
| Conversion    | Canvas API               | native  |
| Package Mgr   | npm                      | —       |
| Lint          | ESLint                   | 9.x     |
| Testing       | Vitest                   | 4.x     |

## FFmpeg.wasm Setup

`public/ffmpeg/` must contain the **ESM** build (`dist/esm/`) of `@ffmpeg/core`, not the UMD build. The `@ffmpeg/ffmpeg` ESM entry creates a module worker (`type: "module"`) which uses `import()` to load the core — this requires an ESM module with `export default`. The UMD build lacks this export and will fail with `"failed to import ffmpeg-core.js"`.

# Converter

A file converter that runs entirely in the browser. There is no server and no upload: files never leave your device.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), drop files on the drop zone (or click it to browse), pick an output format and convert.

## Supported formats

Conversions stay within a category.

| Category | Formats | Engine |
| --- | --- | --- |
| Images | PNG, JPEG, WebP, GIF, BMP, AVIF, ICO, TIFF; SVG as input only | Canvas for PNG/JPEG/WebP output, FFmpeg.wasm for the rest |
| Audio | MP3, WAV, OGG, FLAC, AAC, M4A | FFmpeg.wasm |
| Video | MP4, WebM, AVI, MKV, MOV | FFmpeg.wasm |
| Documents | JSON ↔ CSV | Built-in |

FFmpeg.wasm (about 32 MB) is downloaded on the first audio, video or FFmpeg-based image conversion of a visit.

## Features

- Batch conversion: "Convert All", an overall progress bar and "Retry Failed".
- Image conversion in a Web Worker (OffscreenCanvas), so large images don't freeze the page.
- Per-category size limits: images 50 MB, audio 100 MB, video 200 MB, documents 10 MB.
- Keyboard and screen reader support; mobile layout with 44 px touch targets.
- Light, dark and system themes, remembered between visits.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run the unit tests |

## Documentation

- [AGENTS.md](AGENTS.md): architecture, conversion pipeline, invariants and conventions.
- [docs/backlog.md](docs/backlog.md): known bugs, tech debt and ideas.
- [docs/decisions.md](docs/decisions.md): why things are done the way they are.

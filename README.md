# Converter

100% browser-based file converter — no server, no uploads, complete privacy.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start converting files.

## What It Does

Drop any supported file and convert it to another format — everything happens locally in your browser using the Canvas API and FFmpeg compiled to WebAssembly.

| Category   | Supported Formats                                |
| ---------- | ------------------------------------------------ |
| **Images** | PNG, JPEG, WebP, GIF, BMP, AVIF, ICO, TIFF, SVG |
| **Audio**  | MP3, WAV, OGG, FLAC, AAC, M4A                   |
| **Video**  | MP4, WebM, AVI, MKV, MOV                         |
| **Docs**   | JSON <-> CSV                                     |

## Scripts

| Command           | Purpose              |
| ----------------- | -------------------- |
| `npm run dev`     | Start dev server     |
| `npm run build`   | Production build     |
| `npm run preview` | Preview prod build   |
| `npm run lint`    | Lint with ESLint     |

## Documentation

See [docs/INDEX.md](docs/INDEX.md) for full documentation.

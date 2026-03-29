# Codebase

## Directory Layout

```
src/
  lib/             # Core logic (no React dependency)
    types.ts       # Shared TypeScript interfaces (FormatInfo, CodecConfig, ConversionJob)
    formats/       # Per-category format registries
      index.ts     # Combined FORMATS array, detectFormat, getOutputFormats, utilities
      image.ts     # Image formats (PNG, JPEG, WebP, GIF, BMP, AVIF, ICO, TIFF, SVG)
      audio.ts     # Audio formats with codec metadata (MP3, WAV, OGG, FLAC, AAC, M4A)
      video.ts     # Video formats with codec metadata (MP4, WebM, AVI, MKV, MOV)
      document.ts  # Document formats with converterHint (JSON, CSV)
    converter.ts   # Thin conversion router (delegates via format metadata)
    ffmpeg-manager.ts  # FFmpeg.wasm singleton loader (ESM build)
    converters/    # Per-category conversion engines
      image.ts     # Canvas-based image conversion (uses canvasOutput flag)
      ffmpeg.ts    # FFmpeg-based audio/video/image (metadata-driven args)
      document.ts  # JSON↔CSV document conversion
  hooks/           # Custom React hooks
    useTheme.ts    # Light/dark/system theme with localStorage persistence
  components/      # React UI components
    DropZone.tsx   # Drag-and-drop file input with supported format display
    FormatPicker.tsx   # Output format pill selector
    ConversionCard.tsx # Per-file conversion card
    ThemeToggle.tsx    # Light/dark/system theme dropdown
  test/            # Vitest test suites
  App.tsx          # Root component, state management
  App.css          # Component styles
  index.css        # Global reset, CSS variables, dark theme
  main.tsx         # Entry point
```

## Conventions

- **State**: centralized in `App.tsx` via `useState`; components are presentational
- **Format registry**: `formats/` directory with per-category files; each format carries codec metadata (`CodecConfig`), `canvasOutput`, and `converterHint` flags used for automatic routing and FFmpeg arg generation
- **Conversion routing**: `converter.ts` is a thin metadata-driven router — checks `converterHint` for documents, `canvasOutput` for Canvas API, and defaults to FFmpeg
- **FFmpeg args**: built from format metadata (no switch statements); `buildFFmpegArgs` reads `codec.audio`, `codec.video`, and `codec.stripVideo` from `FormatInfo`
- **FFmpeg**: lazy-loaded singleton; ESM build served from `public/ffmpeg/`
- **CSS**: BEM-like class names, CSS custom properties for theming
- **No external UI libraries**: plain CSS, inline SVG icons

## Format Metadata Semantics

Each `FormatInfo` entry may carry optional metadata that drives conversion routing and FFmpeg argument generation:

| Field | Purpose | Example |
|---|---|---|
| `canvasOutput` | `true` for raster formats the browser Canvas API can export (PNG, JPEG, WebP). GIF, BMP, AVIF, ICO, TIFF omit this and always use FFmpeg. | `canvasOutput: true` |
| `converterHint` | Routes to a specialised converter instead of FFmpeg. Currently only `'document'` (JSON↔CSV). | `converterHint: 'document'` |
| `codec.audio` / `codec.video` | FFmpeg codec name and extra args. Media formats must define at least one. | `audio: { codec: 'libmp3lame', args: ['-q:a', '2'] }` |
| `codec.stripVideo` | Adds `-vn` to strip video streams; set `true` for audio-only outputs. | `stripVideo: true` |

**Routing priority**: Canvas (image→raster with `canvasOutput`) → Document (`converterHint === 'document'`) → FFmpeg (default).

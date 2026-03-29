# Codebase

## Directory Layout

```
src/
  lib/             # Core logic (no React dependency)
    types.ts       # Shared TypeScript interfaces
    formats.ts     # Format registry, detection, output routing
    converter.ts   # Conversion router (delegates to converters/)
    ffmpeg-manager.ts  # FFmpeg.wasm singleton loader
    converters/    # Per-category conversion engines
      image.ts     # Canvas-based image conversion
      ffmpeg.ts    # FFmpeg-based audio/video/image fallback
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
- **Conversion routing**: `converter.ts` is a thin router that delegates to `converters/image.ts` (Canvas API), `converters/ffmpeg.ts` (audio/video/image fallback), or `converters/document.ts` (JSON↔CSV)
- **FFmpeg**: lazy-loaded singleton; first conversion triggers a ~25 MB download from unpkg CDN
- **CSS**: BEM-like class names, CSS custom properties for theming
- **No external UI libraries**: plain CSS, inline SVG icons

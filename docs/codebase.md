# Codebase

## Directory Layout

```
src/
  lib/             # Core logic (no React dependency)
    types.ts       # Shared TypeScript interfaces
    formats.ts     # Format registry, detection, output routing
    converter.ts   # Conversion engine (Canvas + FFmpeg + documents)
    ffmpeg-manager.ts  # FFmpeg.wasm singleton loader
  hooks/           # Custom React hooks
    useTheme.ts    # Light/dark/system theme with localStorage persistence
  components/      # React UI components
    DropZone.tsx   # Drag-and-drop file input
    FormatPicker.tsx   # Output format pill selector
    ConversionCard.tsx # Per-file conversion card
    ThemeToggle.tsx    # Light/dark/system theme selector
  test/            # Vitest test suites
  App.tsx          # Root component, state management
  App.css          # Component styles
  index.css        # Global reset, CSS variables, dark theme
  main.tsx         # Entry point
```

## Conventions

- **State**: centralized in `App.tsx` via `useState`; components are presentational
- **Conversion routing**: `converter.ts` picks Canvas API (fast, for PNG/JPEG/WebP) or FFmpeg.wasm (everything else)
- **FFmpeg**: lazy-loaded singleton; first conversion triggers a ~25 MB download from unpkg CDN
- **CSS**: BEM-like class names, CSS custom properties for theming
- **No external UI libraries**: plain CSS, inline SVG icons

# Features

| Feature                  | Description                                                        | Status |
| ------------------------ | ------------------------------------------------------------------ | ------ |
| Image conversion         | PNG, JPEG, WebP via Canvas API; GIF, BMP, AVIF, ICO, TIFF via FFmpeg | ✅     |
| SVG rasterization        | SVG → PNG / JPEG / WebP via Canvas                                 | ✅     |
| Audio conversion         | MP3, WAV, OGG, FLAC, AAC, M4A via FFmpeg.wasm                      | ✅     |
| Video conversion         | MP4, WebM, AVI, MKV, MOV via FFmpeg.wasm                           | ✅     |
| Document conversion      | JSON ↔ CSV                                                         | ✅     |
| Drag-and-drop            | Drop files onto the page or click to browse                        | ✅     |
| Multi-file               | Convert multiple files in one session                               | ✅     |
| Batch "Convert All"      | One-click convert all queued files with overall progress bar        | ✅     |
| Batch progress           | Progress bar showing "X of Y processed" with frozen batch sizing    | ✅     |
| Retry failed             | "Retry Failed" button to re-run failed conversions (excludes validation errors) | ✅ |
| Per-file progress        | Individual progress bar per conversion                              | ✅     |
| File size validation     | Per-category size limits (image 50 MB, audio 100 MB, video 200 MB, document 10 MB) | ✅ |
| Error boundary           | Catches React render errors with "Try Again" recovery UI            | ✅     |
| Web Worker offload       | Image conversions run off-thread via OffscreenCanvas worker         | ✅     |
| Accessibility            | ARIA roles (radiogroup, progressbar, alert, listbox), keyboard navigation, screen reader announcements | ✅ |
| Responsive design        | Mobile-friendly layout with 44 px touch targets, full-width buttons at ≤ 600 px | ✅ |
| Code splitting           | React and FFmpeg in separate chunks; FFmpeg lazy-loaded on first conversion | ✅ |
| Theme selector           | Light / Dark / System with localStorage persistence and FOUC prevention | ✅     |
| 100% client-side         | No server, no uploads — complete privacy                           | ✅     |

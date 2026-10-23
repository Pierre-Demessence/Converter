# Decisions

## Single-threaded FFmpeg core

The app ships `@ffmpeg/core`, not `@ffmpeg/core-mt`. The multi-threaded core needs `SharedArrayBuffer`, which browsers only expose on cross-origin-isolated pages (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers). Single-threaded keeps the app deployable as plain static files on any host.

Rejected for now: `core-mt`. It is faster for video, but it requires those headers on every host, and COEP also blocks any cross-origin resource that doesn't opt in with CORS or CORP.

## Canvas first for PNG, JPEG and WebP output

Image conversions whose output the browser can encode go through Canvas/OffscreenCanvas; FFmpeg is only used for the other outputs or when canvas decoding fails. The common image conversions then stay instant and never trigger the ~32 MB FFmpeg download.

Rejected: FFmpeg for every image. That would mean one code path, but the first image conversion would wait on the FFmpeg download, and every conversion would run in single-threaded wasm instead of the browser's native codecs.

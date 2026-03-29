import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@ffmpeg/ffmpeg') || id.includes('@ffmpeg/util')) {
            return 'ffmpeg';
          }
          if (id.includes('react-dom') || id.includes('react/')) {
            return 'react';
          }
        },
      },
    },
  },
});

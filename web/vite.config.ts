import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Server block removed for Vercel production deployment
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('/data/constants')) return 'data';
              if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'react-vendor';
              if (id.includes('node_modules/@mediapipe')) return 'mediapipe';
              if (id.includes('node_modules/react-webcam')) return 'webcam';
            },
          },
        },
      },
    };
});
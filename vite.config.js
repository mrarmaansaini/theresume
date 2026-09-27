import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('/node_modules/lucide-react/')) return 'ui-icons';
          if (id.includes('/node_modules/jspdf/')) return 'pdf-export';
          if (id.includes('/node_modules/@firebase/ai/') || id.includes('/node_modules/firebase/ai/')) return 'firebase-ai';
          if (id.includes('/node_modules/@firebase/auth/') || id.includes('/node_modules/firebase/auth/')) return 'firebase-auth';
          if (id.includes('/node_modules/@firebase/firestore/') || id.includes('/node_modules/firebase/firestore/')) return 'firebase-firestore';
          if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) return 'firebase-core';
          return undefined;
        },
      },
    },
  },
});

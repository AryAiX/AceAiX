import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  /* The legal documents have one home — the app's. Two copies of a privacy
     policy is the defect this alias exists to make impossible. */
  resolve: {
    alias: { '@legal': path.resolve(here, '../mobile/lib/legal') },
  },
  server: {
    fs: { allow: ['..'] },
  },
});

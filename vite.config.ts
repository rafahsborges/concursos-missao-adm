import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist/public' },
  server: { proxy: { '/trpc': 'http://localhost:3000' } },
});

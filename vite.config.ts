import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: '127.0.0.1' },
  // 'hidden': maps are generated for debugging but not referenced (and not deployed, see firebase.json)
  build: { target: 'es2022', sourcemap: 'hidden' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

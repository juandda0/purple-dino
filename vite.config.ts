import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: '127.0.0.1' },
  // 'hidden': maps are generated for debugging but not referenced (and not deployed, see firebase.json)
  build: {
    target: 'es2022',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // React + Firebase in their own chunk: its hash only changes with the dependencies, so the phones that
        // come back every class keep it cached (immutable, firebase.json) across deploys of the game itself
        manualChunks: id => (/node_modules\/(react|react-dom|scheduler|firebase|@firebase|idb|tslib)\//.test(id) ? 'vendor' : undefined),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

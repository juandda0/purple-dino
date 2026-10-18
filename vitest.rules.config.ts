import { defineConfig } from 'vitest/config';

// Security-rules tests: run against the Realtime Database emulator (npm run test:rules)
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
    fileParallelism: false,
  },
});

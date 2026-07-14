import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['specs/**/*.spec.ts'],
    testTimeout: 10_000,
  },
});

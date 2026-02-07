import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'apps/gateway/src/**/*.ts',
        'trading-orchestrator/src/**/*.ts',
        'CloddsBot-main/src/**/*.ts',
      ],
    },
    // Reset modules between tests to ensure clean state
    clearMocks: true,
    restoreMocks: true,
  },
});

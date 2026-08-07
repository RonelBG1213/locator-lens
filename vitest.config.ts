import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only — anything needing a real DOM lives in tests/e2e and runs
    // under Playwright against the built extension.
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node',
  },
});

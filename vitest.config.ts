import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: [
      {
        // Map the JSSG runtime virtual module to a test mock so unit tests
        // can call validate() without a live JSSG runtime.
        find: /^codemod:ast-grep$/,
        replacement: fileURLToPath(
          new URL('./tests/__mocks__/ast-grep.ts', import.meta.url)
        ),
      },
    ],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

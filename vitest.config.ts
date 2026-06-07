import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Two test projects:
 *   • node — pure-logic unit + integration tests for the api/ serverless layer
 *            (identity tokens, payments seam, backend adapters, row mappers …).
 *   • dom  — React component tests (jsdom + Testing Library) for src/ screens.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["api/lib/**/*.ts", "src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "src/main.tsx", "src/vite-env.d.ts"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/node/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["tests/dom/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup.dom.ts"],
        },
      },
    ],
  },
});

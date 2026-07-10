import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@audit-canvas/schema": `${root}packages/schema/src/index.ts`,
      "@audit-canvas/core": `${root}packages/core/src/index.ts`
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.tsx"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"]
    }
  }
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "server-only", replacement: root("./tests/stubs/server-only.ts") },
      { find: /^@\//, replacement: root("./") },
    ],
  },
  test: { include: ["**/*.test.ts"], exclude: ["node_modules", ".next"], testTimeout: 30000 },
});

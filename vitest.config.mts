import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // تست‌های یکپارچه به دیتابیس نیاز دارند: `npm run test:integration`
    exclude: ["src/**/*.int.test.ts"],
  },
});

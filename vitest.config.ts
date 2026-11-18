import { defineConfig, mergeConfig } from "vitest/config"

import viteConfig from "./vite.config.ts"

export default mergeConfig(
  viteConfig({ mode: "test", command: "serve" }),
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["test/unit/**/*.test.{ts,tsx}"],
      setupFiles: ["test/unit/setup.ts"],
      env: { VITE_API_URL: "http://api.test/api/v1" },
    },
  }),
)

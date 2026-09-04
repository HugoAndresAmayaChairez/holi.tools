import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

export default defineConfig({
  site: "https://test.holi.tools",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es", "fr", "de", "pt", "it", "zh", "ja", "ko", "ru"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    server: {
      fs: {
        allow: [repoRoot],
      },
    },
    plugins: [wasm(), topLevelAwait()],
  },
});

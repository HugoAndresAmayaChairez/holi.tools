import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { SUPPORTED_LANGS, DEFAULT_LANG } from "@holi/configs/i18n";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

// https://astro.build/config
export default defineConfig({
  site: "https://holi.tools",
  compressHTML: true,
  build: {
    inlineStylesheets: "always",
  },
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: SUPPORTED_LANGS,
    routing: {
      prefixDefaultLocale: false,
      fallbackType: "redirect"
    },
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    server: {
      fs: {
        allow: [repoRoot],
      },
    },
    plugins: [wasm(), topLevelAwait()],
  },
});

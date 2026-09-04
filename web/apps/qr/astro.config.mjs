import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SUPPORTED_LANGS, DEFAULT_LANG } from "@holi/configs/i18n";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

export default defineConfig({
  site: "https://qr.holi.tools",
  // Workaround for Vite "Outdated Optimize Dep" 504s coming from the Astro dev toolbar
  // dynamic imports (audit/aria-query/axobject-query) during local development.
  // The app does not rely on the dev toolbar at runtime.
  devToolbar: {
    enabled: false
  },
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: SUPPORTED_LANGS,
    routing: {
      prefixDefaultLocale: false,
      fallbackType: "redirect"
    }
  },
  integrations: [tailwind({
    applyBaseStyles: false,
  })],
  vite: {
    server: {
      fs: {
        allow: [repoRoot]
      }
    },
    plugins: [
      wasm(),
      topLevelAwait()
    ]
  }
});

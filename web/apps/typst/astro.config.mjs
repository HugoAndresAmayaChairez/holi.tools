import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@holi/configs/i18n";

export default defineConfig({
  site: "https://typst.holi.tools",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    plugins: [wasm(), topLevelAwait()],
  },
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: SUPPORTED_LANGS,
    routing: {
      prefixDefaultLocale: false,
    },
  },
});

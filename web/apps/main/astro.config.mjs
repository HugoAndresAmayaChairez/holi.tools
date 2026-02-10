import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { SUPPORTED_LANGS, DEFAULT_LANG } from "@holi/configs/i18n";

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
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
      fallbackType: "redirect"
    },
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    plugins: [wasm(), topLevelAwait()],
  },
});

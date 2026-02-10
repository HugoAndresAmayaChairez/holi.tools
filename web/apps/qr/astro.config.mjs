import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

import { SUPPORTED_LANGS, DEFAULT_LANG } from "@holi/configs/i18n";

export default defineConfig({
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: SUPPORTED_LANGS,
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
      fallbackType: "redirect"
    }
  },
  integrations: [tailwind({
    applyBaseStyles: false,
  })],
  vite: {
    server: {
      fs: {
        allow: ['../..']
      }
    },
    plugins: [
      wasm(),
      topLevelAwait()
    ]
  }
});

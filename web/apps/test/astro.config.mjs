import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
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
    plugins: [wasm(), topLevelAwait()],
  },
});

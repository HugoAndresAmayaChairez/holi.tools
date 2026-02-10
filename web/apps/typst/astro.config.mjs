import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

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
});

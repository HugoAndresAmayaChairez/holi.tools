import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://image-holi.pages.dev",
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es", "zh", "hi", "ar", "bn", "pt"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});

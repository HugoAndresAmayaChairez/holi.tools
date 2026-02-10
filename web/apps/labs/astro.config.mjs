import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import { SUPPORTED_LANGS, DEFAULT_LANG } from "@holi/configs/i18n";

export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: SUPPORTED_LANGS,
    routing: {
      prefixDefaultLocale: true,
      fallbackType: "redirect"
    },
  },
});

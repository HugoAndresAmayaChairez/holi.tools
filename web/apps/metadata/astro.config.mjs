import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { DEFAULT_LANG, SUPPORTED_LANGS } from '@holi/configs/i18n';

export default defineConfig({
  site: "https://metadata.holi.tools",
  integrations: [tailwind({
    applyBaseStyles: false,
  }), react()],
  i18n: {
    defaultLocale: DEFAULT_LANG,
    locales: SUPPORTED_LANGS,
    routing: { prefixDefaultLocale: false },
  },
});

/** @type {import('tailwindcss').Config} */
import sharedConfig from "@holi/configs/tailwind.config";

export default {
  ...sharedConfig,
  darkMode: ["selector", '[data-holi-theme="dark"]'],
  content: [
    ...sharedConfig.content,
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"
  ],
};

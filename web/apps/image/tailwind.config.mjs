/** @type {import("tailwindcss").Config} */
import sharedConfig from "@holi/configs/tailwind.config";

export default {
  ...sharedConfig,
  content: [
    ...sharedConfig.content,
    "./src/**/*.{astro,html,js,md,mdx,ts}",
  ],
};

/** @type {import('tailwindcss').Config} */
import sharedConfig from "@holi/configs/tailwind.config";

export default {
    ...sharedConfig,
    content: [
        ...sharedConfig.content,
        "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    ],
};

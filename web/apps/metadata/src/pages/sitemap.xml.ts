import type { APIRoute } from "astro";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@holi/configs/i18n";

const lastmod = "2026-05-31";

export const GET: APIRoute = ({ site }) => {
  const baseUrl = (site ?? new URL("https://metadata.holi.tools"))
    .toString()
    .replace(/\/$/, "");
  const urls = SUPPORTED_LANGS.map((lang) => {
    const path = lang === DEFAULT_LANG ? "/" : `/${lang}/`;
    return `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`;
  }).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};

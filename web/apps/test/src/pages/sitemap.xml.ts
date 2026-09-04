import type { APIRoute } from "astro";

const DEFAULT_LANG = "en";
const LOCALES = ["en", "es", "fr", "de", "pt", "it", "zh", "ja", "ko", "ru"] as const;

function toAbsoluteUrl(site: URL, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, site).toString();
}

function localePath(locale: string) {
  return locale === DEFAULT_LANG ? "/" : `/${locale}/`;
}

export const GET: APIRoute = ({ site }) => {
  if (!site) return new Response("Missing `site` in astro.config.mjs", { status: 500 });

  const now = new Date().toISOString();
  const xmlEntries = LOCALES.map((locale) => {
    const loc = toAbsoluteUrl(site, localePath(locale));
    const priority = locale === DEFAULT_LANG ? "0.8" : "0.5";
    return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
};


import type { APIRoute } from "astro";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@holi/configs/i18n";

function toAbsoluteUrl(site: URL, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, site).toString();
}

function localePrefix(locale: string) {
  return locale === DEFAULT_LANG ? "" : `/${locale}`;
}

function withTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

function urlEntry(loc: string, now: string, priority: string, changefreq: string) {
  return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    return new Response("Missing `site` in astro.config.mjs", { status: 500 });
  }

  const now = new Date().toISOString();
  const locales = Array.from(SUPPORTED_LANGS);

  const homeEntries = locales
    .map((locale) => {
      const loc = toAbsoluteUrl(site, withTrailingSlash(`${localePrefix(locale)}/`));
      return urlEntry(loc, now, locale === DEFAULT_LANG ? "1.0" : "0.8", "weekly");
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${homeEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
};

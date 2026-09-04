import type { APIRoute } from "astro";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@holi/configs/i18n";

function toAbsoluteUrl(site: URL, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, site).toString();
}

function withTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

const PAGES = ["", "private", "dm", "friend", "join", "vault"] as const;

export const GET: APIRoute = ({ site }) => {
  if (!site) return new Response("Missing `site` in astro.config.mjs", { status: 500 });

  const now = new Date().toISOString();
  const locales = Array.from(SUPPORTED_LANGS);

  const entries = locales
    .flatMap((locale) =>
      PAGES.map((page) => {
        const path = page ? `/${locale}/${page}` : `/${locale}/`;
        const loc = toAbsoluteUrl(site, withTrailingSlash(path));
        const priority = page === "" ? (locale === DEFAULT_LANG ? "0.9" : "0.7") : "0.6";
        const freq = page === "" ? "weekly" : "monthly";
        return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
      })
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
};


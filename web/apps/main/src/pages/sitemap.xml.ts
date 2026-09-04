import type { APIRoute } from "astro";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@holi/configs/i18n";
import { toolSlugs } from "../i18n/editorial";

function toAbsoluteUrl(site: URL, path: string) {
  return new URL(path.startsWith("/") ? path : `/${path}`, site).toString();
}

function localePath(locale: string, suffix = "") {
  const prefix = locale === DEFAULT_LANG ? "" : `/${locale}`;
  return suffix ? `${prefix}/${suffix}/` : `${prefix || ""}/`;
}

export const GET: APIRoute = ({ site }) => {
  if (!site) return new Response("Missing `site` in astro.config.mjs", { status: 500 });

  const now = new Date().toISOString();
  const locales = Array.from(SUPPORTED_LANGS);
  const pages = ["", ...toolSlugs.map((tool) => `tools/${tool}`)];
  const entries = pages.flatMap((page) => locales.map((locale) => {
    const alternates = locales.map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate}" href="${toAbsoluteUrl(site, localePath(alternate, page))}" />`).join("");
    const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${toAbsoluteUrl(site, localePath(DEFAULT_LANG, page))}" />`;
    const priority = page ? "0.8" : locale === DEFAULT_LANG ? "1.0" : "0.9";
    return `<url><loc>${toAbsoluteUrl(site, localePath(locale, page))}</loc>${alternates}${xDefault}<lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  })).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });
};

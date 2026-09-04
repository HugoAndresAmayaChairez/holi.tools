import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SUPPORTED_LANGS } from "@holi/configs/i18n";

function toAbsoluteUrl(site: URL, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, site).toString();
}

function withTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) return new Response("Missing `site` in astro.config.mjs", { status: 500 });

  const now = new Date().toISOString();
  const locales = [...SUPPORTED_LANGS];

  const experiments = await getCollection("experiments");

  const homeEntries = locales
    .map((locale) => {
      const loc = toAbsoluteUrl(site, withTrailingSlash(`/${locale}`));
      return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
    })
    .join("");

  const experimentEntries = experiments
    .map((entry) => {
      const normalizedSlug = entry.slug.replace(/-[a-z]{2}$/, "");
      const collection = entry.data.format === "paper" ? "papers" : "experiments";
      const loc = toAbsoluteUrl(
        site,
        withTrailingSlash(`/${entry.data.lang}/${collection}/${normalizedSlug}`)
      );
      return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    })
    .join("");

  const paperEntries = locales
    .map((locale) => {
      const loc = toAbsoluteUrl(site, withTrailingSlash(`/${locale}/papers`));
      return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    })
    .join("");

  const tagEntries = locales
    .flatMap((locale) => {
      const localizedTags = [...new Set(
        experiments.filter((entry) => entry.data.lang === locale).flatMap((entry) => entry.data.tags)
      )];
      return localizedTags.map((tag) => {
        const loc = toAbsoluteUrl(site, withTrailingSlash(`/${locale}/tags/${tag}`));
        return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`;
      });
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${homeEntries}${paperEntries}${experimentEntries}${tagEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
};

import type { APIRoute } from "astro";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@holi/configs/i18n";

function toAbsoluteUrl(site: URL, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, site).toString();
}

export const GET: APIRoute = ({ site }) => {
  if (!site)
    return new Response("Missing `site` in astro.config.mjs", { status: 500 });

  const entries = SUPPORTED_LANGS.flatMap((lang) => {
    const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
    return [
      { path: `${prefix}/`, priority: "1.0" },
      { path: `${prefix}/privacy/`, priority: "0.5" },
    ];
  });
  const xmlEntries = entries
    .map(({ path, priority }) => {
      const loc = toAbsoluteUrl(site, path);
      return `<url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
    })
    .join("");

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

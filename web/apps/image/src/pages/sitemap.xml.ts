import type { APIRoute } from "astro";
import { SUPPORTED_LANGS } from "@holi/configs/i18n";

export const GET: APIRoute = ({ site }) => {
  if (!site) return new Response("Missing site in Astro config", { status: 500 });
  const paths = SUPPORTED_LANGS.flatMap((lang) => {
    const prefix = lang === "en" ? "" : `/${lang}`;
    return [`${prefix}/`, `${prefix}/privacy/`];
  });
  const entries = paths
    .map((pathname) => {
      const loc = new URL(pathname, site).toString();
      return "<url><loc>" + loc + "</loc></url>";
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    entries + "</urlset>";
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

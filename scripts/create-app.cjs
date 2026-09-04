const fs = require("node:fs");
const path = require("node:path");

const APP_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function validateAppName(appName) {
  return APP_NAME_PATTERN.test(appName);
}

function toDisplayName(appName) {
  return appName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lines(...values) {
  return values.join("\n") + "\n";
}

function writeFile(rootDir, relativePath, contents) {
  const target = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function createApp(appName, options = {}) {
  if (!validateAppName(appName)) {
    throw new Error("Invalid app name: " + appName);
  }

  const rootDir = options.rootDir || path.join(__dirname, "..");
  const log = options.log || console.log;
  const appDir = path.join(rootDir, "web", "apps", appName);
  const packageName = "holi-" + appName;
  const projectName = appName + "-holi";
  const displayName = toDisplayName(appName);
  const siteUrl = "https://" + appName + ".holi.tools";

  if (fs.existsSync(appDir)) {
    throw new Error("App " + appName + " already exists at " + appDir);
  }

  const packageJson = {
    name: packageName,
    type: "module",
    version: "0.0.1",
    scripts: {
      dev: "astro dev",
      start: "astro dev",
      build: "astro build",
      preview: "astro preview",
      astro: "astro",
    },
    dependencies: {
      "@astrojs/tailwind": "catalog:",
      "@holi/configs": "workspace:*",
      "@holi/ui": "workspace:*",
      astro: "catalog:",
      tailwindcss: "catalog:",
    },
  };

  const files = {
    "package.json": JSON.stringify(packageJson, null, 2) + "\n",
    "astro.config.mjs": lines(
      'import { defineConfig } from "astro/config";',
      'import tailwind from "@astrojs/tailwind";',
      "",
      "export default defineConfig({",
      "  site: " + JSON.stringify(siteUrl) + ",",
      "  integrations: [",
      "    tailwind({",
      "      applyBaseStyles: false,",
      "    }),",
      "  ],",
      "  i18n: {",
      '    defaultLocale: "en",',
      '    locales: ["en"],',
      "    routing: {",
      "      prefixDefaultLocale: false,",
      "    },",
      "  },",
      "});"
    ),
    "tailwind.config.mjs": lines(
      '/** @type {import("tailwindcss").Config} */',
      'import sharedConfig from "@holi/configs/tailwind.config";',
      "",
      "export default {",
      "  ...sharedConfig,",
      "  content: [",
      "    ...sharedConfig.content,",
      '    "./src/**/*.{astro,html,js,md,mdx,ts}",',
      "  ],",
      "};"
    ),
    "src/i18n/ui.ts": lines(
      'export const languages = [{ code: "en", name: "English" }] as const;',
      "",
      "export const copy = {",
      '  title: "Holi ' + displayName + '",',
      '  description: "Describe the useful outcome of this tool.",',
      '  privacyTitle: "Privacy summary",',
      '  privacySummary: "This scaffold processes its example state on your device. Update these facts before adding files, storage, or network features.",',
      "} as const;"
    ),
    "src/changelog.ts": lines(
      'import type { VersionEntry } from "@holi/configs/changelogs";',
      "",
      "export const changelog: VersionEntry[] = [",
      "  {",
      '    version: "0.0.1",',
      '    date: "YYYY-MM-DD",',
      "    changes: [",
      '      "Created the initial Holi product shell",',
      "    ],",
      "  },",
      "];"
    ),
    "src/layouts/AppLayout.astro": lines(
      "---",
      'import BaseLayout from "@holi/ui/layouts/BaseLayout.astro";',
      'import packageInfo from "../../package.json";',
      'import { changelog } from "../changelog";',
      'import { languages } from "../i18n/ui";',
      "",
      "interface Props {",
      "  title: string;",
      "  description?: string;",
      '  lang?: "en";',
      "}",
      "",
      'const { title, description, lang = "en" } = Astro.props;',
      "---",
      "",
      "<BaseLayout",
      "  title={title}",
      "  description={description}",
      "  lang={lang}",
      "  languages={languages}",
      "  hreflangLanguages={languages}",
      '  colorScheme="default"',
      "  version={packageInfo.version}",
      "  changelog={changelog}",
      ">",
      '  <slot name="head" slot="head">',
      '    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
      '    <link rel="manifest" href="/manifest.webmanifest" />',
      "  </slot>",
      "",
      "  <slot />",
      "</BaseLayout>"
    ),
    "src/pages/index.astro": lines(
      "---",
      'import PrivacySummary from "@holi/ui/components/PrivacySummary.astro";',
      'import AppLayout from "../layouts/AppLayout.astro";',
      'import { copy } from "../i18n/ui";',
      'import "../styles/app.css";',
      "",
      "const privacyFacts = [",
      "  {",
      '    label: "Processing",',
      '    value: "The current example state is processed on this device.",',
      '    tone: "local",',
      "  },",
      "  {",
      '    label: "Storage",',
      '    value: "No persistent product data is implemented in this scaffold.",',
      '    tone: "local",',
      "  },",
      "  {",
      '    label: "Network",',
      '    value: "The hosting provider serves the app and can observe technical request metadata.",',
      '    tone: "connected",',
      "  },",
      "] as const;",
      "---",
      "",
      "<AppLayout title={copy.title} description={copy.description}>",
      '  <main id="main-content" class="tool-page">',
      "    <header>",
      '      <p class="eyebrow">Holi.tools</p>',
      "      <h1>" + displayName + "</h1>",
      "      <p>{copy.description}</p>",
      "    </header>",
      "",
      '    <section class="tool-surface" aria-label="' +
        displayName +
        ' workspace">',
      "      <p>Build the first complete product flow here.</p>",
      "    </section>",
      "",
      "    <PrivacySummary",
      '      id="' + appName + '-privacy"',
      "      title={copy.privacyTitle}",
      "      summary={copy.privacySummary}",
      "      facts={privacyFacts}",
      '      detailsHref="/privacy/"',
      "    />",
      "  </main>",
      "</AppLayout>"
    ),
    "src/pages/privacy.astro": lines(
      "---",
      'import AppLayout from "../layouts/AppLayout.astro";',
      'import "../styles/app.css";',
      "---",
      "",
      '<AppLayout title="Privacy · Holi ' +
        displayName +
        '" description="How this Holi tool handles data.">',
      '  <main id="main-content" class="prose-page">',
      '    <a href="/">← Back to the tool</a>',
      "    <h1>Privacy</h1>",
      "    <p>",
      "      This scaffold has no product data flow yet. Before release, replace",
      "      this page and the visible privacy summary with facts verified from",
      "      the implementation.",
      "    </p>",
      "    <h2>Hosting metadata</h2>",
      "    <p>",
      "      Serving a web application exposes technical request metadata such as",
      "      IP address, request time, routing information, and traffic volume to",
      "      the hosting provider.",
      "    </p>",
      "  </main>",
      "</AppLayout>"
    ),
    "src/pages/404.astro": lines(
      "---",
      'import AppLayout from "../layouts/AppLayout.astro";',
      'import "../styles/app.css";',
      "---",
      "",
      '<AppLayout title="Not found · Holi ' + displayName + '">',
      '  <main id="main-content" class="prose-page">',
      "    <h1>Page not found</h1>",
      '    <p><a href="/">Return to the tool</a></p>',
      "  </main>",
      "</AppLayout>"
    ),
    "src/pages/sitemap.xml.ts": lines(
      'import type { APIRoute } from "astro";',
      "",
      "export const GET: APIRoute = ({ site }) => {",
      '  if (!site) return new Response("Missing site in Astro config", { status: 500 });',
      '  const paths = ["/", "/privacy/"];',
      "  const entries = paths",
      "    .map((pathname) => {",
      "      const loc = new URL(pathname, site).toString();",
      '      return "<url><loc>" + loc + "</loc></url>";',
      "    })",
      '    .join("");',
      '  const xml = `<?xml version="1.0" encoding="UTF-8"?>\\n` +',
      '    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +',
      '    entries + "</urlset>";',
      "  return new Response(xml, {",
      '    headers: { "Content-Type": "application/xml; charset=utf-8" },',
      "  });",
      "};"
    ),
    "src/styles/app.css": lines(
      "@tailwind base;",
      "@tailwind components;",
      "@tailwind utilities;",
      "",
      ".tool-page,",
      ".prose-page {",
      "  width: min(100% - 2rem, 64rem);",
      "  margin: 0 auto;",
      "  padding: 6rem 0 3rem;",
      "}",
      "",
      ".tool-page header {",
      "  margin-bottom: 3rem;",
      "}",
      "",
      ".eyebrow {",
      "  color: var(--text-muted);",
      "  font-size: 0.75rem;",
      "  font-weight: 700;",
      "  letter-spacing: 0.12em;",
      "  text-transform: uppercase;",
      "}",
      "",
      "h1 {",
      "  margin: 0;",
      "  font-size: clamp(2.5rem, 8vw, 5rem);",
      "  letter-spacing: -0.055em;",
      "}",
      "",
      ".tool-surface {",
      "  min-height: 20rem;",
      "  margin-bottom: 2rem;",
      "  padding: 1.5rem;",
      "  border: 1px solid var(--color-border);",
      "  border-radius: 1rem;",
      "}",
      "",
      ".prose-page {",
      "  max-width: 48rem;",
      "  line-height: 1.7;",
      "}"
    ),
    "public/manifest.webmanifest":
      JSON.stringify(
        {
          name: "Holi " + displayName,
          short_name: displayName,
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#6366f1",
          icons: [
            {
              src: "/favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
        null,
        2
      ) + "\n",
    "public/robots.txt": lines(
      "User-agent: *",
      "Allow: /",
      "Sitemap: " + siteUrl + "/sitemap.xml"
    ),
    "public/llms.txt": lines(
      "# Holi " + displayName,
      "",
      "Status: product scaffold; update this file before release.",
      "URL: " + siteUrl + "/",
      "App path: web/apps/" + appName,
      "Product brief: web/apps/" + appName + "/product.md",
      "",
      "Privacy facts must match the visible summary and implemented data flow."
    ),
    "public/favicon.svg": lines(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
      '  <rect width="64" height="64" rx="16" fill="#6366f1"/>',
      '  <circle cx="32" cy="32" r="12" fill="none" stroke="white" stroke-width="6"/>',
      "</svg>"
    ),
    "about.md": lines(
      "# About Holi " + displayName,
      "",
      "Describe the user problem, primary workflow, and product-specific identity.",
      "",
      "## Shared shell",
      "",
      "- Astro and vanilla TypeScript",
      "- @holi/ui components and BaseLayout",
      "- @holi/configs contracts",
      "",
      "## Privacy boundary",
      "",
      "Replace this section with the verified data flow before release."
    ),
    "product.md": lines(
      "# Holi " + displayName,
      "",
      "## Outcome",
      "",
      "Describe the concrete useful outcome for the primary user.",
      "",
      "## Product identity",
      "",
      "- Domain: " + siteUrl,
      "- Palette: TODO",
      "- Mascot: TODO",
      "- Primary flow: TODO",
      "",
      "## Scope",
      "",
      "- Current: one complete vertical workflow.",
      "- Deferred: accounts, cloud state, and connected features until justified.",
      "",
      "## Data flow",
      "",
      "Document processing, storage, network calls, providers, and recipients here."
    ),
  };

  log("Creating Holi product: " + appName + " in " + appDir);
  for (const [relativePath, contents] of Object.entries(files)) {
    writeFile(appDir, relativePath, contents);
  }

  const rootPackagePath = path.join(rootDir, "package.json");
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
  rootPackage.scripts = rootPackage.scripts || {};
  rootPackage.scripts["deploy:" + appName] =
    "turbo run build --filter=" +
    packageName +
    " && wrangler pages deploy ./web/apps/" +
    appName +
    "/dist --project-name " +
    projectName;
  fs.writeFileSync(
    rootPackagePath,
    JSON.stringify(rootPackage, null, 2) + "\n"
  );

  log("Created Holi product shell, privacy disclosure, and product documents.");
  log(
    "Next: complete product.md and follow docs/development.md."
  );

  return { appDir, packageName, projectName, siteUrl };
}

function printHelp() {
  console.log(
    lines(
      "Usage: pnpm run create-app <app-name>",
      "",
      "Creates a web-first Astro product under web/apps/<app-name>.",
      "The scaffold includes the Holi shell, privacy summary, version/changelog,",
      "one truthful locale, SEO routes, and product documentation.",
      "",
      "Rules: lowercase letters, numbers, and dashes; must start alphanumeric."
    )
  );
}

function main(rawArgs = process.argv.slice(2)) {
  const args = rawArgs.filter((arg) => arg !== "--");
  const appName = args[0];

  if (!appName || appName === "-h" || appName === "--help") {
    printHelp();
    return;
  }

  if (!validateAppName(appName)) {
    console.error("Invalid app name: " + appName);
    printHelp();
    process.exitCode = 1;
    return;
  }

  try {
    createApp(appName);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createApp,
  main,
  toDisplayName,
  validateAppName,
};

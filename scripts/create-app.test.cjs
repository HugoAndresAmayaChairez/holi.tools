const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const sourceScript = path.join(__dirname, "create-app.cjs");

test("validates app names without accepting path traversal", () => {
  const result = spawnSync(process.execPath, [sourceScript, "../escape"], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid app name/);
});

test("creates a web-first Holi product scaffold", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "holi-create-app-"));

  try {
    fs.mkdirSync(path.join(rootDir, "web", "apps"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
    fs.copyFileSync(
      sourceScript,
      path.join(rootDir, "scripts", "create-app.cjs")
    );
    fs.writeFileSync(
      path.join(rootDir, "package.json"),
      JSON.stringify({ private: true, scripts: {} }, null, 2)
    );

    const result = spawnSync(
      process.execPath,
      [path.join(rootDir, "scripts", "create-app.cjs"), "focus-timer"],
      { cwd: rootDir, encoding: "utf8" }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const appDir = path.join(rootDir, "web", "apps", "focus-timer");
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(appDir, "package.json"), "utf8")
    );
    const layout = fs.readFileSync(
      path.join(appDir, "src", "layouts", "AppLayout.astro"),
      "utf8"
    );
    const index = fs.readFileSync(
      path.join(appDir, "src", "pages", "index.astro"),
      "utf8"
    );
    const rootPackage = JSON.parse(
      fs.readFileSync(path.join(rootDir, "package.json"), "utf8")
    );

    assert.equal(packageJson.dependencies.astro, "catalog:");
    assert.equal(packageJson.dependencies["@holi/ui"], "workspace:*");
    assert.equal(packageJson.dependencies.react, undefined);
    assert.equal(packageJson.dependencies["@astrojs/react"], undefined);
    assert.match(layout, /BaseLayout/);
    assert.match(layout, /packageInfo\.version/);
    assert.match(index, /PrivacySummary/);
    assert.match(index, /privacyFacts/);

    for (const requiredPath of [
      "about.md",
      "product.md",
      "src/changelog.ts",
      "src/i18n/ui.ts",
      "src/pages/privacy.astro",
      "src/pages/sitemap.xml.ts",
      "public/manifest.webmanifest",
      "public/robots.txt",
      "public/llms.txt",
    ]) {
      assert.equal(
        fs.existsSync(path.join(appDir, requiredPath)),
        true,
        `missing ${requiredPath}`
      );
    }

    assert.equal(
      rootPackage.scripts["deploy:focus-timer"],
      "turbo run build --filter=holi-focus-timer && wrangler pages deploy ./web/apps/focus-timer/dist --project-name focus-timer-holi"
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

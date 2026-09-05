import fs from "node:fs/promises";
import path from "node:path";

const distDir = path.join(process.cwd(), "dist");
const distAstroDir = path.join(distDir, "_astro");

const overrideUrl =
  (process.env.TYPST_COMPILER_WASM_URL || process.env.PUBLIC_TYPST_COMPILER_WASM_URL || "")
    .trim() || "/wasm/typst_ts_web_compiler_bg.wasm";

/**
 * Give the service worker a cache name that changes per build (and per
 * release), so activate() can drop the previous cache instead of leaving
 * one copy of the app and compiler behind for every worker restart.
 */
async function stampServiceWorker() {
  const swPath = path.join(distDir, "sw.js");
  let source;
  try {
    source = await fs.readFile(swPath, "utf8");
  } catch {
    console.warn("[typst] dist/sw.js not found; skipping cache stamp");
    return;
  }
  const placeholder = "__HOLI_TYPST_BUILD__";
  if (!source.includes(placeholder)) {
    console.log("[typst] sw.js already stamped");
    return;
  }
  const pkg = JSON.parse(await fs.readFile(path.join(process.cwd(), "package.json"), "utf8"));
  const stamp = `${pkg.version}-${Date.now().toString(36)}`;
  await fs.writeFile(swPath, source.split(placeholder).join(stamp), "utf8");
  console.log(`[typst] stamped sw.js cache as holi-typst-${stamp}`);
}

async function main() {
  await stampServiceWorker();

  const files = await fs.readdir(distAstroDir);
  const wasmFile = files.find((f) => /^typst_ts_web_compiler_bg\..+\.wasm$/i.test(f));
  const jsFiles = files.filter((f) => /\.js$/i.test(f));

  if (!wasmFile) {
    console.log(
      `[typst] no compiler wasm artifacts found in ${distAstroDir} (already patched?)`
    );
    return;
  }

  const wasmPath = path.join(distAstroDir, wasmFile);
  const wasmPublicPath = `/_astro/${wasmFile}`;

  const stat = await fs.stat(wasmPath);
  const sizeMiB = stat.size / (1024 * 1024);

  let replacedCount = 0;
  for (const jsFile of jsFiles) {
    const jsPath = path.join(distAstroDir, jsFile);
    const src = await fs.readFile(jsPath, "utf8");
    if (!src.includes(wasmPublicPath)) continue;
    const next = src.split(wasmPublicPath).join(overrideUrl);
    replacedCount += src.split(wasmPublicPath).length - 1;
    await fs.writeFile(jsPath, next, "utf8");
  }

  if (replacedCount === 0) {
    console.warn(
      `[typst] warning: did not find ${wasmPublicPath} in any JS chunk; not deleting wasm`
    );
    return;
  }

  await fs.unlink(wasmPath);

  console.log(
    `[typst] patched ${replacedCount} reference(s) ${wasmPublicPath} -> ${overrideUrl}; removed ${wasmFile} (${sizeMiB.toFixed(
      1
    )} MiB)`
  );
}

main().catch((err) => {
  console.error("[typst] patch-pages-compiler-wasm failed", err);
  process.exitCode = 1;
});

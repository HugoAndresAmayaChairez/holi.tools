import fs from "node:fs/promises";
import path from "node:path";

const distAstroDir = path.join(process.cwd(), "dist", "_astro");

const overrideUrl =
  (process.env.TYPST_COMPILER_WASM_URL || process.env.PUBLIC_TYPST_COMPILER_WASM_URL || "")
    .trim() || "/wasm/typst_ts_web_compiler_bg.wasm";

async function main() {
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

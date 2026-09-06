import { access, writeFile } from "node:fs/promises";

// wasm-pack writes a '*' .gitignore in each target. Override it for npm so a
// root-package pack includes the WASM, declarations and Node's CJS package scope.
for (const target of ["pkg", "pkg-node"]) {
  for (const file of ["holi_wasm_qr.js", "holi_wasm_qr_bg.wasm", "holi_wasm_qr.d.ts", "package.json"]) {
    await access(new URL(`../${target}/${file}`, import.meta.url)).catch(() => {
      throw new Error(`Missing ${target}/${file}; run pnpm --filter @holi/wasm-qr build before packing`);
    });
  }
  await writeFile(new URL(`../${target}/.npmignore`, import.meta.url), "");
}

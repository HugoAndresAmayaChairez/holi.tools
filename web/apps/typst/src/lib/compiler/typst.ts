import { $typst } from "@myriaddreamin/typst.ts/dist/esm/index.mjs";

// Provide the WASM module URLs explicitly.
// The upstream `@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one.mjs` assumes
// a monorepo-style package layout that isn't present in this workspace, so we
// wire it ourselves using the separate packages we already depend on.
// NOTE: Cloudflare Pages rejects single files > 25 MiB. The Typst compiler WASM
// is ~28 MiB, so in production we must load it from a separate origin or via a
// Worker route (recommended: same-origin `/wasm/...`).
import typstCompilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";
import typstRendererWasmUrl from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url";
import type { CompilerWorkspaceFile } from "../storage/files";

import { createTypstEngine } from "@holi/engine-typst";
export {
  TypstCompileError,
  normalizeDiagnostics,
  parseDebugDiagnostics,
} from "@holi/engine-typst";
export type {
  DiagnosticSeverity,
  DiagnosticPosition,
  TypstDiagnostic,
  CompileOutcome,
} from "@holi/engine-typst";
let isInitialized = false;
let initOptionsSet = false;

async function ensureInitOptions() {
  if (initOptionsSet) return;
  // Only meaningful in the browser; avoid SSR/Node evaluation issues.
  if (typeof window === "undefined") return;

  // wasm-bindgen `init` (via wasm-pack) now prefers `{ module_or_path }`.
  // Returning the URL directly still works but emits a deprecation warning.
  const wasm = (url: string) => ({ module_or_path: url }) as unknown as any;

  $typst.setCompilerInitOptions({
    getModule: () => wasm(typstCompilerWasmUrl),
  });
  $typst.setRendererInitOptions({
    getModule: () => wasm(typstRendererWasmUrl),
  });

  initOptionsSet = true;
}

export async function initCompiler() {
  if (isInitialized) return;

  await ensureInitOptions();

  // Force lazy initialization early so failures surface immediately.
  await $typst.getCompiler();
  await $typst.getRenderer();

  isInitialized = true;
}

export function isCompilerReady(): boolean {
  return isInitialized;
}

const engine = createTypstEngine($typst);
export async function compileSvgDocument(
  source: string,
  files?: CompilerWorkspaceFile[],
  mainPath?: string
) {
  if (!isInitialized) throw new Error("Compiler not initialized");
  return engine.compileSvgDocument(source, files, mainPath);
}
export async function compilePdf(
  source: string,
  files?: CompilerWorkspaceFile[],
  mainPath?: string
) {
  if (!isInitialized) throw new Error("Compiler not initialized");
  return engine.compilePdf(source, files, mainPath);
}

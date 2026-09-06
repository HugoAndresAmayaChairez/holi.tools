import { parentPort, workerData } from "node:worker_threads";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  createTypstEngine,
  TypstCompileError,
  type CompilerAdapter,
} from "@holi/engine-typst";
import { renderQrSvg } from "@holi/engine-qr";
import type { Job, JobResult } from "./jobs.js";
import { LocalPackageRegistry } from "./packages.js";

export async function render(job: Job): Promise<JobResult> {
  if (job.kind === "qr") {
    const require = createRequire(import.meta.url);
    const wasm = require("@holi/wasm-qr/node");
    let data: Uint8Array;
    let svg: string | undefined;
    if (job.format === "png") {
      data = wasm.render_official_png(
        job.content,
        JSON.stringify(job.config),
        job.size
      );
    } else {
      svg = renderQrSvg(wasm, job.content, job.config);
      data = new TextEncoder().encode(svg);
    }
    if (!job.verify) return { data, diagnostics: [] };

    // Read the artifact back with the same local decoder the web app's
    // readability check uses, so a pretty but unreadable style is reported.
    let decoded: string | undefined;
    try {
      decoded =
        job.format === "png"
          ? wasm.decode_qr_image(data)
          : wasm.verify_qr_svg(svg as string);
    } catch {
      decoded = undefined;
    }
    const verified = decoded === job.content;
    return {
      data,
      verified,
      diagnostics: verified
        ? []
        : [
            {
              severity: "warning",
              message:
                "The local decoder could not read this QR as rendered; the file was still written.",
              hints: [
                "Use a simpler shape or effect, a plain ink color, a higher error correction level or a larger size, then scan the final export.",
              ],
              path: "",
              package: "",
            },
          ],
    };
  }
  const { createTypstCompiler } =
    await import("@myriaddreamin/typst.ts/compiler");
  const { loadFonts, withAccessModel, withPackageRegistry } =
    await import("@myriaddreamin/typst.ts/dist/esm/options.init.mjs");
  const { MemoryAccessModel } =
    await import("@myriaddreamin/typst.ts/dist/esm/fs/memory.mjs");
  const memory = new MemoryAccessModel();
  const registry = new LocalPackageRegistry(memory, job.allowPackages);
  const fontRoot = new URL("../fonts/", import.meta.url);
  const fonts = await Promise.all(
    (await readdir(fontRoot))
      .filter((name) => /\.(otf|ttf)$/.test(name))
      .map((name) => readFile(new URL(name, fontRoot)))
  );
  const require = createRequire(import.meta.url);
  const wasm = await readFile(
    require.resolve("@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm")
  );
  for (let attempt = 0; attempt <= 16; attempt++) {
    // Package misses are cached beyond reset(); use a fresh compiler after downloads.
    const compiler = createTypstCompiler();
    await compiler.init({
      getModule: () => ({ module_or_path: wasm }) as never,
      beforeBuild: [
        loadFonts(fonts, { assets: false }),
        withAccessModel(memory),
        withPackageRegistry(registry),
      ],
    });
    const adapter: CompilerAdapter = {
      resetShadow: () => compiler.resetShadow(),
      addSource: (path, source) => compiler.addSource(path, source),
      mapShadow: (path, data) => compiler.mapShadow(path, data),
      getCompiler: async () => compiler,
      getRenderer: async () => {
        throw new Error("Local document v1 exports PDF only");
      },
    };
    const engine = createTypstEngine(adapter);
    try {
      const outcome = await engine.compilePdfDocument(
        job.source,
        job.files,
        job.mainPath
      );
      if (!outcome.result) throw new TypstCompileError(outcome.diagnostics);
      return { data: outcome.result, diagnostics: outcome.diagnostics };
    } catch (error) {
      if (error instanceof TypstCompileError) {
        if (await registry.fetchMissing()) {
          continue;
        }
        const diagnostics = [...error.diagnostics];
        if (registry.missing.size && !job.allowPackages)
          diagnostics.push({
            severity: "error",
            message:
              "Typst package downloads are disabled. The operator can opt in with --allow-packages.",
            hints: [],
            path: "",
            package: "",
          });
        return { diagnostics };
      }
      throw error;
    }
  }
  throw new Error("Package resolution limit exceeded");
}

if (parentPort) {
  try {
    parentPort!.postMessage(await render(workerData as Job));
  } catch {
    parentPort!.postMessage({
      diagnostics: [
        {
          severity: "error",
          message:
            "Rendering failed; check input, package availability and supported options.",
          hints: [],
          path: "",
          package: "",
        },
      ],
    });
  }
}

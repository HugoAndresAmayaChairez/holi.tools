import { $typst } from '@myriaddreamin/typst.ts/dist/esm/index.mjs';

// Provide the WASM module URLs explicitly.
// The upstream `@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one.mjs` assumes
// a monorepo-style package layout that isn't present in this workspace, so we
// wire it ourselves using the separate packages we already depend on.
// NOTE: Cloudflare Pages rejects single files > 25 MiB. The Typst compiler WASM
// is ~28 MiB, so in production we must load it from a separate origin or via a
// Worker route (recommended: same-origin `/wasm/...`).
import typstCompilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import typstRendererWasmUrl from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import type { CompilerWorkspaceFile } from '../storage/files';

let isInitialized = false;
let initOptionsSet = false;
let compilerQueue: Promise<void> = Promise.resolve();

async function ensureInitOptions() {
    if (initOptionsSet) return;
    // Only meaningful in the browser; avoid SSR/Node evaluation issues.
    if (typeof window === 'undefined') return;

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

    isInitialized = true;
}

function compilerPath(path: string): string {
    return `/${String(path).replaceAll('\\', '/').replace(/^\/+/, '')}`;
}

async function mountWorkspace(
    source: string,
    files: CompilerWorkspaceFile[],
    mainPath: string,
): Promise<string> {
    await $typst.resetShadow();
    for (const file of files) {
        const path = compilerPath(file.path);
        if (file.kind === 'typst') {
            const text = typeof file.content === 'string'
                ? file.content
                : new TextDecoder().decode(file.content);
            await $typst.addSource(path, text);
        } else {
            const bytes = typeof file.content === 'string'
                ? new TextEncoder().encode(file.content)
                : file.content;
            await $typst.mapShadow(path, bytes);
        }
    }
    const mainFilePath = compilerPath(mainPath);
    await $typst.addSource(mainFilePath, source);
    return mainFilePath;
}

function serializeCompiler<T>(work: () => Promise<T>): Promise<T> {
    const result = compilerQueue.then(work, work);
    compilerQueue = result.then(() => undefined, () => undefined);
    return result;
}

export async function compileSvg(
    source: string,
    files?: CompilerWorkspaceFile[],
    mainPath?: string,
): Promise<string> {
    if (!isInitialized) throw new Error("Compiler not initialized");
    return serializeCompiler(async () => {
        if (files && mainPath) {
            const mainFilePath = await mountWorkspace(source, files, mainPath);
            return $typst.svg({ mainFilePath, root: '/' });
        }
        return $typst.svg({ mainContent: source });
    });
}

export async function compilePdf(
    source: string,
    files?: CompilerWorkspaceFile[],
    mainPath?: string,
): Promise<Uint8Array> {
    if (!isInitialized) throw new Error("Compiler not initialized");
    return serializeCompiler(async () => {
        const pdf = files && mainPath
            ? await $typst.pdf({
                mainFilePath: await mountWorkspace(source, files, mainPath),
                root: '/',
            })
            : await $typst.pdf({ mainContent: source });
        if (!pdf) throw new Error("Failed to generate PDF");
        return pdf;
    });
}

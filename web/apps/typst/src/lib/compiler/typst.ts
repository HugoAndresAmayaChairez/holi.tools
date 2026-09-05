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

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/** 1-based line and column inside a workspace file. */
export interface DiagnosticPosition {
    line: number;
    column: number;
}

/** A compiler message normalized for the UI (overlay + editor markers). */
export interface TypstDiagnostic {
    severity: DiagnosticSeverity;
    message: string;
    hints: string[];
    /** Workspace path such as `welcome/main.typ`; empty when unknown. */
    path: string;
    /** Package spec when the message comes from a package, otherwise empty. */
    package: string;
    start?: DiagnosticPosition;
    end?: DiagnosticPosition;
}

export interface CompileOutcome<T> {
    /** `null` when compilation failed. */
    result: T | null;
    diagnostics: TypstDiagnostic[];
}

/** Thrown by export helpers so callers can show the structured diagnostics. */
export class TypstCompileError extends Error {
    diagnostics: TypstDiagnostic[];

    constructor(diagnostics: TypstDiagnostic[], message?: string) {
        super(message || diagnostics[0]?.message || 'Compilation failed');
        this.name = 'TypstCompileError';
        this.diagnostics = diagnostics;
    }
}

// Mirrors `CompileFormatEnum` from typst.ts (vector = 0, pdf = 1).
const FORMAT_VECTOR = 0;
const FORMAT_PDF = 1;

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
    await $typst.getRenderer();

    isInitialized = true;
}

export function isCompilerReady(): boolean {
    return isInitialized;
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

// ── Diagnostics normalization ─────────────────────────────────────────

function parsePosition(value: string): DiagnosticPosition | undefined {
    const match = value.trim().match(/^(\d+):(\d+)$/);
    if (!match) return undefined;
    // typst.ts reports LSP-style zero-based positions; the UI is 1-based.
    return { line: Number(match[1]) + 1, column: Number(match[2]) + 1 };
}

function parseRange(range: unknown): { start?: DiagnosticPosition; end?: DiagnosticPosition } {
    if (typeof range !== 'string' || !range.trim()) return {};
    const [startRaw, endRaw] = range.split('-');
    const start = startRaw ? parsePosition(startRaw) : undefined;
    const end = endRaw ? parsePosition(endRaw) : undefined;
    return { start, end: end ?? start };
}

function normalizeSeverity(value: unknown): DiagnosticSeverity | 'hint' {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('error')) return 'error';
    if (text.includes('warn')) return 'warning';
    if (text.includes('hint') || text.includes('trace')) return 'hint';
    return 'info';
}

function cleanPath(value: unknown): string {
    return String(value ?? '').replaceAll('\\', '/').replace(/^\/+/, '');
}

/**
 * Convert the compiler's `full` diagnostics into UI diagnostics.
 * Hint/trace entries are attached to the preceding message instead of
 * being listed as separate problems.
 */
export function normalizeDiagnostics(raw: unknown): TypstDiagnostic[] {
    if (!Array.isArray(raw)) return [];
    const out: TypstDiagnostic[] = [];
    for (const item of raw) {
        if (item == null) continue;
        if (typeof item === 'string') {
            out.push(...parseDebugDiagnostics(item));
            continue;
        }
        const record = item as Record<string, unknown>;
        const severity = normalizeSeverity(record.severity);
        const message = String(record.message ?? '').trim();
        if (!message) continue;
        if (severity === 'hint' && out.length > 0) {
            out[out.length - 1].hints.push(message);
            continue;
        }
        const { start, end } = parseRange(record.range);
        const hints = Array.isArray(record.hints)
            ? record.hints.filter((h): h is string => typeof h === 'string')
            : [];
        out.push({
            severity: severity === 'hint' ? 'info' : severity,
            message,
            hints,
            path: cleanPath(record.path),
            package: String(record.package ?? ''),
            start,
            end,
        });
    }
    return out;
}

/**
 * Last-resort parser for the Rust debug string the compiler throws when it
 * cannot produce structured diagnostics, e.g.
 * `[SourceDiagnostic { severity: Error, span: Span(1), message: "unknown variable: x", trace: [], hints: [] }]`.
 */
export function parseDebugDiagnostics(text: string): TypstDiagnostic[] {
    const out: TypstDiagnostic[] = [];
    const pattern = /severity:\s*(\w+)[^}]*?message:\s*"((?:[^"\\]|\\.)*)"/g;
    for (const match of text.matchAll(pattern)) {
        const severity = normalizeSeverity(match[1]);
        out.push({
            severity: severity === 'hint' ? 'info' : severity,
            message: match[2].replace(/\\"/g, '"'),
            hints: [],
            path: '',
            package: '',
        });
    }
    if (out.length === 0 && text.trim()) {
        out.push({ severity: 'error', message: text.trim(), hints: [], path: '', package: '' });
    }
    return out;
}

function diagnosticsFromThrown(error: unknown): TypstDiagnostic[] {
    if (error instanceof TypstCompileError) return error.diagnostics;
    if (Array.isArray(error)) return normalizeDiagnostics(error);
    const message = error instanceof Error ? error.message : String(error);
    return parseDebugDiagnostics(message);
}

// ── Compilation ───────────────────────────────────────────────────────

async function compileArtifact(
    source: string,
    files: CompilerWorkspaceFile[] | undefined,
    mainPath: string | undefined,
    format: number,
): Promise<CompileOutcome<Uint8Array>> {
    const compiler = await $typst.getCompiler();
    const mainFilePath = await mountWorkspace(source, files ?? [], mainPath || 'main.typ');
    try {
        const response = (await compiler.compile({
            mainFilePath,
            root: '/',
            format,
            diagnostics: 'full',
        } as never)) as { result?: Uint8Array; diagnostics?: unknown } | undefined;
        const diagnostics = normalizeDiagnostics(response?.diagnostics);
        const result = response?.result instanceof Uint8Array ? response.result : null;
        return { result, diagnostics };
    } catch (error) {
        return { result: null, diagnostics: diagnosticsFromThrown(error) };
    }
}

async function renderSvgArtifact(artifact: Uint8Array): Promise<string> {
    const renderer = await $typst.getRenderer();
    if (!renderer) throw new Error('Typst renderer is not available');
    return renderer.runWithSession(async (session) => {
        renderer.manipulateData({ renderSession: session, action: 'reset', data: artifact });
        return renderer.renderSvg({ renderSession: session } as never);
    });
}

/**
 * Compile the active document and render it to SVG.
 * Never throws for document problems: they come back as `diagnostics`.
 */
export async function compileSvgDocument(
    source: string,
    files?: CompilerWorkspaceFile[],
    mainPath?: string,
): Promise<CompileOutcome<string>> {
    if (!isInitialized) throw new Error('Compiler not initialized');
    return serializeCompiler(async () => {
        const { result, diagnostics } = await compileArtifact(source, files, mainPath, FORMAT_VECTOR);
        if (!result) return { result: null, diagnostics };
        return { result: await renderSvgArtifact(result), diagnostics };
    });
}

/**
 * Compile the active document to PDF bytes.
 * Throws {@link TypstCompileError} with structured diagnostics on failure.
 */
export async function compilePdf(
    source: string,
    files?: CompilerWorkspaceFile[],
    mainPath?: string,
): Promise<Uint8Array> {
    if (!isInitialized) throw new Error('Compiler not initialized');
    return serializeCompiler(async () => {
        const { result, diagnostics } = await compileArtifact(source, files, mainPath, FORMAT_PDF);
        if (!result) throw new TypstCompileError(diagnostics);
        return result;
    });
}

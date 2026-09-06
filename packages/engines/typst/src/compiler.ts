import {
  normalizeDiagnostics,
  diagnosticsFromThrown,
  TypstCompileError,
  type CompileOutcome,
} from "./diagnostics.js";
export interface WorkspaceFile {
  path: string;
  kind: "typst" | "image" | "data";
  content: string | Uint8Array;
}
export interface CompilerAdapter {
  resetShadow(): void | Promise<unknown>;
  addSource(path: string, source: string): void | Promise<unknown>;
  mapShadow(path: string, data: Uint8Array): void | Promise<unknown>;
  getCompiler(): Promise<{
    compile(options: {
      mainFilePath: string;
      root: string;
      format: number;
      diagnostics: "full";
    }): Promise<unknown>;
  }>;
  getRenderer(): Promise<{
    runWithSession<T>(work: (session: any) => Promise<T>): Promise<T>;
    manipulateData(options: any): unknown;
    renderSvg(options: any): Promise<string>;
  }>;
}
export function createTypstEngine(adapter: CompilerAdapter) {
  const FORMAT_VECTOR = 0;
  const FORMAT_PDF = 1;
  let compilerQueue: Promise<void> = Promise.resolve();
  function compilerPath(path: string): string {
    return `/${String(path).replaceAll("\\", "/").replace(/^\/+/, "")}`;
  }

  async function mountWorkspace(
    source: string,
    files: WorkspaceFile[],
    mainPath: string
  ): Promise<string> {
    await adapter.resetShadow();
    for (const file of files) {
      const path = compilerPath(file.path);
      if (file.kind === "typst") {
        const text =
          typeof file.content === "string"
            ? file.content
            : new TextDecoder().decode(file.content);
        await adapter.addSource(path, text);
      } else {
        const bytes =
          typeof file.content === "string"
            ? new TextEncoder().encode(file.content)
            : file.content;
        await adapter.mapShadow(path, bytes);
      }
    }
    const mainFilePath = compilerPath(mainPath);
    await adapter.addSource(mainFilePath, source);
    return mainFilePath;
  }

  function serializeCompiler<T>(work: () => Promise<T>): Promise<T> {
    const result = compilerQueue.then(work, work);
    compilerQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  // ── Compilation ───────────────────────────────────────────────────────

  async function compileArtifact(
    source: string,
    files: WorkspaceFile[] | undefined,
    mainPath: string | undefined,
    format: number
  ): Promise<CompileOutcome<Uint8Array>> {
    const compiler = await adapter.getCompiler();
    const mainFilePath = await mountWorkspace(
      source,
      files ?? [],
      mainPath || "main.typ"
    );
    try {
      const response = (await compiler.compile({
        mainFilePath,
        root: "/",
        format,
        diagnostics: "full",
      } as never)) as
        | { result?: Uint8Array; diagnostics?: unknown }
        | undefined;
      const diagnostics = normalizeDiagnostics(response?.diagnostics);
      const result =
        response?.result instanceof Uint8Array ? response.result : null;
      return { result, diagnostics };
    } catch (error) {
      return { result: null, diagnostics: diagnosticsFromThrown(error) };
    }
  }

  async function renderSvgArtifact(artifact: Uint8Array): Promise<string> {
    const renderer = await adapter.getRenderer();
    if (!renderer) throw new Error("Typst renderer is not available");
    return renderer.runWithSession(async (session) => {
      renderer.manipulateData({
        renderSession: session,
        action: "reset",
        data: artifact,
      });
      return renderer.renderSvg({ renderSession: session } as never);
    });
  }

  /**
   * Compile the active document and render it to SVG.
   * Never throws for document problems: they come back as `diagnostics`.
   */
  async function compileSvgDocument(
    source: string,
    files?: WorkspaceFile[],
    mainPath?: string
  ): Promise<CompileOutcome<string>> {
    return serializeCompiler(async () => {
      const { result, diagnostics } = await compileArtifact(
        source,
        files,
        mainPath,
        FORMAT_VECTOR
      );
      if (!result) return { result: null, diagnostics };
      return { result: await renderSvgArtifact(result), diagnostics };
    });
  }

  /**
   * Compile the active document to PDF bytes.
   * Throws {@link TypstCompileError} with structured diagnostics on failure.
   */
  async function compilePdf(
    source: string,
    files?: WorkspaceFile[],
    mainPath?: string
  ): Promise<Uint8Array> {
    return serializeCompiler(async () => {
      const { result, diagnostics } = await compileArtifact(
        source,
        files,
        mainPath,
        FORMAT_PDF
      );
      if (!result) throw new TypstCompileError(diagnostics);
      return result;
    });
  }

  async function compilePdfDocument(
    source: string,
    files?: WorkspaceFile[],
    mainPath?: string
  ) {
    return serializeCompiler(() =>
      compileArtifact(source, files, mainPath, FORMAT_PDF)
    );
  }
  return { compilePdf, compileSvgDocument, compilePdfDocument };
}

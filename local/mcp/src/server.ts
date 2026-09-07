import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import {
  documentTemplates,
  isWorkspacePath,
  prepareTemplate,
  type TypstDiagnostic,
  type WorkspaceFile,
} from "@holi/engine-typst";
import { localRenderConfig, validateQrContent } from "@holi/engine-qr";
import { LocalError, validateFilename, type OutputFolder } from "./output.js";
import { createWorkQueue, runJob } from "./jobs.js";
import { info, privacy, shadowLog, version } from "./info.js";

const result = (value: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
  structuredContent: value,
  ...(value.ok === false ? { isError: true } : {}),
});
const diagnostic = (error: unknown): TypstDiagnostic & { code: string } => ({
  code: error instanceof LocalError ? error.code : "FAILED",
  severity: "error",
  message:
    error instanceof LocalError
      ? error.message
      : "The local operation failed; check the input and output folder.",
  hints: [],
  path: "",
  package: "",
});
const filename = z.string().min(1).max(120);
const outputSchema = z
  .object({
    v: z.literal(1),
    ok: z.boolean(),
    diagnostics: z.array(
      z.object({
        severity: z.enum(["error", "warning", "info"]),
        message: z.string(),
        hints: z.array(z.string()),
        path: z.string(),
        package: z.string(),
        code: z.string().optional(),
        index: z.number().int().optional(),
        start: z
          .object({
            line: z.number().int().positive(),
            column: z.number().int().positive(),
          })
          .optional(),
        end: z
          .object({
            line: z.number().int().positive(),
            column: z.number().int().positive(),
          })
          .optional(),
      })
    ),
  })
  .passthrough();
const virtualFile = z
  .object({
    path: z.string().max(240),
    content: z.string().max(8_388_608),
    encoding: z.enum(["utf8", "base64"]).default("utf8"),
    kind: z.enum(["typst", "image", "data"]).default("data"),
  })
  .strict();

export function validateDocument(
  source: string,
  files: WorkspaceFile[],
  mainPath: string
): void {
  if (!isWorkspacePath(mainPath))
    throw new LocalError("INVALID_PATH", "Invalid virtual document path");
  const paths = new Set<string>();
  let total = Buffer.byteLength(source);
  if (total > 1_048_576 || files.length > 100)
    throw new LocalError("INPUT_LIMIT", "Document input limit exceeded");
  for (const file of files) {
    if (
      !isWorkspacePath(file.path) ||
      paths.has(file.path) ||
      file.path === mainPath
    )
      throw new LocalError(
        "INVALID_PATH",
        "Invalid or duplicate virtual file path"
      );
    paths.add(file.path);
    const bytes =
      typeof file.content === "string"
        ? Buffer.byteLength(file.content)
        : file.content.byteLength;
    if (file.kind === "typst" && bytes > 1_048_576)
      throw new LocalError("INPUT_LIMIT", "Document input limit exceeded");
    total += bytes;
  }
  if (total > 8_388_608)
    throw new LocalError("INPUT_LIMIT", "Document input limit exceeded");
}

export function createService(output: OutputFolder, allowPackages: boolean) {
  const enqueue = createWorkQueue();
  const guarded = async (work: () => Promise<Record<string, unknown>>) => {
    try {
      return result(await enqueue(work));
    } catch (error) {
      return result({ v: 1, ok: false, diagnostics: [diagnostic(error)] });
    }
  };
  const compile = async (
    source: string,
    files: WorkspaceFile[],
    mainPath: string,
    name: string
  ) => {
    validateDocument(source, files, mainPath);
    await output.check(name, "pdf");
    const rendered = await runJob({
      kind: "document",
      source,
      files,
      mainPath,
      allowPackages,
    });
    if (!rendered.data)
      return { v: 1, ok: false, diagnostics: rendered.diagnostics };
    return {
      v: 1,
      ok: true,
      diagnostics: rendered.diagnostics,
      artifact: await output.write(
        name,
        "pdf",
        rendered.data,
        "application/pdf"
      ),
    };
  };

  return function createServer() {
    const server = new McpServer(
      { name: "@holi/mcp", version },
      {
        instructions:
          "Render locally into the operator-selected output folder. Inspect holi_info and document_templates first. Return artifact paths, never claim the AI client is private. Do not enable network or overwrite files.",
      }
    );
    const readOnly = {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    };
    const writes = {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: allowPackages,
    };
    server.registerTool(
      "holi_info",
      {
        description: "Version, privacy, limits, support and Shadow Log.",
        inputSchema: {},
        outputSchema,
        annotations: readOnly,
      },
      async () =>
        result({
          v: 1,
          ok: true,
          diagnostics: [],
          ...info,
          packageDownloads: allowPackages,
          outputFolder: output.root,
        })
    );
    server.registerTool(
      "document_templates",
      {
        description:
          "List bundled offline Typst templates, source, data schemas and examples.",
        inputSchema: {},
        outputSchema,
        annotations: readOnly,
      },
      async () =>
        result({
          v: 1,
          ok: true,
          diagnostics: [],
          templates: documentTemplates,
        })
    );
    server.registerTool(
      "document_render",
      {
        description:
          "Render JSON data using a bundled Typst template to a new PDF in the configured output folder.",
        inputSchema: z
          .object({
            template: z.string().max(64),
            data: z.record(z.unknown()),
            filename,
          })
          .strict(),
        outputSchema,
        annotations: writes,
      },
      async (args) =>
        guarded(async () => {
          let prepared;
          try {
            prepared = prepareTemplate(args.template, args.data);
          } catch {
            throw new LocalError(
              "INVALID_TEMPLATE_DATA",
              "Unknown template or invalid data; inspect document_templates for the schema"
            );
          }
          return compile(
            prepared.source,
            prepared.files,
            prepared.mainPath,
            args.filename
          );
        })
    );
    server.registerTool(
      "document_compile",
      {
        description:
          "Compile Typst source plus optional virtual files to a new PDF. No host-file reads. Packages require operator opt-in.",
        inputSchema: z
          .object({
            source: z.string().max(1_048_576),
            files: z.array(virtualFile).max(100).default([]),
            mainPath: z.string().max(240).default("main.typ"),
            filename,
          })
          .strict(),
        outputSchema,
        annotations: writes,
      },
      async (args) =>
        guarded(async () => {
          const files = args.files.map((file) => {
            if (
              file.encoding === "base64" &&
              !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
                file.content
              )
            ) {
              throw new LocalError(
                "INVALID_INPUT",
                "Invalid base64 virtual file"
              );
            }
            return {
              ...file,
              content:
                file.encoding === "base64"
                  ? Buffer.from(file.content, "base64")
                  : file.content,
            };
          });
          return compile(args.source, files, args.mainPath, args.filename);
        })
    );
    server.registerTool(
      "qr_batch",
      {
        description:
          "Render 1–100 QR codes using a portable QR style v1. New SVG/PNG files only. Rendered bytes are decoded in memory before writing unless verify is false; still scan final exports before distribution.",
        inputSchema: z
          .object({
            items: z
              .array(
                z
                  .object({ content: z.string().min(1).max(2953), filename })
                  .strict()
              )
              .min(1)
              .max(100),
            style: z.unknown().optional(),
            format: z.enum(["svg", "png"]).default("png"),
            size: z.number().int().min(128).max(4096).default(1024),
            verify: z.boolean().default(true),
          })
          .strict(),
        outputSchema,
        annotations: { ...writes, openWorldHint: false },
      },
      async (args) =>
        guarded(async () => {
          let config;
          try {
            config = localRenderConfig(args.style);
          } catch {
            throw new LocalError(
              "UNSUPPORTED_STYLE",
              "Invalid or unsupported local QR style; see QR style v1"
            );
          }
          const names = new Set<string>();
          for (const item of args.items) {
            validateFilename(item.filename, args.format);
            if (names.has(item.filename.toLowerCase()))
              throw new LocalError(
                "DUPLICATE_OUTPUT",
                "Batch output names must be unique, ignoring case"
              );
            names.add(item.filename.toLowerCase());
          }
          const items = [];
          for (const [index, item] of args.items.entries()) {
            try {
              await output.check(item.filename, args.format);
              try {
                validateQrContent(item.content);
              } catch {
                throw new LocalError(
                  "INVALID_INPUT",
                  "QR content exceeds UTF-8 capacity"
                );
              }
              const rendered = await runJob({
                kind: "qr",
                content: item.content,
                config: config as Record<string, unknown>,
                format: args.format,
                size: args.size,
                verify: args.verify,
              });
              if (!rendered.data) {
                items.push({
                  index,
                  ok: false,
                  diagnostics: rendered.diagnostics,
                });
                continue;
              }
              const artifact = await output.write(
                item.filename,
                args.format,
                rendered.data,
                args.format === "png" ? "image/png" : "image/svg+xml"
              );
              items.push({
                index,
                ok: true,
                ...(args.verify
                  ? { verified: rendered.verified === true }
                  : {}),
                diagnostics: rendered.diagnostics,
                artifact,
              });
            } catch (error) {
              items.push({
                index,
                ok: false,
                diagnostics: [diagnostic(error)],
              });
            }
          }
          return {
            v: 1,
            ok: items.every((item) => item.ok),
            diagnostics: [],
            items,
          };
        })
    );
    for (const [name, value] of [
      ["privacy", privacy],
      ["shadow-log", shadowLog],
    ]) {
      server.registerResource(
        name,
        `holi://${name}`,
        { mimeType: "text/plain" },
        async (uri) => ({ contents: [{ uri: uri.href, text: value }] })
      );
    }
    for (const name of ["holi-documents", "holi-qr-batch"]) {
      server.registerResource(
        name,
        `holi://skills/${name}`,
        { mimeType: "text/markdown" },
        async (uri) => ({
          contents: [
            {
              uri: uri.href,
              text: await readFile(
                new URL(`../skills/${name}/SKILL.md`, import.meta.url),
                "utf8"
              ),
            },
          ],
        })
      );
    }
    return server;
  };
}

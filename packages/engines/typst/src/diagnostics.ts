export type DiagnosticSeverity = "error" | "warning" | "info";

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
    super(message || diagnostics[0]?.message || "Compilation failed");
    this.name = "TypstCompileError";
    this.diagnostics = diagnostics;
  }
}

// ── Diagnostics normalization ─────────────────────────────────────────

function parsePosition(value: string): DiagnosticPosition | undefined {
  const match = value.trim().match(/^(\d+):(\d+)$/);
  if (!match) return undefined;
  // typst.ts reports LSP-style zero-based positions; the UI is 1-based.
  return { line: Number(match[1]) + 1, column: Number(match[2]) + 1 };
}

function parseRange(range: unknown): {
  start?: DiagnosticPosition;
  end?: DiagnosticPosition;
} {
  if (typeof range !== "string" || !range.trim()) return {};
  const [startRaw, endRaw] = range.split("-");
  const start = startRaw ? parsePosition(startRaw) : undefined;
  const end = endRaw ? parsePosition(endRaw) : undefined;
  return { start, end: end ?? start };
}

function normalizeSeverity(value: unknown): DiagnosticSeverity | "hint" {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("error")) return "error";
  if (text.includes("warn")) return "warning";
  if (text.includes("hint") || text.includes("trace")) return "hint";
  return "info";
}

function cleanPath(value: unknown): string {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
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
    if (typeof item === "string") {
      out.push(...parseDebugDiagnostics(item));
      continue;
    }
    const record = item as Record<string, unknown>;
    const severity = normalizeSeverity(record.severity);
    const message = String(record.message ?? "").trim();
    if (!message) continue;
    if (severity === "hint" && out.length > 0) {
      out[out.length - 1].hints.push(message);
      continue;
    }
    const { start, end } = parseRange(record.range);
    const hints = Array.isArray(record.hints)
      ? record.hints.filter((h): h is string => typeof h === "string")
      : [];
    out.push({
      severity: severity === "hint" ? "info" : severity,
      message,
      hints,
      path: cleanPath(record.path),
      package: String(record.package ?? ""),
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
      severity: severity === "hint" ? "info" : severity,
      message: match[2].replace(/\\"/g, '"'),
      hints: [],
      path: "",
      package: "",
    });
  }
  if (out.length === 0 && text.trim()) {
    out.push({
      severity: "error",
      message: text.trim(),
      hints: [],
      path: "",
      package: "",
    });
  }
  return out;
}

export function diagnosticsFromThrown(error: unknown): TypstDiagnostic[] {
  if (error instanceof TypstCompileError) return error.diagnostics;
  if (Array.isArray(error)) return normalizeDiagnostics(error);
  const message = error instanceof Error ? error.message : String(error);
  return parseDebugDiagnostics(message);
}

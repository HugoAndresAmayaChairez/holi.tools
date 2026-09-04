/** Pure utility functions for Holi Typst. */

export function basename(path: string): string {
  const parts = String(path).replaceAll("\\", "/").split("/");
  return parts[parts.length - 1] || path;
}

export function titleFromPath(path: string): string {
  const name = basename(path).replace(/\.typ$/i, "");
  return name || "Untitled";
}

export function defaultNewFileContent(path: string): string {
  return `= ${titleFromPath(path)}\n\n`;
}

export function normalizeTypstPath(path: string): string {
  let p = String(path).trim().replaceAll("\\", "/");
  p = p.replace(/^\/+/, "");
  if (!p.toLowerCase().endsWith(".typ")) p += ".typ";
  return p || "untitled.typ";
}

export function ensureUniquePath(
  path: string,
  existingPaths: string[],
  _keepId?: string
): string {
  const existing = new Set(existingPaths);
  if (!existing.has(path)) return path;
  const base = path.replace(/\.typ$/i, "");
  let i = 2;
  while (existing.has(`${base}-${i}.typ`)) i++;
  return `${base}-${i}.typ`;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .trim()
    .replaceAll(/['"]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function extractTitle(source: string): string {
  const lines = String(source).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^=+\s+(.*)$/);
    if (match && match[1]) return match[1].trim();
    break;
  }
  return "";
}

export function suggestedFilename(source: string, ext: string): string {
  const title = extractTitle(source);
  const slug = title ? slugify(title) : "holi-typst";
  return `${slug}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function countUnescapedDollars(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "$") continue;
    if (i > 0 && text[i - 1] === "\\") continue;
    count++;
  }
  return count;
}

export function hasUnclosedInlineMath(text: string): boolean {
  return countUnescapedDollars(text) % 2 === 1;
}

export function isMobile(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 900px)").matches
  );
}

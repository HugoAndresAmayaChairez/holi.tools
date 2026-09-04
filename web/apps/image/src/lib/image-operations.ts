export type CropRatio = "free" | "1:1" | "4:5" | "3:2" | "16:9";
export type OutputFormat = "original" | "image/jpeg" | "image/png" | "image/webp";

export interface Rect { sx: number; sy: number; sw: number; sh: number }
export interface Size { width: number; height: number }

const RATIOS: Record<Exclude<CropRatio, "free">, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "3:2": 3 / 2,
  "16:9": 16 / 9,
};

export function centeredCrop(width: number, height: number, ratio: CropRatio): Rect {
  if (ratio === "free") return { sx: 0, sy: 0, sw: width, sh: height };
  const target = RATIOS[ratio];
  const current = width / height;
  if (current > target) {
    const sw = Math.round(height * target);
    return { sx: Math.round((width - sw) / 2), sy: 0, sw, sh: height };
  }
  const sh = Math.round(width / target);
  return { sx: 0, sy: Math.round((height - sh) / 2), sw: width, sh };
}

export function fitSize(sourceWidth: number, sourceHeight: number, width: number, height: number, locked: boolean): Size {
  const safeWidth = Math.max(1, Math.round(width || sourceWidth));
  const safeHeight = Math.max(1, Math.round(height || sourceHeight));
  if (!locked) return { width: safeWidth, height: safeHeight };
  const ratio = sourceWidth / sourceHeight;
  return { width: safeWidth, height: Math.max(1, Math.round(safeWidth / ratio)) };
}

export function resolvedMime(format: OutputFormat, original: string): Exclude<OutputFormat, "original"> {
  if (format !== "original") return format;
  if (original === "image/jpeg" || original === "image/png" || original === "image/webp") return original;
  return "image/png";
}

export function exportName(filename: string, mime: string): string {
  const base = filename.replace(/\.[^.]+$/, "") || "image";
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  return `${base}-holi.${extension}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

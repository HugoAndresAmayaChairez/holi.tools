import { describe, expect, it } from "vitest";
import { centeredCrop, exportName, fitSize, formatBytes, resolvedMime } from "./image-operations";

describe("image operations", () => {
  it("centers square crops", () => expect(centeredCrop(1600, 900, "1:1")).toEqual({ sx: 350, sy: 0, sw: 900, sh: 900 }));
  it("preserves aspect ratio when sizing", () => expect(fitSize(1600, 900, 800, 999, true)).toEqual({ width: 800, height: 450 }));
  it("allows unlocked dimensions", () => expect(fitSize(1600, 900, 300, 500, false)).toEqual({ width: 300, height: 500 }));
  it("keeps supported input formats", () => expect(resolvedMime("original", "image/webp")).toBe("image/webp"));
  it("falls back to png", () => expect(resolvedMime("original", "image/gif")).toBe("image/png"));
  it("creates explicit export names", () => expect(exportName("photo.final.jpeg", "image/webp")).toBe("photo.final-holi.webp"));
  it("formats useful byte values", () => expect(formatBytes(1536)).toBe("1.5 KB"));
});

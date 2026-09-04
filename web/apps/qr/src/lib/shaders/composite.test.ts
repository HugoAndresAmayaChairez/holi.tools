import { describe, expect, it } from "vitest";
import { COMPOSITE_SHADER } from "./composite";
import { GOOEY_SHADER } from "./gooey";
import { SHAPE_SHADER } from "./shape";

describe("COMPOSITE_SHADER", () => {
  it("cuts paper by styled ink and finder-eye silhouette instead of raw module squares", () => {
    expect(COMPOSITE_SHADER).toContain(
      "uniform float uFinderCornerCutoutEnabled"
    );
    expect(COMPOSITE_SHADER).toContain("float finderCornerCutout");
    expect(COMPOSITE_SHADER).toContain("float eyeCornerCutout");
    expect(COMPOSITE_SHADER).toContain(
      "float cutoutA = max(inkColor.a, eyeCornerCutout)"
    );
    expect(COMPOSITE_SHADER).toContain("paper.a *= paperBoundsA * (1.0 - cutoutA)");
    expect(COMPOSITE_SHADER).not.toContain("paper.a *= (1.0 - moduleMaskA)");
  });

  it("clips BG and paper to QR-relative layer bounds", () => {
    expect(COMPOSITE_SHADER).toContain("uniform float uArtBoundsScale");
    expect(COMPOSITE_SHADER).toContain("uniform float uPaperBoundsScale");
    expect(COMPOSITE_SHADER).toContain("float layerBoundsAlpha");
    expect(COMPOSITE_SHADER).toContain("float artBoundsA = layerBoundsAlpha(vUv, uArtBoundsScale)");
    expect(COMPOSITE_SHADER).toContain("float paperBoundsA = layerBoundsAlpha(vUv, uPaperBoundsScale)");
  });
});

describe("ink gradient shaders", () => {
  it("wrap conic gradients instead of clamping half the sweep", () => {
    expect(SHAPE_SHADER).toContain("fract((angle + uGradientAngle)");
    expect(GOOEY_SHADER).toContain("fract((angle + uGradientAngle)");
    expect(SHAPE_SHADER).toContain("1.0 - abs(sweep * 2.0 - 1.0)");
    expect(GOOEY_SHADER).toContain("1.0 - abs(sweep * 2.0 - 1.0)");
  });
});

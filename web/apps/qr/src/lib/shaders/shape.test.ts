import { describe, expect, it } from "vitest";
import { SHAPE_SHADER } from "./shape";
import { MASK_SHADER } from "./mask";
import { COMPOSITE_SHADER } from "./composite";

/**
 * WebGL's framebuffer origin is bottom-left, while the QR matrix, the Rust
 * body atlas and the eye mask are all top-down (row 0 = top), like the SVG.
 * Every shader that maps UVs to module space must flip Y once, otherwise the
 * preview (and PNG exports) come out vertically mirrored: the finder pattern
 * lands in the bottom-right corner and asymmetric shapes (Water drops, Heart
 * and Leaf eyes) render upside down compared with the Shapes tiles.
 */
describe("QR module-space orientation", () => {
  it("maps the framebuffer to top-down module coordinates in the shape shader", () => {
    expect(SHAPE_SHADER).toContain("vec2 uvTopDown = vec2(vUv.x, 1.0 - vUv.y);");
    expect(SHAPE_SHADER).toContain("vec2 qrCoord = (uvTopDown * totalSize) - padding;");
    expect(SHAPE_SHADER).not.toContain("(vUv * totalSize)");
  });

  it("keeps the module mask and the finder cutout in the same top-down space", () => {
    expect(MASK_SHADER).toContain("(vec2(vUv.x, 1.0 - vUv.y) * totalSize) - padding");
    expect(MASK_SHADER).not.toContain("(vUv * totalSize)");
    expect(COMPOSITE_SHADER).toContain("float finderCornerCutout(vec2 uv)");
    expect(COMPOSITE_SHADER).toContain("(vec2(uv.x, 1.0 - uv.y) * totalSize) - padding");
  });

  it("samples atlas tiles and the eye mask with module-local top-down coordinates", () => {
    expect(SHAPE_SHADER).toContain("vec2 localUv = fract(qrCoord);");
    expect(SHAPE_SHADER).toContain("vec2 eyeCoord = qrCoord - vec2(origin);");
  });

  it("packs neighbour bits in the order the Rust atlas generator expects", () => {
    // bit0=L, bit1=R, bit2=U, bit3=D, bit4=LU, bit5=RU, bit6=LD, bit7=RD
    expect(SHAPE_SHADER).toContain("float u  = isDarkAt(module + ivec2( 0, -1));");
    expect(SHAPE_SHADER).toContain("float d  = isDarkAt(module + ivec2( 0,  1));");
    expect(SHAPE_SHADER).toMatch(/l\s*\+\s*r\s*\*\s*2\.0\s*\+\s*u\s*\*\s*4\.0\s*\+\s*d\s*\*\s*8\.0/);
  });
});

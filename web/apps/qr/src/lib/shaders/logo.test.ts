import { describe, expect, it } from "vitest";
import { LOGO_SHADER } from "./logo";

describe("LOGO_SHADER", () => {
  it("supports cover, contain, and fill fit modes for logo images", () => {
    expect(LOGO_SHADER).toContain("uniform float uLogoAspect");
    expect(LOGO_SHADER).toContain("uniform int uLogoFitMode");
    expect(LOGO_SHADER).toContain("vec2 fitUv");
    expect(LOGO_SHADER).toContain("paddedUV = fitUv");
  });

  it("auto-contrasts dark logos on dark or disabled containers", () => {
    expect(LOGO_SHADER).not.toContain("uLogoTintColor");
    expect(LOGO_SHADER).not.toContain("uLogoTintEnabled");
    expect(LOGO_SHADER).toContain("float logoLum");
    expect(LOGO_SHADER).toContain("float bgLum");
    expect(LOGO_SHADER).toContain("uBgEnabled < 0.5 || bgLum < 0.35");
    expect(LOGO_SHADER).toContain("texColor.rgb = vec3(1.0)");
  });
});

import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  defaultStyle,
  deepMerge,
  fromBase64Url,
  isQrStyle,
  localRenderConfig,
  renderQrSvg,
  stripImages,
  toBase64Url,
  validateQrContent,
} from "../src/index.js";
const vectors = JSON.parse(
  readFileSync(
    new URL("../../../../spec/vectors/qr-style-v1.json", import.meta.url),
    "utf8"
  )
);

it("preserves default style and Unicode fragment bytes", () => {
  expect(defaultStyle()).toEqual(vectors.default);
  expect(toBase64Url(JSON.stringify(vectors.unicode))).toBe(vectors.fragment);
  expect(JSON.parse(fromBase64Url(vectors.fragment))).toEqual(vectors.unicode);
  expect(isQrStyle(vectors.unicode)).toBe(true);
});
it("accepts saved styles with no optional frame or logo fields", () => {
  const value = {
    ...vectors.default,
    frame: undefined,
    config: {
      bodyShape: "square",
      eyeFrameShape: "square",
      eyeBallShape: "square",
      ecc: "M",
    },
  };
  expect(isQrStyle(value)).toBe(true);
  expect(localRenderConfig(value).ecc).toBe("M");
});
it("rejects versions, invalid fields and prototype pollution", () => {
  for (const patch of vectors.invalidPatches)
    expect(isQrStyle({ ...vectors.default, ...patch })).toBe(false);
  for (const ink of [
    { gradient: null },
    { liquid: [] },
    { color: {} },
    { enabled: "yes" },
  ]) {
    expect(
      isQrStyle({
        ...vectors.default,
        layers: { ...vectors.default.layers, ink },
      })
    ).toBe(false);
  }
  const attack = JSON.parse(
    '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"image":"private"}'
  );
  expect(
    isQrStyle({
      ...vectors.default,
      layers: { ...vectors.default.layers, ...attack },
    })
  ).toBe(false);
  const target = {};
  deepMerge(target, attack);
  expect(target).toEqual({});
  expect(({} as any).polluted).toBeUndefined();
  expect(
    stripImages({ image: "private", ink: { image: "private", color: "#fff" } })
  ).toEqual({ ink: { color: "#fff" } });
});
it("rejects unsupported local styles and SVG injection", () => {
  for (const patch of vectors.unsupportedPatches) {
    const style = defaultStyle();
    deepMerge(style as any, patch);
    expect(() => localRenderConfig(style)).toThrow();
  }
  const style = defaultStyle();
  style.layers.ink.color = '#000"/><script>alert(1)</script>';
  expect(() => localRenderConfig(style)).toThrow();
  style.layers.ink.color = "#000000";
  style.layers.ink.image = "file:///secret";
  expect(() => localRenderConfig(style)).toThrow();
});
it("counts UTF-8 capacity and delegates to the shared WASM render contract", () => {
  expect(() => validateQrContent("ñ".repeat(1477))).toThrow();
  expect(() => validateQrContent("")).toThrow();
  expect(() => validateQrContent("Holi")).not.toThrow();
  expect(
    renderQrSvg(
      { render_official_svg: (text, config) => `${text}:${config}` },
      "Holi",
      { ecc: "H" }
    )
  ).toBe('Holi:{"ecc":"H"}');
});

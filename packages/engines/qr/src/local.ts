import { defaultStyle, deepMerge, isQrStyle } from "./style.js";
import { BODY_SHAPE_MAP, EYE_FRAME_MAP, EYE_BALL_MAP } from "./shapes.js";
import type { RenderConfig } from "./render.js";

/** The supported local subset is explicit; do not silently discard visual effects. */
export function localRenderConfig(value?: unknown): RenderConfig {
  if (value !== undefined && !isQrStyle(value))
    throw new Error("Invalid QR style v1");
  const style = defaultStyle();
  if (value) {
    if (hasImage(value))
      throw new Error("Images are not supported in local QR styles");
    deepMerge(
      style as unknown as Record<string, unknown>,
      value as unknown as Record<string, unknown>
    );
  }
  const { config, layers, frame } = style;
  if (
    frame?.enabled ||
    layers.ink.noise.enabled ||
    ![0, 1, 2].includes(layers.ink.gradient.type) ||
    layers.bg.blendMode !== "normal" ||
    [layers.ink, layers.paper, layers.bg].some((layer) => layer.opacity !== 1)
  ) {
    throw new Error(
      "Local QR v1 does not support text frames, noise, this gradient, blending or color opacity"
    );
  }
  for (const [shape, catalog] of [
    [config.bodyShape, BODY_SHAPE_MAP],
    [config.eyeFrameShape, EYE_FRAME_MAP],
    [config.eyeBallShape, EYE_BALL_MAP],
  ] as const) {
    if (!Object.hasOwn(catalog, shape)) throw new Error("Unsupported QR shape");
  }
  for (const layer of [layers.bg, layers.paper, layers.ink, layers.logo]) {
    if (typeof layer.enabled !== "boolean")
      throw new Error("Invalid QR layer toggle");
  }
  if (
    typeof layers.ink.liquid.enabled !== "boolean" ||
    layers.ink.liquid.blur < 0 ||
    layers.ink.liquid.blur > 3 ||
    Math.abs(layers.ink.liquid.thresh) > 20 ||
    !Number.isFinite(layers.ink.gradient.angle) ||
    [layers.bg.boundsScale, layers.paper.boundsScale].some(
      (size) => !Number.isFinite(size) || size < 1 || size > 3
    )
  ) {
    throw new Error("Invalid QR effect or layer bounds");
  }
  const color = (value: string): string => {
    if (
      typeof value !== "string" ||
      !/^(#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8}|transparent)$/i.test(value)
    )
      throw new Error("Unsupported QR color; use hex or transparent");
    return value;
  };
  return {
    bodyShape: config.bodyShape,
    eyeFrameShape: config.eyeFrameShape,
    eyeBallShape: config.eyeBallShape,
    ecc: config.ecc,
    mask: config.mask,
    fgColor: color(layers.ink.color),
    bgColor: layers.paper.enabled ? color(layers.paper.color) : "transparent",
    baseColor: layers.bg.enabled ? color(layers.bg.color) : "transparent",
    inkEnabled: layers.ink.enabled,
    paperBoundsScale: layers.paper.boundsScale,
    artBoundsScale: layers.bg.boundsScale,
    gradientEnabled: layers.ink.gradient.type !== 0,
    gradientType: layers.ink.gradient.type === 2 ? "radial" : "linear",
    gradientColors: [
      color(layers.ink.color),
      color(layers.ink.gradient.color2),
    ],
    gradientAngle: layers.ink.gradient.angle,
    effectLiquid: layers.ink.liquid.enabled,
    effectBlur: layers.ink.liquid.blur,
    effectCrystalize: layers.ink.liquid.thresh,
  };
}

function hasImage(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, item]) => key === "image" || hasImage(item)
  );
}

export function validateQrContent(content: string): void {
  const size = new TextEncoder().encode(content).byteLength;
  if (!size || size > 2953)
    throw new Error("QR content must contain 1–2953 UTF-8 bytes");
}

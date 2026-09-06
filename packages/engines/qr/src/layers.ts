export type LayerId = "card" | "bg" | "paper" | "ink" | "logo";

export interface InkLiquidEffectConfig {
  enabled: boolean;
  blur: number;
  thresh: number;
}

export interface InkNoiseEffectConfig {
  enabled: boolean;
  amount: number; // 0..1
  scale: number;
}

export interface InkGradientEffectConfig {
  type: number; // 0..4
  color2: string;
  angle: number; // radians
}

export interface InkLayerConfig {
  enabled: boolean;
  color: string;
  opacity: number; // 0..1 (multiplies color/gradient alpha)
  image?: string; // Optional texture fill for ink (masked to modules)
  fit: "cover" | "contain" | "fill";
  rotation: number; // degrees
  scale: number; // 1.0 = 100%
  offsetX: number; // -1..1
  offsetY: number; // -1..1
  liquid: InkLiquidEffectConfig;
  noise: InkNoiseEffectConfig;
  gradient: InkGradientEffectConfig;
}

export interface PaperLayerConfig {
  enabled: boolean;
  color: string;
  opacity: number; // 0..1 (multiplies color alpha)
  boundsScale: number; // 1.10 = ink area + 10%
  image?: string; // Optional texture fill for paper (masked to non-modules)
  fit: "cover" | "contain" | "fill";
  rotation: number; // degrees
  scale: number; // 1.0 = 100%
  offsetX: number; // -1..1
  offsetY: number; // -1..1
}

export interface BgLayerConfig {
  enabled: boolean;
  color: string;
  image?: string;
  opacity: number; // 0..1
  boundsScale: number; // 1.25 = ink area + 25%
  blendMode: string;
  fit: "cover" | "contain" | "fill";
  rotation: number; // degrees
  scale: number; // 1.0 = 100%
  offsetX: number; // -1..1
  offsetY: number; // -1..1
}

export interface CardLayerConfig {
  enabled: boolean;
  image?: string;
  opacity: number; // 0..1
}

export interface LogoLayerConfig {
  enabled: boolean;
  image?: string;
  opacity: number; // 0..1
  fit: "cover" | "contain" | "fill";
}

export interface QRLayersConfig {
  version: 1;
  card: CardLayerConfig;
  bg: BgLayerConfig;
  paper: PaperLayerConfig;
  ink: InkLayerConfig;
  logo: LogoLayerConfig;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function createDefaultLayersConfig(): QRLayersConfig {
  return {
    version: 1,
    card: { enabled: true, image: undefined, opacity: 1 },
    bg: {
      enabled: true,
      color: "#ffffff",
      image: undefined,
      opacity: 1,
      boundsScale: 1.25,
      blendMode: "normal",
      fit: "cover",
      rotation: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    paper: {
      enabled: true,
      color: "#ffffff",
      opacity: 1,
      boundsScale: 1.1,
      image: undefined,
      fit: "cover",
      rotation: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
    ink: {
      enabled: true,
      color: "#000000",
      opacity: 1,
      image: undefined,
      fit: "cover",
      rotation: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      liquid: { enabled: false, blur: 0.35, thresh: 6 },
      noise: { enabled: false, amount: 0.3, scale: 100 },
      gradient: { type: 0, color2: "#000000", angle: 0 },
    },
    logo: { enabled: true, image: undefined, opacity: 1, fit: "contain" },
  };
}

export function stripHexAlpha(hex: string): string {
  if (typeof hex !== "string") return "#000000";
  if (hex === "transparent") return "transparent";
  // #RRGGBBAA
  if (hex.startsWith("#") && hex.length === 9) return hex.slice(0, 7);
  // RRGGBBAA
  if (!hex.startsWith("#") && hex.length === 8) return `#${hex.slice(0, 6)}`;
  return hex;
}

/**
 * Ensures `config.layers` exists and is minimally populated.
 * The returned object is the canonical layered config for the editor.
 */
export function ensureLayersConfig(config: any): QRLayersConfig {
  if (!config) return createDefaultLayersConfig();

  if (!config.layers || typeof config.layers !== "object") {
    config.layers = createDefaultLayersConfig();
  }

  const layers: QRLayersConfig = config.layers as QRLayersConfig;
  if (layers.version !== 1) layers.version = 1;

  // Fill missing layer objects with defaults (do not overwrite existing values).
  const defaults = createDefaultLayersConfig();
  layers.card ??= defaults.card;
  // Migration: older configs used `layers.art` for the background image layer.
  const legacyArt = (layers as any).art as undefined | BgLayerConfig;
  if (!layers.bg && legacyArt) {
    layers.bg = {
      enabled: legacyArt.enabled ?? true,
      color: (legacyArt as any).color ?? defaults.bg.color,
      image: legacyArt.image,
      opacity: legacyArt.opacity ?? defaults.bg.opacity,
      boundsScale: (legacyArt as any).boundsScale ?? defaults.bg.boundsScale,
      blendMode: legacyArt.blendMode ?? defaults.bg.blendMode,
      fit: legacyArt.fit ?? defaults.bg.fit,
      rotation: legacyArt.rotation ?? defaults.bg.rotation,
      scale: legacyArt.scale ?? defaults.bg.scale,
      offsetX: legacyArt.offsetX ?? defaults.bg.offsetX,
      offsetY: legacyArt.offsetY ?? defaults.bg.offsetY,
    };
  }
  layers.bg ??= defaults.bg;
  layers.paper ??= defaults.paper;
  layers.ink ??= defaults.ink;
  layers.logo ??= defaults.logo;

  // Fill missing per-layer fields (without overwriting existing values).
  layers.bg.fit ??= defaults.bg.fit;
  layers.bg.boundsScale ??= defaults.bg.boundsScale;
  layers.bg.blendMode ??= defaults.bg.blendMode;
  layers.bg.rotation ??= defaults.bg.rotation;
  layers.bg.scale ??= defaults.bg.scale;
  layers.bg.offsetX ??= defaults.bg.offsetX;
  layers.bg.offsetY ??= defaults.bg.offsetY;

  layers.paper.fit ??= defaults.paper.fit;
  layers.paper.boundsScale ??= defaults.paper.boundsScale;
  layers.paper.rotation ??= defaults.paper.rotation;
  layers.paper.scale ??= defaults.paper.scale;
  layers.paper.offsetX ??= defaults.paper.offsetX;
  layers.paper.offsetY ??= defaults.paper.offsetY;

  layers.ink.fit ??= defaults.ink.fit;
  layers.ink.rotation ??= defaults.ink.rotation;
  layers.ink.scale ??= defaults.ink.scale;
  layers.ink.offsetX ??= defaults.ink.offsetX;
  layers.ink.offsetY ??= defaults.ink.offsetY;

  layers.card.opacity = clamp01(layers.card.opacity ?? defaults.card.opacity);
  layers.bg.opacity = clamp01(layers.bg.opacity ?? defaults.bg.opacity);
  layers.bg.boundsScale = Math.max(
    1,
    layers.bg.boundsScale ?? defaults.bg.boundsScale
  );
  layers.bg.scale = Math.max(0.01, layers.bg.scale ?? defaults.bg.scale);
  layers.paper.opacity = clamp01(
    layers.paper.opacity ?? defaults.paper.opacity
  );
  layers.paper.boundsScale = Math.max(
    1,
    layers.paper.boundsScale ?? defaults.paper.boundsScale
  );
  layers.paper.scale = Math.max(
    0.01,
    layers.paper.scale ?? defaults.paper.scale
  );
  layers.ink.opacity = clamp01(layers.ink.opacity ?? defaults.ink.opacity);
  layers.ink.scale = Math.max(0.01, layers.ink.scale ?? defaults.ink.scale);
  layers.logo.opacity = clamp01(layers.logo.opacity ?? defaults.logo.opacity);
  layers.logo.fit ??= defaults.logo.fit;

  return layers;
}

export interface RenderConfig {
  // Colors
  fgColor?: string;
  // Paper / complement color (fills negative space; transparent where ink exists)
  bgColor?: string; // If transparent, use 'transparent' or null
  // BG/base layer color (under everything)
  baseColor?: string; // rgba(...) or 'transparent'

  // Background image (under paper/complement). Minimal SVG fallback support.
  artImage?: string;
  artBoundsScale?: number;
  artOpacity?: number;
  artFit?: "cover" | "contain" | "fill";
  artRotation?: number; // degrees
  artScale?: number; // 1.0 = 100%
  artOffsetX?: number; // -1..1
  artOffsetY?: number; // -1..1
  // Used to blend ink against the underlay (matches WebGL composite)
  artBlendMode?: string;

  // Paper / ink texture fills (masked per layer)
  paperImage?: string;
  paperBoundsScale?: number;
  paperOpacity?: number; // 0..1 (applies to paperImage only)
  paperFit?: "cover" | "contain" | "fill";
  paperRotation?: number; // degrees
  paperScale?: number; // 1.0 = 100%
  paperOffsetX?: number; // -1..1
  paperOffsetY?: number; // -1..1
  inkImage?: string;
  inkOpacity?: number; // 0..1 (applies to inkImage only)
  inkFit?: "cover" | "contain" | "fill";
  inkRotation?: number; // degrees
  inkScale?: number; // 1.0 = 100%
  inkOffsetX?: number; // -1..1
  inkOffsetY?: number; // -1..1

  // Gradient
  gradientEnabled?: boolean;
  gradientType?: "linear" | "radial";
  gradientColors?: string[]; // [start, end]
  gradientAngle?: number;

  // Shapes
  bodyShape?: "square" | "dots" | "rounded" | string;
  eyeFrameShape?: string;
  eyeBallShape?: string;

  // Logo
  logo?: string; // Data URL or URL
  logoSize?: number; // 0.1 to 0.5 (percent of QR size)
  logoOpacity?: number; // 0..1
  logoFit?: "cover" | "contain" | "fill";

  // Effects (Expert)
  effectLiquid?: boolean; // New independent flag
  effectBlur?: number; // Default 0.35
  effectCrystalize?: number; // Default -6 (Threshold)
  // Layer toggles (optional)
  inkEnabled?: boolean;

  // Data Config
  ecc?: "L" | "M" | "Q" | "H";
  mask?: number; // 0-7 or -1/undefined
}

export interface QrWasm {
  render_official_svg(content: string, config: string): string;
}
export function renderQrSvg(
  wasm: QrWasm,
  content: string,
  config: RenderConfig = {}
): string {
  return wasm.render_official_svg(content, JSON.stringify(config));
}

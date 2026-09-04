/**
 * Core Types for QR Generator
 * Centralized type definitions for effects, configs, and events
 */

// =============================================================================
// EFFECT CONFIGURATIONS
// =============================================================================

export interface GradientConfig {
  type: number; // 0=None, 1=Linear, 2=Radial, 3=Conic, 4=Diamond
  color2: string; // Hex color for second gradient stop
  angle: number; // Radians for linear/conic rotation
}

export interface NoiseConfig {
  enabled: boolean;
  amount: number; // 0-100 (UI) or 0-1 (internal)
  scale: number; // Grain size/frequency
}

export interface LiquidConfig {
  enabled: boolean;
  blur: number; // 0.05 - 1.4
  threshold: number; // 1 - 18
}

// =============================================================================
// RENDER CONFIGURATION
// =============================================================================

export interface RenderConfig {
  blur: number;
  threshold: number;
  color: [number, number, number, number];
  /**
   * Explicit ink enable (independent of `color.a`).
   * When false, the renderer should skip drawing ink and show only underlay layers.
   */
  inkEnabled?: boolean;
  gradientColor2: [number, number, number, number];
  gradientType: number;
  gradientAngle: number;
  noiseAmount: number;
  noiseScale: number;
  backgroundColor: [number, number, number];
  /**
   * Background base color (BG layer), rendered under everything (including ink).
   * Use alpha=0 for transparent background.
   */
  bgBaseColor?: [number, number, number, number];
  /**
   * Optional paper (complement) texture fill. Masked to non-modules.
   */
  paperImage?: string;
  paperBoundsScale?: number; // 1.10 = ink area + 10%
  paperFit?: "cover" | "contain" | "fill";
  paperRotation?: number; // degrees
  paperScale?: number; // 1.0 = 100%
  paperOffsetX?: number; // -1..1
  paperOffsetY?: number; // -1..1
  /**
   * Optional ink texture fill. Masked to modules (via ink alpha).
   */
  inkImage?: string;
  inkFit?: "cover" | "contain" | "fill";
  inkRotation?: number; // degrees
  inkScale?: number; // 1.0 = 100%
  inkOffsetX?: number; // -1..1
  inkOffsetY?: number; // -1..1
  /**
   * Paper/complement color (layer 3). Use alpha=0 for transparent complement.
   */
  qrBgColor?: [number, number, number, number];
  qrSize: number;
  bodyShape: number;
  eyeFrameShape: number;
  eyeBallShape: number;
  /**
   * Shape names (Rust/WASM source-of-truth).
   * Used by the WebGL preview to fetch shape mask textures from WASM.
   */
  bodyShapeKey?: string;
  eyeFrameShapeKey?: string;
  eyeBallShapeKey?: string;
  logo?: string;
  logoSize?: number;
  logoOpacity?: number;
  logoBgEnabled?: boolean;
  logoBgColor?: [number, number, number];
  logoBgShape?: "square" | "circle" | "rounded";
  logoPadding?: number;
  logoCornerRadius?: number;
  logoRotation?: number;
  logoScale?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  logoFit?: "cover" | "contain" | "fill";
  // Art / Background
  artImage?: string;
  artBoundsScale?: number; // 1.25 = ink area + 25%
  artOpacity?: number; // 0.0 - 1.0
  artBlendMode?: string; // 'normal', 'multiply', 'overlay', 'screen', etc.
  artFit?: "cover" | "contain" | "fill";
  artRotation?: number; // degrees
  artScale?: number; // 1.0 = 100%
  artOffsetX?: number; // -1 to 1
  artOffsetY?: number; // -1 to 1
}

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

export interface GradientChangeEvent {
  type: number;
  color2: string;
  angle: number;
}

export interface NoiseChangeEvent {
  enabled: boolean;
  amount: number;
  scale: number;
}

export interface EffectChangeEvent {
  liquid: boolean;
  blur: number;
  thresh: number;
}

export interface FilterTweakEvent {
  blur: number;
  thresh: number;
}

export interface ColorChangeEvent {
  type: "fg" | "bg";
  value: string;
}

// =============================================================================
// SHAPE TYPES
// =============================================================================

export type BodyShape =
  | "square"
  | "rounded"
  | "dots"
  | "tiny-dots"
  | "diamond"
  | "star"
  | "clover"
  | "capsule"
  | "chain"
  | "pixel"
  | "water";

export type EyeFrameShape =
  | "square"
  | "rounded"
  | "circle"
  | "diamond"
  | "cushion"
  | "leaf"
  | "clover-frame"
  | "bevel"
  | "orbit"
  | "flux"
  | "shield"
  | "double"
  | "heavy-rounded";

export type EyeBallShape =
  | "square"
  | "rounded"
  | "circle"
  | "diamond"
  | "star"
  | "heart"
  | "hexagon"
  | "dots-grid"
  | "bars-h"
  | "bars-v";

export type EccLevel = "L" | "M" | "Q" | "H";

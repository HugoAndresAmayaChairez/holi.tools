/**
 * Shape Constants and Mappers
 * Centralized shape ID mappings for WebGL renderer
 */

// =============================================================================
// BODY SHAPE MAPPINGS
// =============================================================================

/**
 * Body shape name to WebGL shader ID
 * IDs: 0=Square, 1=Dots, 2=Rounded, 3=Diamond, 4=Star, 5=Clover, 6=TinyDots, 7=Capsule, 8=Chain, 9=Pixel, 10=Water
 */
export const BODY_SHAPE_MAP: Record<string, number> = {
  square: 0,
  dots: 1,
  rounded: 2,
  diamond: 3,
  star: 4,
  clover: 5,
  "tiny-dots": 6,
  capsule: 7,
  chain: 8,
  pixel: 9,
  water: 10,

  // Legacy/aliases
  "mini-square": 0,
  blob: 1,
  classy: 0,
  "classy-rounded": 2,
  fluid: 1,
  mosaic: 9,
  "vertical-lines": 9,
  "horizontal-lines": 9,
};

// =============================================================================
// EYE FRAME SHAPE MAPPINGS
// =============================================================================

/**
 * Eye frame shape name to WebGL shader ID
 * IDs: 0=Square, 1=Rounded, 2=Circle, 3=Diamond, 4=Cushion, 5=Leaf, 9=CloverFrame, 10=Bevel, 11=Orbit, 12=Flux
 */
export const EYE_FRAME_MAP: Record<string, number> = {
  square: 0,
  rounded: 1,
  circle: 2,
  diamond: 3,
  cushion: 4,
  leaf: 5,
  "clover-frame": 9,
  bevel: 10,
  orbit: 11,
  flux: 12,

  // Legacy/aliases
  pointed: 5,
  dotted: 2,
  fancy: 4,
  "dots-square": 0,
  shield: 1,
  double: 1,
  "heavy-rounded": 1,
};

// =============================================================================
// EYE BALL SHAPE MAPPINGS
// =============================================================================

/**
 * Eye ball shape name to WebGL shader ID
 * IDs: 0=Square, 1=Rounded, 2=Circle, 3=Diamond, 4=Star, 5=Heart, 6=Hexagon, 7=DotsGrid, 8=BarsH, 9=BarsV
 */
export const EYE_BALL_MAP: Record<string, number> = {
  square: 0,
  rounded: 1,
  circle: 2,
  diamond: 3,
  star: 4,
  heart: 5,
  hexagon: 6,
  "dots-grid": 7,
  "bars-h": 8,
  "bars-v": 9,

  // Legacy/aliases
  clover: 4,
  cushion: 1,
  octagon: 6,
  leaf: 3,
  shield: 3,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get WebGL shader ID for body shape
 * @param shape - Shape name string
 * @returns Shader ID (defaults to 0 for unknown shapes)
 */
export function getBodyShapeId(shape: string): number {
  return BODY_SHAPE_MAP[shape] ?? 0;
}

/**
 * Get WebGL shader ID for eye frame shape
 * @param shape - Shape name string
 * @returns Shader ID (defaults to 0 for unknown shapes)
 */
export function getEyeFrameId(shape: string): number {
  return EYE_FRAME_MAP[shape] ?? 0;
}

/**
 * Get WebGL shader ID for eye ball shape
 * @param shape - Shape name string
 * @returns Shader ID (defaults to 0 for unknown shapes)
 */
export function getEyeBallId(shape: string): number {
  return EYE_BALL_MAP[shape] ?? 0;
}

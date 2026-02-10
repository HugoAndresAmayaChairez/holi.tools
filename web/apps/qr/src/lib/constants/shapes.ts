/**
 * Shape Constants and Mappers
 * Centralized shape ID mappings for WebGL renderer
 */

// =============================================================================
// BODY SHAPE MAPPINGS
// =============================================================================

/**
 * Body shape name to WebGL shader ID
 * IDs: 0=Square, 1=Dots, 2=Rounded, 3=Diamond, 4=Star, 5=Clover, 6=TinyDots, 7=Bars
 */
export const BODY_SHAPE_MAP: Record<string, number> = {
    'square': 0,
    'rounded': 2,
    'dots': 1,
    'diamond': 3,
    'star': 4,
    'clover': 5,
    'tiny-dots': 6,
    'mini-square': 0,
    'blob': 1,
    'leaf': 5,
    'vertical-lines': 7,
    'horizontal-lines': 7,
    'arrow': 3,
    'heart': 4,
    // Note: These are intentional aliases for backwards compatibility
    'classy': 0,
    'classy-rounded': 2,
    'mosaic': 0,
    'fluid': 1,
};

// =============================================================================
// EYE FRAME SHAPE MAPPINGS
// =============================================================================

/**
 * Eye frame shape name to WebGL shader ID
 * IDs: 0=Square, 1=Circle, 2=Rounded, 3=Leaf, 4=Shield, 5=Diamond
 */
export const EYE_FRAME_MAP: Record<string, number> = {
    'square': 0,
    'circle': 1,
    'rounded': 2,
    'leaf': 3,
    'shield': 4,
    'diamond': 5,
    'pointed': 3,
    'dotted': 1,
    'cushion': 2,
    'double': 0,
    'fancy': 3,
    'heavy-rounded': 2,
};

// =============================================================================
// EYE BALL SHAPE MAPPINGS
// =============================================================================

/**
 * Eye ball shape name to WebGL shader ID
 * IDs: 0=Square, 1=Circle, 2=Rounded, 3=Hexagon, 4=Star/Heart, 5=Diamond/Clover
 */
export const EYE_BALL_MAP: Record<string, number> = {
    'square': 0,
    'circle': 1,
    'rounded': 2,
    'star': 4,
    'diamond': 5,
    'heart': 4,
    'hexagon': 3,
    'bars-h': 0,
    'bars-v': 0,
    'clover': 5,
    'flower': 4,
    'cushion': 2,
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

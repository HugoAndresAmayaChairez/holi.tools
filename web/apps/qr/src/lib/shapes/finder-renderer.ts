/**
 * Finder Pattern Renderer
 * Shared module for rendering QR code finder patterns (eye frames and eye balls)
 * Used by both qr-engine.ts and wasm-svg-renderer.ts
 */

export type EyeFrameShape =
  | "square"
  | "rounded"
  | "circle"
  | "leaf"
  | "pointed"
  | "dotted"
  | "shield"
  | "cushion"
  | "double"
  | "fancy"
  | "dots-square"
  | "heavy-rounded"
  | "clover-frame"
  | "bevel"
  | "orbit"
  | "flux";

export type EyeBallShape =
  | "square"
  | "rounded"
  | "circle"
  | "star"
  | "diamond"
  | "heart"
  | "hexagon"
  | "bars-h"
  | "bars-v"
  | "dots-grid"
  | "flower"
  | "clover"
  | "cushion"
  | "octagon"
  | "leaf"
  | "shield";

export interface FinderConfig {
  eyeFrameShape: EyeFrameShape | string;
  eyeBallShape: EyeBallShape | string;
}

export interface FinderPaths {
  framePath: string;
  ballPath: string;
}

/**
 * Generate SVG path for eye frame (outer 7x7 pattern)
 * @param fx - X coordinate of finder pattern origin
 * @param fy - Y coordinate of finder pattern origin
 * @param shape - Eye frame shape type
 */
export function getEyeFramePath(
  fx: number,
  fy: number,
  shape: EyeFrameShape | string
): string {
  switch (shape) {
    case "circle":
      return `M${fx + 3.5},${fy} A3.5,3.5 0 1,1 ${fx + 3.5},${fy + 7} A3.5,3.5 0 1,1 ${fx + 3.5},${fy} M${fx + 3.5},${fy + 1} A2.5,2.5 0 1,0 ${fx + 3.5},${fy + 6} A2.5,2.5 0 1,0 ${fx + 3.5},${fy + 1} Z`;

    case "rounded":
      return (
        `M${fx + 1.65},${fy} h3.7 a1.65,1.65 0 0 1 1.65,1.65 v3.7 a1.65,1.65 0 0 1 -1.65,1.65 h-3.7 a1.65,1.65 0 0 1 -1.65,-1.65 v-3.7 a1.65,1.65 0 0 1 1.65,-1.65 z` +
        `M${fx + 2.05},${fy + 1} h2.9 a1.05,1.05 0 0 1 1.05,1.05 v2.9 a1.05,1.05 0 0 1 -1.05,1.05 h-2.9 a1.05,1.05 0 0 1 -1.05,-1.05 v-2.9 a1.05,1.05 0 0 1 1.05,-1.05 z`
      );

    case "leaf":
      return (
        `M${fx},${fy} h4 a3,3 0 0 1 3,3 v4 h-4 a3,3 0 0 1 -3,-3 v-4 z` +
        `M${fx + 1},${fy + 1} v3 a2,2 0 0 0 2,2 h3 v-3 a2,2 0 0 0 -2,-2 h-3 z`
      );

    case "cushion":
      return (
        `M${fx + 3.5},${fy} Q${fx + 7},${fy} ${fx + 7},${fy + 3.5} Q${fx + 7},${fy + 7} ${fx + 3.5},${fy + 7} Q${fx},${fy + 7} ${fx},${fy + 3.5} Q${fx},${fy} ${fx + 3.5},${fy} Z` +
        `M${fx + 3.5},${fy + 1} Q${fx + 1},${fy + 1} ${fx + 1},${fy + 3.5} Q${fx + 1},${fy + 6} ${fx + 3.5},${fy + 6} Q${fx + 6},${fy + 6} ${fx + 6},${fy + 3.5} Q${fx + 6},${fy + 1} ${fx + 3.5},${fy + 1} Z`
      );

    case "double":
      return (
        `M${fx},${fy} h7 v7 h-7 z M${fx + 0.8},${fy + 0.8} v5.4 h5.4 v-5.4 h-5.4 z` +
        `M${fx + 1.6},${fy + 1.6} h3.8 v3.8 h-3.8 z M${fx + 2.4},${fy + 2.4} v2.2 h2.2 v-2.2 h-2.2 z`
      );

    case "fancy":
      return (
        `M${fx + 1},${fy} h5 l1,1 v5 l-1,1 h-5 l-1,-1 v-5 l1,-1 z` +
        `M${fx + 1.5},${fy + 1} l-0.5,0.5 v4 l0.5,0.5 h4 l0.5,-0.5 v-4 l-0.5,-0.5 h-4 z`
      );

    case "dots-square":
      return `M${fx},${fy} h7 v7 h-7 z M${fx + 1},${fy + 1} v5 h5 v-5 h-5 z`;

    case "heavy-rounded":
      return (
        `M${fx + 2.35},${fy} h2.3 a2.35,2.35 0 0 1 2.35,2.35 v2.3 a2.35,2.35 0 0 1 -2.35,2.35 h-2.3 a2.35,2.35 0 0 1 -2.35,-2.35 v-2.3 a2.35,2.35 0 0 1 2.35,-2.35 z` +
        `M${fx + 2.55},${fy + 1} h1.9 a1.55,1.55 0 0 1 1.55,1.55 v1.9 a1.55,1.55 0 0 1 -1.55,1.55 h-1.9 a1.55,1.55 0 0 1 -1.55,-1.55 v-1.9 a1.55,1.55 0 0 1 1.55,-1.55 z`
      );

    case "clover-frame":
      return (
        `M${fx + 3.5},${fy} C${fx + 5.5},${fy} ${fx + 7},${fy + 1.5} ${fx + 7},${fy + 3.5} C${fx + 7},${fy + 5.5} ${fx + 5.5},${fy + 7} ${fx + 3.5},${fy + 7} C${fx + 1.5},${fy + 7} ${fx},${fy + 5.5} ${fx},${fy + 3.5} C${fx},${fy + 1.5} ${fx + 1.5},${fy} ${fx + 3.5},${fy} Z` +
        `M${fx + 3.5},${fy + 1} C${fx + 1.5},${fy + 1} ${fx + 1},${fy + 1.5} ${fx + 1},${fy + 3.5} C${fx + 1},${fy + 5.5} ${fx + 1.5},${fy + 6} ${fx + 3.5},${fy + 6} C${fx + 5.5},${fy + 6} ${fx + 6},${fy + 5.5} ${fx + 6},${fy + 3.5} C${fx + 6},${fy + 1.5} ${fx + 5.5},${fy + 1} ${fx + 3.5},${fy + 1} Z`
      );

    case "bevel":
      return (
        `M${fx + 0.8},${fy} L${fx + 6.2},${fy} L${fx + 7},${fy + 0.8} L${fx + 7},${fy + 6.2} L${fx + 6.2},${fy + 7} L${fx + 0.8},${fy + 7} L${fx},${fy + 6.2} L${fx},${fy + 0.8} Z` +
        ` M${fx + 1.7},${fy + 1} L${fx + 5.3},${fy + 1} L${fx + 6},${fy + 1.7} L${fx + 6},${fy + 5.3} L${fx + 5.3},${fy + 6} L${fx + 1.7},${fy + 6} L${fx + 1},${fy + 5.3} L${fx + 1},${fy + 1.7} Z`
      );

    case "orbit":
      return (
        `M${fx + 2.73},${fy + 0.18} h1.54 a2.55,2.55 0 0 1 2.55,2.55 v1.54 a2.55,2.55 0 0 1 -2.55,2.55 h-1.54 a2.55,2.55 0 0 1 -2.55,-2.55 v-1.54 a2.55,2.55 0 0 1 2.55,-2.55 z ` +
        `M${fx + 2.8},${fy + 1.35} h1.4 a1.45,1.45 0 0 1 1.45,1.45 v1.4 a1.45,1.45 0 0 1 -1.45,1.45 h-1.4 a1.45,1.45 0 0 1 -1.45,-1.45 v-1.4 a1.45,1.45 0 0 1 1.45,-1.45 z`
      );

    case "flux":
      return (
        `M${fx + 1.2},${fy} L${fx + 5.8},${fy} L${fx + 7},${fy + 1.2} L${fx + 7},${fy + 5.8} L${fx + 5.8},${fy + 7} L${fx + 1.2},${fy + 7} L${fx},${fy + 5.8} L${fx},${fy + 1.2} Z ` +
        `M${fx + 2.2},${fy + 1.4} L${fx + 4.8},${fy + 1.4} L${fx + 5.6},${fy + 2.2} L${fx + 5.6},${fy + 4.8} L${fx + 4.8},${fy + 5.6} L${fx + 2.2},${fy + 5.6} L${fx + 1.4},${fy + 4.8} L${fx + 1.4},${fy + 2.2} Z`
      );

    case "square":
    default:
      return (
        `M${fx},${fy} h7 v7 h-7 z` + `M${fx + 1},${fy + 1} v5 h5 v-5 h-5 z`
      );
  }
}

/**
 * Generate SVG path for eye ball (inner 3x3 pattern)
 * @param bx - X coordinate of ball origin (finder origin + 2)
 * @param by - Y coordinate of ball origin (finder origin + 2)
 * @param shape - Eye ball shape type
 */
export function getEyeBallPath(
  bx: number,
  by: number,
  shape: EyeBallShape | string
): string {
  switch (shape) {
    case "circle":
      return `M${bx + 1.5},${by} a1.5,1.5 0 1,0 0,3 a1.5,1.5 0 1,0 0,-3 z`;

    case "diamond":
      return `M${bx + 1.5},${by} L${bx + 3},${by + 1.5} L${bx + 1.5},${by + 3} L${bx},${by + 1.5} Z`;

    case "rounded":
      return `M${bx + 0.9},${by + 0.15} h1.2 a0.75,0.75 0 0 1 0.75,0.75 v1.2 a0.75,0.75 0 0 1 -0.75,0.75 h-1.2 a0.75,0.75 0 0 1 -0.75,-0.75 v-1.2 a0.75,0.75 0 0 1 0.75,-0.75 z`;

    case "star":
      return `M${bx + 1.5},${by + 0.02} L${bx + 1.92},${by + 0.96} L${bx + 2.96},${by + 1} L${bx + 2.14},${by + 1.66} L${bx + 2.48},${by + 2.95} L${bx + 1.5},${by + 2.28} L${bx + 0.52},${by + 2.95} L${bx + 0.86},${by + 1.66} L${bx + 0.04},${by + 1} L${bx + 1.08},${by + 0.96} Z`;

    case "heart":
      return (
        `M${bx + 1.5},${by + 0.82} ` +
        `C${bx + 1.5},${by + 0.34} ${bx + 0.82},${by + 0.1} ${bx + 0.42},${by + 0.5} ` +
        `C${bx + 0.02},${by + 0.94} ${bx + 0.24},${by + 2} ${bx + 1.5},${by + 2.96} ` +
        `C${bx + 2.76},${by + 2} ${bx + 2.98},${by + 0.94} ${bx + 2.58},${by + 0.5} ` +
        `C${bx + 2.18},${by + 0.1} ${bx + 1.5},${by + 0.34} ${bx + 1.5},${by + 0.82} Z`
      );

    case "hexagon":
      return `M${bx + 0.5},${by + 0.2} L${bx + 2.5},${by + 0.2} L${bx + 3},${by + 1.5} L${bx + 2.5},${by + 2.8} L${bx + 0.5},${by + 2.8} L${bx},${by + 1.5} Z`;

    case "octagon":
      return `M${bx + 0.9},${by + 0.1} L${bx + 2.1},${by + 0.1} L${bx + 2.9},${by + 0.9} L${bx + 2.9},${by + 2.1} L${bx + 2.1},${by + 2.9} L${bx + 0.9},${by + 2.9} L${bx + 0.1},${by + 2.1} L${bx + 0.1},${by + 0.9} Z`;

    case "bars-h":
      return `M${bx},${by + 0.05} h3 v0.9 h-3 z M${bx},${by + 1.05} h3 v0.9 h-3 z M${bx},${by + 2.05} h3 v0.9 h-3 z`;

    case "bars-v":
      return `M${bx + 0.05},${by} v3 h0.9 v-3 z M${bx + 1.05},${by} v3 h0.9 v-3 z M${bx + 2.05},${by} v3 h0.9 v-3 z`;

    case "dots-grid": {
      let path = "";
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cx = bx + 0.5 + col;
          const cy = by + 0.5 + row;
          const r =
            row === 1 && col === 1
              ? 0.58
              : row === 1 || col === 1
                ? 0.36
                : 0.26;
          path += `M${cx + r},${cy} a${r},${r} 0 1,1 -${2 * r},0 a${r},${r} 0 1,1 ${2 * r},0 `;
        }
      }
      return path;
    }

    case "flower":
      return (
        `M${bx + 1.5},${by + 0.2} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ` +
        `M${bx + 2.8},${by + 1.5} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ` +
        `M${bx + 1.5},${by + 2.8} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ` +
        `M${bx + 0.2},${by + 1.5} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ` +
        `M${bx + 1.5},${by + 1.5} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 `
      );

    case "clover":
      return (
        `M${bx + 1.5},${by + 1.5} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ` +
        `M${bx + 1.5},${by + 0.6} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ` +
        `M${bx + 2.4},${by + 1.5} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ` +
        `M${bx + 1.5},${by + 2.4} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ` +
        `M${bx + 0.6},${by + 1.5} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 `
      );

    case "cushion":
      return `M${bx + 1.5},${by + 0.1} Q${bx + 2.9},${by + 0.1} ${bx + 2.9},${by + 1.5} Q${bx + 2.9},${by + 2.9} ${bx + 1.5},${by + 2.9} Q${bx + 0.1},${by + 2.9} ${bx + 0.1},${by + 1.5} Q${bx + 0.1},${by + 0.1} ${bx + 1.5},${by + 0.1} Z`;

    case "leaf":
      return `M${bx},${by} h1.5 a1.5,1.5 0 0 1 1.5,1.5 v1.5 h-1.5 a1.5,1.5 0 0 1 -1.5,-1.5 z`;

    case "shield":
      return `M${bx},${by} h3 v1.5 a1.5,1.5 0 0 1 -1.5,1.5 a1.5,1.5 0 0 1 -1.5,-1.5 z`;

    case "square":
    default:
      return `M${bx},${by} h3 v3 h-3 z`;
  }
}

/**
 * Generate complete finder pattern path (frame + ball)
 * @param ox - X origin of the finder pattern (before margin)
 * @param oy - Y origin of the finder pattern (before margin)
 * @param margin - QR margin to add to coordinates
 * @param config - Shape configuration
 */
export function drawFinderPattern(
  ox: number,
  oy: number,
  margin: number,
  config: FinderConfig
): string {
  const { framePath, ballPath } = drawFinderPatternParts(
    ox,
    oy,
    margin,
    config
  );
  return framePath + ballPath;
}

export function drawFinderPatternParts(
  ox: number,
  oy: number,
  margin: number,
  config: FinderConfig
): FinderPaths {
  const fx = ox + margin;
  const fy = oy + margin;

  return {
    framePath: getEyeFramePath(fx, fy, config.eyeFrameShape),
    ballPath: getEyeBallPath(fx + 2, fy + 2, config.eyeBallShape),
  };
}

/**
 * Generate all three finder patterns for a QR code
 * @param size - QR matrix size (e.g., 21, 25, 29...)
 * @param margin - QR margin
 * @param config - Shape configuration
 */
export function drawAllFinderPatterns(
  size: number,
  margin: number,
  config: FinderConfig
): string {
  return (
    drawFinderPattern(0, 0, margin, config) +
    drawFinderPattern(size - 7, 0, margin, config) +
    drawFinderPattern(0, size - 7, margin, config)
  );
}

export function drawAllFinderPatternsParts(
  size: number,
  margin: number,
  config: FinderConfig
): FinderPaths {
  const positions: Array<[number, number]> = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];

  let framePath = "";
  let ballPath = "";

  for (const [ox, oy] of positions) {
    const parts = drawFinderPatternParts(ox, oy, margin, config);
    framePath += parts.framePath;
    ballPath += parts.ballPath;
  }

  return { framePath, ballPath };
}

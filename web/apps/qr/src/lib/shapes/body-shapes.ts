/**
 * Body Shape Renderer
 * Shared module for rendering QR code data module shapes
 * Used by qr-engine.ts for SVG generation
 */

export type BodyShape =
    | 'square' | 'rounded' | 'dots' | 'diamond' | 'star' | 'classy' | 'classy-rounded'
    | 'mosaic' | 'fluid' | 'vertical-lines' | 'horizontal-lines'
    | 'arrow' | 'arrow-left' | 'heart' | 'hexagon' | 'octagon' | 'cross' | 'plus'
    | 'blob' | 'clover' | 'mini-square' | 'tiny-dots' | 'hash' | 'leaf';

/**
 * Generate SVG path for a single data module
 * @param px - X position (with margin applied)
 * @param py - Y position (with margin applied)
 * @param shape - Body shape type
 * @returns SVG path string for the module
 */
export function getBodyModulePath(px: number, py: number, shape: BodyShape | string): string {
    switch (shape) {
        case 'rounded':
            return `M${px + 0.1},${py}h0.8q0.1,0 0.1,0.1v0.8q0,0.1 -0.1,0.1h-0.8q-0.1,0 -0.1,-0.1v-0.8q0,-0.1 0.1,-0.1z`;

        case 'dots':
            return `M${px + 0.5},${py + 0.5} m-0.45,0 a0.45,0.45 0 1,0 0.9,0 a0.45,0.45 0 1,0 -0.9,0`;

        case 'diamond':
            return `M${px + 0.5},${py} L${px + 1},${py + 0.5} L${px + 0.5},${py + 1} L${px},${py + 0.5} Z`;

        case 'star':
            return `M${px + 0.5},${py} L${px + 0.65},${py + 0.35} L${px + 1},${py + 0.5} L${px + 0.65},${py + 0.65} L${px + 0.5},${py + 1} L${px + 0.35},${py + 0.65} L${px},${py + 0.5} L${px + 0.35},${py + 0.35} Z`;

        case 'classy':
            return `M${px},${py} h1 v0.6 q0,0.4 -0.4,0.4 h-0.6 Z`;

        case 'classy-rounded':
            return `M${px + 0.1},${py}h0.8q0.1,0 0.1,0.1v0.8q0,0.1 -0.1,0.1h-0.8q-0.1,0 -0.1,-0.1v-0.8q0,-0.1 0.1,-0.1z`;

        case 'arrow':
            return `M${px},${py + 0.2} h0.5 v-0.2 l0.5,0.5 l-0.5,0.5 v-0.2 h-0.5 Z`;

        case 'arrow-left':
            return `M${px + 1},${py + 0.2} h-0.5 v-0.2 l-0.5,0.5 l0.5,0.5 v-0.2 h0.5 Z`;

        case 'heart':
            return `M${px + 0.5},${py + 0.9} L${px + 0.1},${py + 0.5} Q${px},${py + 0.2} ${px + 0.25},${py + 0.15} Q${px + 0.5},${py + 0.2} ${px + 0.5},${py + 0.4} Q${px + 0.5},${py + 0.2} ${px + 0.75},${py + 0.15} Q${px + 1},${py + 0.2} ${px + 0.9},${py + 0.5} Z`;

        case 'hexagon':
            return `M${px + 0.2},${py} L${px + 0.8},${py} L${px + 1},${py + 0.5} L${px + 0.8},${py + 1} L${px + 0.2},${py + 1} L${px},${py + 0.5} Z`;

        case 'octagon':
            return `M${px + 0.3},${py} L${px + 0.7},${py} L${px + 1},${py + 0.3} L${px + 1},${py + 0.7} L${px + 0.7},${py + 1} L${px + 0.3},${py + 1} L${px},${py + 0.7} L${px},${py + 0.3} Z`;

        case 'cross':
            return `M${px + 0.3},${py} L${px + 0.7},${py} L${px + 0.7},${py + 0.3} L${px + 1},${py + 0.3} L${px + 1},${py + 0.7} L${px + 0.7},${py + 0.7} L${px + 0.7},${py + 1} L${px + 0.3},${py + 1} L${px + 0.3},${py + 0.7} L${px},${py + 0.7} L${px},${py + 0.3} L${px + 0.3},${py + 0.3} Z`;

        case 'plus':
            return `M${px + 0.25},${py} L${px + 0.75},${py} L${px + 0.75},${py + 0.25} L${px + 1},${py + 0.25} L${px + 1},${py + 0.75} L${px + 0.75},${py + 0.75} L${px + 0.75},${py + 1} L${px + 0.25},${py + 1} L${px + 0.25},${py + 0.75} L${px},${py + 0.75} L${px},${py + 0.25} L${px + 0.25},${py + 0.25} Z`;

        case 'blob':
            return `M${px + 0.5},${py + 0.05} Q${px + 0.95},${py + 0.05} ${px + 0.95},${py + 0.5} Q${px + 0.95},${py + 0.95} ${px + 0.5},${py + 0.95} Q${px + 0.05},${py + 0.95} ${px + 0.05},${py + 0.5} Q${px + 0.05},${py + 0.05} ${px + 0.5},${py + 0.05} Z`;

        case 'clover':
            return `M${px + 0.5},${py + 0.25} m-0.30,0 a0.30,0.30 0 1,0 0.60,0 a0.30,0.30 0 1,0 -0.60,0 ` +
                `M${px + 0.75},${py + 0.5} m-0.30,0 a0.30,0.30 0 1,0 0.60,0 a0.30,0.30 0 1,0 -0.60,0 ` +
                `M${px + 0.5},${py + 0.75} m-0.30,0 a0.30,0.30 0 1,0 0.60,0 a0.30,0.30 0 1,0 -0.60,0 ` +
                `M${px + 0.25},${py + 0.5} m-0.30,0 a0.30,0.30 0 1,0 0.60,0 a0.30,0.30 0 1,0 -0.60,0 `;

        case 'mini-square':
            return `M${px + 0.2},${py + 0.2}h0.6v0.6h-0.6z`;

        case 'tiny-dots':
            return `M${px + 0.5},${py + 0.5} m-0.3,0 a0.3,0.3 0 1,0 0.6,0 a0.3,0.3 0 1,0 -0.6,0`;

        case 'hash': {
            const x1 = px + 0.05, x2 = px + 0.3, x3 = px + 0.7, x4 = px + 0.95;
            const y1 = py + 0.05, y2 = py + 0.3, y3 = py + 0.7, y4 = py + 0.95;
            return `M${x2},${y1} L${x3},${y1} L${x3},${y2} L${x4},${y2} L${x4},${y3} L${x3},${y3} L${x3},${y4} L${x2},${y4} L${x2},${y3} L${x1},${y3} L${x1},${y2} L${x2},${y2} Z`;
        }

        case 'leaf':
            return `M${px + 0.5},${py + 0.05} Q${px + 0.95},${py + 0.05} ${px + 0.95},${py + 0.5} Q${px + 0.95},${py + 0.95} ${px + 0.5},${py + 0.95} Q${px + 0.05},${py + 0.95} ${px + 0.05},${py + 0.5} Q${px + 0.05},${py + 0.05} ${px + 0.5},${py + 0.05} Z`;

        case 'square':
        default:
            return `M${px},${py}h1v1h-1z`;
    }
}

/**
 * Generate SVG path for all data modules in a QR matrix
 * @param size - Matrix size
 * @param margin - QR margin
 * @param data - Matrix data (Uint8Array where 1 = dark module)
 * @param shape - Body shape type
 * @param isFinderZone - Function to check if coordinate is in finder zone
 * @returns Combined SVG path for all data modules
 */
export function generateBodyPath(
    size: number,
    margin: number,
    data: Uint8Array,
    shape: BodyShape | string,
    isFinderZone: (x: number, y: number) => boolean
): string {
    let path = '';

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (isFinderZone(x, y)) continue;
            if (data[y * size + x] !== 1) continue;

            const px = x + margin;
            const py = y + margin;
            path += getBodyModulePath(px, py, shape);
        }
    }

    return path;
}

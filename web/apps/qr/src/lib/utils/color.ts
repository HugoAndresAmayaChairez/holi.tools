/**
 * Color Utilities
 * Centralized color manipulation functions for QR generator
 */

/**
 * Convert hex color to normalized RGB tuple (0-1 range)
 * @param hex - Hex color string (e.g., '#ff0000' or 'ff0000')
 * @returns RGB tuple with values 0-1
 */
export function hexToRgb(hex: string): [number, number, number] {
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r / 255, g / 255, b / 255];
}

/**
 * Parse background color for WebGL renderer
 * @param bgColor - Hex color or 'transparent'
 * @returns RGB tuple (0-1 range) or undefined for transparent
 */
export function parseBgColor(bgColor: string | undefined): [number, number, number] | undefined {
    if (!bgColor || bgColor === 'transparent') return undefined;
    return hexToRgb(bgColor);
}

/**
 * Calculate relative luminance of a hex color
 * Formula: 0.299R + 0.587G + 0.114B (ITU-R BT.601)
 * @param hex - Hex color string
 * @returns Luminance value 0-1 (0 = dark, 1 = light)
 */
export function getLuminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex);
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Determine if a color is considered "light"
 * @param hex - Hex color string
 * @returns true if luminance > 0.5
 */
export function isLightColor(hex: string): boolean {
    return getLuminance(hex) > 0.5;
}

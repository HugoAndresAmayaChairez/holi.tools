/**
 * QR Engine - WASM-powered QR code generation
 * Advanced shape customization with 3-layer system
 */

// Body shape types (module patterns for data area)
type BodyShape = 'square' | 'rounded' | 'dots' | 'diamond' | 'star' | 'classy' |
    'classy-rounded' | 'mosaic' | 'fluid' | 'vertical-lines' | 'horizontal-lines';

// Eye frame shape types (outer frame of finder patterns)
type EyeFrameShape = 'square' | 'rounded' | 'circle' | 'leaf' | 'pointed' | 'dotted' | 'shield';

// Eye ball shape types (center of finder patterns)
type EyeBallShape = 'square' | 'rounded' | 'circle' | 'star' | 'diamond' | 'heart' | 'hexagon';

interface QRConfig {
    fg: string;
    bg: string;
    bodyShape: BodyShape;
    eyeFrameShape: EyeFrameShape;
    eyeBallShape: EyeBallShape;
    ecc: 'L' | 'M' | 'Q' | 'H';
    mask?: number; // QR mask pattern (0-7), undefined for auto
    logoColor?: 'original' | 'white' | 'black' | string;
    logoX?: number;  // Logo position (0-1)
    logoY?: number;

    // Effects
    effectLiquid?: boolean;
    effectBlur?: number;
    effectCrystalize?: number;

    // Gradients
    gradientEnabled?: boolean;
    gradientType?: number | 'none' | 'linear' | 'radial' | 'conic' | 'diamond';
    gradientColors?: [string, string];
    gradientAngle?: number;

    // Noise
    noiseEnabled?: boolean;
    noiseAmount?: number;
    noiseScale?: number;

    // Logo
    logo?: string;
    logoSize?: number;
    logoBgEnabled?: boolean;
    logoBgColor?: string;
    logoBgShape?: 'square' | 'circle' | 'rounded';
    logoPadding?: number;
    logoCornerRadius?: number;
    logoRotation?: number;
    logoScale?: number;
    logoOffsetX?: number;
    logoOffsetY?: number;
    artEnabled?: boolean;
    artImage?: string;
    artOpacity?: number;      // 0.0 - 1.0
    artBlendMode?: string;    // 'normal', 'multiply', 'overlay', 'screen', 'darken'
    artFit?: 'cover' | 'contain' | 'fill';
    artRotation?: number;     // degrees
    artScale?: number;        // 1.0 = 100%
    artOffsetX?: number;      // -1 to 1
    artOffsetY?: number;      // -1 to 1
}

interface QRState {
    text: string;
    config: QRConfig;
    recent: QRHistoryItem[];
    collections: string[];
}

interface QRHistoryItem {
    id: string;
    text: string;
    name: string;
    config: QRConfig;
}

import { getHoliQrSvg, isHoliQrSvgReady } from './wasm-qr-svg-loader';

// Default config
const defaultConfig: QRConfig = {
    fg: '#000000',
    bg: 'transparent',
    bodyShape: 'square',
    eyeFrameShape: 'square',
    eyeBallShape: 'square',
    ecc: 'M',
    logoColor: 'original',
    logoBgEnabled: false,
    logoBgColor: '#ffffff',
    logoBgShape: 'circle',
    logoPadding: 0,
    logoCornerRadius: 10,
    logoRotation: 0,
    logoScale: 1.0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    logoSize: 0.2,
    logoX: 0.5,
    logoY: 0.5
};

// Application state
export const state: QRState = {
    text: '',
    config: { ...defaultConfig },
    recent: [],
    collections: []
};

// Export types for use in components
export type { BodyShape, EyeFrameShape, EyeBallShape, QRConfig };

/**
 * Initialize WASM module
 */
export async function initWasm(): Promise<boolean> {
    try {
        await getHoliQrSvg();
        return true;
    } catch (e) {
        console.error('WASM Failed', e);
        return false;
    }
}

/**
 * Get QR matrix from wasm-qr-svg.
 * Returns flat byte array [size, ...data], where data is 0 (light) or 255 (dark).
 */
export async function getQrMatrix(text: string, ecc: QRConfig['ecc'] = 'M', mask?: number): Promise<Uint8Array> {
    if (!text) return new Uint8Array();

    let wasm: Awaited<ReturnType<typeof getHoliQrSvg>> | null = null;
    try {
        wasm = await getHoliQrSvg();
    } catch {
        wasm = null;
    }
    if (!wasm) return new Uint8Array();

    const maskValue = typeof mask === 'number' ? mask : -1;
    return wasm.get_qr_matrix(text, ecc || 'M', maskValue);
}

/**
 * Check if WASM is ready
 */
export function isWasmReady(): boolean {
    return isHoliQrSvgReady();
}

/**
 * Decode QR code from ImageData using jsQR
 * @param imageData - Canvas ImageData containing QR code
 * @returns Decoded text or null if not found
 */
export async function decodeQRImage(imageData: ImageData): Promise<string | null> {
    try {
        // Dynamically import jsQR to decode
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        return code?.data ?? null;
    } catch (error) {
        console.error('QR decode error:', error);
        return null;
    }
}

/**
 * Export QR as PNG with specified DPI
 * @param svgString - The SVG string to convert
 * @param dpi - DPI setting (72, 150, 300, 600)
 * @returns Promise<Blob> - PNG blob
 */
/**
 * Export QR as PNG with specified size
 * @param svgString - The SVG string to convert
 * @param size - Target size in pixels (e.g., 1000)
 * @returns Promise<Blob> - PNG blob
 */
export async function exportPNG(svgString: string, size: number = 1000): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');

            // Set canvas size directly to target size
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // High-quality rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw SVG to canvas scaling it to fit
            ctx.drawImage(img, 0, 0, size, size);

            // Convert to PNG blob
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create PNG blob'));
                }
            }, 'image/png');
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG'));
        };

        img.src = url;
    });
}

/**
 * Export QR as PDF
 * Download file utility
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

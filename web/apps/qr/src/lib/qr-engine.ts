/**
 * QR Engine - WASM-powered QR code generation
 * Advanced shape customization with a layered render stack
 */

// Body shape types (module patterns for data area)
type BodyShape =
    | 'square' | 'rounded' | 'dots' | 'tiny-dots' | 'diamond' | 'star' | 'clover'
    | 'capsule' | 'chain' | 'pixel' | 'water'
    // Legacy/aliases
    | 'classy' | 'classy-rounded' | 'mosaic' | 'fluid' | 'vertical-lines' | 'horizontal-lines';

// Eye frame shape types (outer frame of finder patterns)
type EyeFrameShape =
    | 'square' | 'rounded' | 'circle' | 'diamond' | 'cushion' | 'leaf' | 'clover-frame' | 'bevel' | 'orbit' | 'flux'
    // Legacy/aliases
    | 'pointed' | 'dotted' | 'fancy' | 'dots-square' | 'shield' | 'double' | 'heavy-rounded';

// Eye ball shape types (center of finder patterns)
type EyeBallShape =
    | 'square' | 'rounded' | 'circle' | 'diamond' | 'star' | 'heart' | 'hexagon' | 'dots-grid' | 'bars-h' | 'bars-v'
    // Legacy/aliases
    | 'clover' | 'cushion' | 'octagon' | 'leaf' | 'shield';

import type { QRLayersConfig } from './core/layers';

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
    logoFit?: 'cover' | 'contain' | 'fill';
    artEnabled?: boolean;
    artImage?: string;
    artOpacity?: number;      // 0.0 - 1.0
    artBlendMode?: string;    // 'normal', 'multiply', 'overlay', 'screen', 'darken'
    artFit?: 'cover' | 'contain' | 'fill';
    artBoundsScale?: number;
    paperBoundsScale?: number;
    artRotation?: number;     // degrees
    artScale?: number;        // 1.0 = 100%
    artOffsetX?: number;      // -1 to 1
    artOffsetY?: number;      // -1 to 1

    // Card PNG (base layer).
    // In the WebGL renderer this is composited as the bottom-most layer (included in PNG exports).
    // In SVG fallback mode it's applied via CSS on the container.
    frameImage?: string;

    /**
     * Layered configuration (canonical). Legacy fields above are kept for backwards compatibility.
     * New UI and render paths should prefer `layers`.
     */
    layers?: QRLayersConfig;
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

import { getHoliWasmQr, isHoliWasmQrReady } from './wasm-qr-loader';
import { getLuminance } from './utils/color';

// Default config
const defaultConfig: QRConfig = {
    fg: '#000000',
    bg: '#ffffff',
    bodyShape: 'square',
    eyeFrameShape: 'square',
    eyeBallShape: 'square',
    ecc: 'M',
    logoColor: 'original',
    logoBgEnabled: true,
    logoBgColor: '#ffffff',
    logoBgShape: 'rounded',
    logoPadding: 0,
    logoCornerRadius: 10,
    logoRotation: 0,
    logoScale: 1.0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    logoFit: 'contain',
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
        await getHoliWasmQr();
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

    let wasm: Awaited<ReturnType<typeof getHoliWasmQr>> | null = null;
    try {
        wasm = await getHoliWasmQr();
    } catch {
        wasm = null;
    }
    if (!wasm) return new Uint8Array();

    const maskValue = typeof mask === 'number' ? mask : -1;
    const getMatrixFn = (wasm as any).get_qr_matrix as undefined | ((t: string, e: string, m: number) => Uint8Array);
    if (typeof getMatrixFn !== 'function') {
        console.warn('wasm-qr: get_qr_matrix() missing (pkg likely out of date). Run: pnpm build:wasm');
        return new Uint8Array();
    }
    return getMatrixFn(text, ecc || 'M', maskValue);
}

/**
 * Check if WASM is ready
 */
export function isWasmReady(): boolean {
    return isHoliWasmQrReady();
}

/**
 * Decode QR code from ImageData using jsQR
 * @param imageData - Canvas ImageData containing QR code
 * @returns Decoded text or null if not found
 */
export async function decodeQRImage(imageData: ImageData): Promise<string | null> {
    try {
        // Try native BarcodeDetector first
        if ('BarcodeDetector' in window) {
            try {
                const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await barcodeDetector.detect(imageData);
                if (barcodes.length > 0) {
                    return barcodes[0].rawValue;
                }
            } catch (e) {
                console.warn('BarcodeDetector failed', e);
            }
        }
        // Fallback to WASM decoder
        return await decodeQRImageViaWasm(imageData);
    } catch (error) {
        console.error('QR decode error:', error);
        return null;
    }
}

/**
 * Decode QR code using the Rust/WASM decoder (rxing, ZXing-like).
 *
 * Accepts ImageData, converts to a PNG in-memory, then decodes bytes in WASM.
 * This is slower than jsQR but more robust and matches the “official” pipeline.
 */
export async function decodeQRImageViaWasm(imageData: ImageData): Promise<string | null> {
    try {
        const wasm = await getHoliWasmQr();
        const decodeFn = (wasm as any).decode_qr_image as undefined | ((bytes: Uint8Array) => string);
        if (typeof decodeFn !== 'function') {
            console.warn('wasm-qr: decode_qr_image() missing (pkg likely out of date). Run: pnpm build:wasm');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Add a solid background for transparent QR snapshots (helps decoder in edge cases).
        const fgHex = state.config.fg || '#000000';
        const isLightFg = getLuminance(fgHex) > 0.5;
        ctx.fillStyle = isLightFg ? '#000000' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
        if (!blob) return null;

        const bytes = new Uint8Array(await blob.arrayBuffer());
        return decodeFn(bytes);
    } catch (error) {
        console.warn('WASM QR decode failed:', error);
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

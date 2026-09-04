/**
 * Official SVG Renderer
 * Delegates SVG composition (paths + defs + masks + filters) to @holi/wasm-qr.
 */

import { getHoliWasmQr } from './wasm-qr-loader';

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
    artFit?: 'cover' | 'contain' | 'fill';
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
    paperFit?: 'cover' | 'contain' | 'fill';
    paperRotation?: number; // degrees
    paperScale?: number; // 1.0 = 100%
    paperOffsetX?: number; // -1..1
    paperOffsetY?: number; // -1..1
    inkImage?: string;
    inkOpacity?: number; // 0..1 (applies to inkImage only)
    inkFit?: 'cover' | 'contain' | 'fill';
    inkRotation?: number; // degrees
    inkScale?: number; // 1.0 = 100%
    inkOffsetX?: number; // -1..1
    inkOffsetY?: number; // -1..1

    // Gradient
    gradientEnabled?: boolean;
    gradientType?: 'linear' | 'radial';
    gradientColors?: string[]; // [start, end]
    gradientAngle?: number;

    // Shapes
    bodyShape?: 'square' | 'dots' | 'rounded' | string;
    eyeFrameShape?: string;
    eyeBallShape?: string;

    // Logo
    logo?: string; // Data URL or URL
    logoSize?: number; // 0.1 to 0.5 (percent of QR size)
    logoOpacity?: number; // 0..1
    logoFit?: 'cover' | 'contain' | 'fill';

    // Effects (Expert)
    effectLiquid?: boolean; // New independent flag
    effectBlur?: number; // Default 0.35
    effectCrystalize?: number; // Default -6 (Threshold)
    // Layer toggles (optional)
    inkEnabled?: boolean;

    // Data Config
    ecc?: 'L' | 'M' | 'Q' | 'H';
    mask?: number; // 0-7 or -1/undefined
}

export class WasmSvgRenderer {
    private containerId: string;
    private initialized = false;

    constructor(containerId: string) {
        this.containerId = containerId;
    }

    async init() {
        if (this.initialized) return;
        try {
            await getHoliWasmQr(); // Load WASM module (dynamic, singleton)
            console.log("📐 WASM SVG Renderer Initialized (official SVG via Rust)");
            this.initialized = true;
        } catch (e) {
            console.error("❌ SVG Renderer Failed:", e);
        }
    }

    /**
     * Live-updates filter params without regenerating the SVG (60fps capable)
     * Only works if a QR with liquid effect is already rendered.
     */
    updateFilterParams(blur: number, thresh: number) {
        const blurEl = document.getElementById('qr-blur-el');
        const matrixEl = document.getElementById('qr-matrix-el');

        if (blurEl) {
            blurEl.setAttribute('stdDeviation', blur.toString());
        }
        if (matrixEl) {
            // Matrix: 1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 [contrast] -[thresh]
            matrixEl.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -${thresh}`);
        }
    }

    /**
     * Generates SVG via Rust and injects into DOM
     * @param text Content to encode
     * @param config Optional customization
     */
    /**
     * Generates SVG via Rust and injects into DOM
     * @param text Content to encode
     * @param config Optional customization
     */
    async render(text: string, config?: RenderConfig) {
        if (!this.initialized) await this.init();

        try {
            const svgString = await this.getSVG(text, config);

            // 4. Inject into DOM
            const container = document.getElementById(this.containerId);
            if (container) {
                container.innerHTML = svgString;
            }
        } catch (e) {
            console.error("Error rendering SVG:", e);
        }
    }

    /**
     * Generate SVG string without injecting into DOM
     * Useful for Export/Copy functionality in WebGL-only mode
     */
    async getSVG(content: string, config?: RenderConfig): Promise<string> {
        if (!this.initialized) await this.init();

        const wasm = await getHoliWasmQr();
        const renderFn = (wasm as any).render_official_svg as undefined | ((t: string, cfgJson: string) => string);
        if (typeof renderFn !== 'function') {
            console.warn('wasm-qr: render_official_svg() missing (pkg likely out of date). Run: pnpm build:wasm');
            return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
        }

        // Keep config canonical in Rust: pass the whole config and let WASM compose layers/defs/masks/paths.
        const cfgJson = JSON.stringify(config ?? {});
        return renderFn(content, cfgJson);
    }
}

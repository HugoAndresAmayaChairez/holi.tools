/**
 * Official SVG Renderer
 * Delegates SVG composition (paths + defs + masks + filters) to @holi/wasm-qr.
 */

import { getHoliWasmQr } from './wasm-qr-loader';

import {renderQrSvg, type RenderConfig} from '@holi/engine-qr/render';
export type {RenderConfig} from '@holi/engine-qr/render';
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
        return renderQrSvg(wasm, content, config);
    }
}

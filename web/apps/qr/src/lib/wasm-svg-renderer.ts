/**
 * Ultra-Light Rust SVG Renderer
 * Uses wasm-qr-svg (27KB) to generate optimized Path data
 */

import { getHoliQrSvg } from './wasm-qr-svg-loader';
import { drawAllFinderPatterns } from './shapes/finder-renderer';

export interface RenderConfig {
    // Colors
    fgColor?: string;
    bgColor?: string; // If transparent, use 'transparent' or null

    // Gradient
    gradientEnabled?: boolean;
    gradientType?: 'linear' | 'radial';
    gradientColors?: string[]; // [start, end]
    gradientAngle?: number;

    // Shapes
    bodyShape?: 'square' | 'dots' | 'rounded' | string;
    eyeFrameShape?: string; // Not implemented in Rust yet
    eyeBallShape?: string; // Not implemented in Rust yet

    // Logo
    logo?: string; // Data URL or URL
    logoSize?: number; // 0.1 to 0.5 (percent of QR size)

    // Effects (Expert)
    effectLiquid?: boolean; // New independent flag
    effectBlur?: number; // Default 0.35
    effectCrystalize?: number; // Default -6 (Threshold)

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
            await getHoliQrSvg(); // Load WASM module (dynamic, singleton)
            console.log("📐 WASM SVG Renderer Initialized (<10KB)");
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

        const wasm = await getHoliQrSvg();

        // 1. Generate Base Path from WASM
        // Options: 0 = Square, 1 = Dots, 2 = Rounded, 3 = Diamond, 4 = Star, 5 = Clover, 6 = Tiny-Dot, 7 = H-Bars
        let shapeId = 0;
        switch (config?.bodyShape) {
            case 'dots': shapeId = 1; break;
            case 'rounded': shapeId = 2; break;
            case 'diamond': shapeId = 3; break;
            case 'star': shapeId = 4; break;
            case 'clover': shapeId = 5; break;
            case 'tiny-dots': shapeId = 6; break;
            case 'classy': shapeId = 7; break; // H-Bars
            default: shapeId = 0;
        }

        // Generate raw SVG path from Rust
        const ecc = config?.ecc || 'M';
        const mask = (config?.mask === undefined || config?.mask === null) ? -1 : config.mask;
        let svgString = wasm.generate_svg(content, shapeId, ecc, mask);

        // 2. Determine Filter Usage
        const useLiquidFilter = config?.effectLiquid ?? false;

        // 3. Post-Process SVG for Styles

        // --- Colors & Gradients ---
        let fillAttr = 'fill="currentColor"';
        let defs = '';
        const uuid = 'grad-' + Math.random().toString(36).substring(2, 11);
        // STABLE Filter ID for live updates
        const filterId = 'qr-goo-filter';

        // Define Gooey Filter if needed
        if (useLiquidFilter) {
            // --- UNIFIED MATH CALIBRATION ---
            // Goal: Match WebGL visual appearance exactly.
            // WebGL: Uses fixed 512px canvas. Blur 1.0 = 10px radius.
            //        Blur Fraction = 10 / 512 = ~0.0195 (1.95% of image width).
            // SVG:   Uses "Module" units (viewBox size). 
            //        To match 1.95% width, we must scale by the viewBox size.

            // 1. Get ViewBox Size (Modules)
            let viewBoxSize = 29; // Fallback default
            const vbMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/);
            if (vbMatch) {
                viewBoxSize = parseInt(vbMatch[1]);
            }

            // 2. Calculate Calibration Factor
            // factor = (WebGL_Max_Blur_Px / WebGL_Canvas_Px) * SVG_Size
            // factor = (10.0 / 512.0) * viewBoxSize
            // stdDeviation = inputBlur * factor
            const CALIBRATION_FACTOR = (10.0 / 512.0) * viewBoxSize;

            // 3. Apply
            const rawBlur = config?.effectBlur ?? 0.35; // 0.1 to 2.0
            // We use a slightly boosted 2.5 multiplier because SVG Gaussian is theoretically infinite 
            // while WebGL often clamps or has different discrete sampling. 
            // Empirically, SVG blur looks "weaker" than WebGL for same sigma.
            // Boosting the calculated sigma by 1.5x - 2.0x usually helps.
            // Let's stick to the STRICT math first, then tweak if user complains.
            // Actually, let's use the empirical observation that SVG needs ~1.5x to match WebGL's appearance.
            const calibratedBlur = rawBlur * CALIBRATION_FACTOR * 1.5;

            const thresh = config?.effectCrystalize ?? 6;

            // Use stable element IDs for live DOM updates
            defs += `<filter id="${filterId}">
              <feGaussianBlur id="qr-blur-el" in="SourceGraphic" stdDeviation="${calibratedBlur.toFixed(3)}" result="blur" />
              <feColorMatrix id="qr-matrix-el" in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -${thresh}" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
            </filter>`;
        }

        if (config?.gradientEnabled && config?.gradientColors?.length === 2) {
            const [c1, c2] = config.gradientColors;
            // Linear Gradient
            defs += `<linearGradient id="${uuid}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${c1}"/>
                    <stop offset="100%" stop-color="${c2}"/>
                 </linearGradient>`;
            fillAttr = `fill="url(#${uuid})"`;
        } else if (config?.fgColor) {
            fillAttr = `fill="${config.fgColor}"`;
        }

        // Replace global fill
        svgString = svgString.replace('fill="currentColor"', fillAttr);

        // Apply Filter to the base path
        if (useLiquidFilter) {
            // Apply to Body
            svgString = svgString.replace('<path ', `<path filter="url(#${filterId})" `);

            // Note: If we want to apply to EYES too, we'd do it in the Eye Injection step.
            // For now, let's keep it on Body as that's the main "Liquid" look.
            // Eyes usually look better crisp or strictly geometric unless fully integrated.
        }

        // Inject Defs
        if (defs) {
            // Rust output often looks like: <svg ...><path ...>
            // We insert defs before the first path
            svgString = svgString.replace('<path', `<defs>${defs}</defs><path`);
        }

        // --- Background ---
        if (config?.bgColor && config.bgColor !== 'transparent') {
            // Prepend bg rect
            svgString = svgString.replace('<svg ', `<svg style="background-color: ${config.bgColor};" `);
        }

        // --- Logo Injection ---
        if (config?.logo) {
            // Find viewBox to calculate alignment
            // Format: viewBox="0 0 W H"
            const vbMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/);
            if (vbMatch) {
                const size = parseInt(vbMatch[1]);
                const logoSize = (config.logoSize || 0.2) * size;
                const xy = (size - logoSize) / 2;

                const imgTag = `<image href="${config.logo}" x="${xy}" y="${xy}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid slice"/>`;
                svgString = svgString.replace('</svg>', imgTag + '</svg>');
            }
        }

        // --- 5. Eye Injection (Hybrid Mode) ---
        // Rust skips finders, we inject them here for max customization
        const vbMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/);
        if (vbMatch) {
            const size = parseInt(vbMatch[1]);
            // Use shared finder pattern renderer (margin=0 for Rust SVG)
            const eyesPath = drawAllFinderPatterns(size, 0, {
                eyeFrameShape: config?.eyeFrameShape || 'square',
                eyeBallShape: config?.eyeBallShape || 'square'
            });

            // Apply filter to Eyes if Liquid is ON
            const eyesFilter = useLiquidFilter ? `filter="url(#${filterId})"` : '';
            // We need to inject the path with the correct fill. 
            // Reuse fillAttr which is like 'fill="..."'
            const eyePathTag = `<path d="${eyesPath}" ${fillAttr} ${eyesFilter} />`;

            svgString = svgString.replace('</svg>', eyePathTag + '</svg>');
        }

        // Add 100% dimensions for responsiveness if not present
        if (!svgString.includes('width="100%"')) {
            svgString = svgString.replace('<svg ', '<svg width="100%" height="100%" ');
        }

        return svgString;
    }
}

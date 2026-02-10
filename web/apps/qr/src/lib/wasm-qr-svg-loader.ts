type HoliQrSvgModule = typeof import('../../../../packages/wasm-qr-svg/pkg/holi_qr_svg.js');

let wasmModule: HoliQrSvgModule | null = null;
let wasmInitPromise: Promise<HoliQrSvgModule> | null = null;

export function isHoliQrSvgReady(): boolean {
    return wasmModule !== null;
}

/**
 * Dynamically loads and initializes the wasm-qr-svg module exactly once.
 *
 * Important: keep the import path as a string literal so Vite can pre-bundle it.
 */
export async function getHoliQrSvg(): Promise<HoliQrSvgModule> {
    if (wasmModule) return wasmModule;
    if (wasmInitPromise) return wasmInitPromise;

    wasmInitPromise = (async () => {
        try {
            const mod = await import('../../../../packages/wasm-qr-svg/pkg/holi_qr_svg.js');
            await mod.default();
            wasmModule = mod;
            return mod;
        } catch (error) {
            wasmModule = null;
            wasmInitPromise = null;
            throw error;
        }
    })();

    return wasmInitPromise;
}

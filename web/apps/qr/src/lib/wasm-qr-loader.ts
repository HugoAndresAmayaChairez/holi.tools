type HoliWasmQrModule = typeof import('@holi/wasm-qr');

let wasmModule: HoliWasmQrModule | null = null;
let wasmInitPromise: Promise<HoliWasmQrModule> | null = null;

export function isHoliWasmQrReady(): boolean {
    return wasmModule !== null;
}

/**
 * Dynamically loads and initializes the @holi/wasm-qr module exactly once.
 *
 * Important: keep the import path as a string literal so Vite can pre-bundle it.
 */
export async function getHoliWasmQr(): Promise<HoliWasmQrModule> {
    if (wasmModule) return wasmModule;
    if (wasmInitPromise) return wasmInitPromise;

    wasmInitPromise = (async () => {
        try {
            const mod = await import('@holi/wasm-qr');
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


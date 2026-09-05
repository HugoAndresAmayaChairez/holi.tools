/**
 * webgl-textures.ts — Texture management for the WebGL renderer
 *
 * Extracted from WebGLLiquidRenderer.  Handles loading shape mask
 * atlases from WASM and managing the image texture cache (logo, art,
 * paper, ink).
 */
import { getHoliWasmQr } from './wasm-qr-loader';
import { loadTexture } from './webgl-setup';
import type { RenderConfig } from './core/types';

// ── Types ────────────────────────────────────────────────────────

/** Holds the mutable texture-management state that lives on the renderer. */
export interface TextureState {
    gl: WebGL2RenderingContext;

    // Logo
    logoTexture: WebGLTexture | null;
    currentLogoUrl: string | null;
    logoAspect: number;

    // Art / Background
    artTexture: WebGLTexture | null;
    currentArtUrl: string | null;
    artAspect: number;

    // Paper
    paperTexture: WebGLTexture | null;
    currentPaperUrl: string | null;
    paperAspect: number;

    // Ink
    inkTexture: WebGLTexture | null;
    currentInkUrl: string | null;
    inkAspect: number;

    // Shape masks (WASM-generated)
    bodyMaskAtlasTexture: WebGLTexture | null;
    eyeMaskTexture: WebGLTexture | null;
    bodyMaskAtlasKey: string | null;
    eyeMaskKey: string | null;
    maskLoadPromise: Promise<void> | null;
    maskReadyRerenderScheduled: boolean;
    readonly bodyAtlasTileSize: number;
    readonly eyeMaskTileSize: number;
}

// ── Image loaders ────────────────────────────────────────────────

export async function setLogo(ts: TextureState, logoUrl: string | null): Promise<void> {
    if (logoUrl === ts.currentLogoUrl) return;
    ts.currentLogoUrl = logoUrl;
    ts.logoTexture = await loadTexture(ts.gl, logoUrl, ts.logoTexture, (img) => {
        ts.logoAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    });
}

export async function setArtImage(ts: TextureState, artUrl: string | null): Promise<void> {
    if (artUrl === ts.currentArtUrl) return;
    ts.currentArtUrl = artUrl;
    ts.artTexture = await loadTexture(ts.gl, artUrl, ts.artTexture, (img) => {
        ts.artAspect = img.width / img.height;
    });
}

export async function setPaperImage(ts: TextureState, paperUrl: string | null): Promise<void> {
    if (paperUrl === ts.currentPaperUrl) return;
    ts.currentPaperUrl = paperUrl;
    ts.paperTexture = await loadTexture(ts.gl, paperUrl, ts.paperTexture, (img) => {
        ts.paperAspect = img.width / img.height;
    });
}

export async function setInkImage(ts: TextureState, inkUrl: string | null): Promise<void> {
    if (inkUrl === ts.currentInkUrl) return;
    ts.currentInkUrl = inkUrl;
    ts.inkTexture = await loadTexture(ts.gl, inkUrl, ts.inkTexture, (img) => {
        ts.inkAspect = img.width / img.height;
    });
}

// ── Shape mask management ────────────────────────────────────────

/**
 * Load WASM-generated body and/or eye shape masks into GPU textures.
 */
export async function loadShapeMasks(
    ts: TextureState,
    bodyShape: string,
    eyeFrameShape: string,
    eyeBallShape: string
): Promise<void> {
    const gl = ts.gl;

    const wasm = await getHoliWasmQr();

    const bodyKey = bodyShape;
    const eyeKey = `${eyeFrameShape}:${eyeBallShape}`;

    const needsBody = ts.bodyMaskAtlasKey !== bodyKey || !ts.bodyMaskAtlasTexture;
    const needsEye = ts.eyeMaskKey !== eyeKey || !ts.eyeMaskTexture;
    if (!needsBody && !needsEye) return;

    try {
        if (needsBody) {
            const fn = (wasm as any).get_body_mask_atlas as undefined | ((shape: string, tile: number) => Uint8Array);
            if (typeof fn !== 'function') {
                throw new Error('wasm-qr: get_body_mask_atlas() missing (run: pnpm build:wasm)');
            }

            const alpha = fn(bodyKey, ts.bodyAtlasTileSize);
            const atlasSize = ts.bodyAtlasTileSize * 16;

            const tex = ts.bodyMaskAtlasTexture || gl.createTexture();
            if (!tex) throw new Error('WebGL: failed to create body mask texture');
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.R8,
                atlasSize, atlasSize, 0,
                gl.RED, gl.UNSIGNED_BYTE, alpha
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            ts.bodyMaskAtlasTexture = tex;
            ts.bodyMaskAtlasKey = bodyKey;
        }

        if (needsEye) {
            const fn = (wasm as any).get_eye_mask as undefined | ((frame: string, ball: string, tile: number) => Uint8Array);
            if (typeof fn !== 'function') {
                throw new Error('wasm-qr: get_eye_mask() missing (run: pnpm build:wasm)');
            }

            const alpha = fn(eyeFrameShape, eyeBallShape, ts.eyeMaskTileSize);
            const size = ts.eyeMaskTileSize;

            const tex = ts.eyeMaskTexture || gl.createTexture();
            if (!tex) throw new Error('WebGL: failed to create eye mask texture');
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.R8,
                size, size, 0,
                gl.RED, gl.UNSIGNED_BYTE, alpha
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            ts.eyeMaskTexture = tex;
            ts.eyeMaskKey = eyeKey;
        }
    } finally {
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}

/**
 * Ensure shape mask textures match the current config.
 * Kicks off async loading if needed and schedules a re-render on completion.
 *
 * @param renderFn  Called when masks finish loading (deferred one frame via rAF).
 */
export function ensureShapeMasks(
    ts: TextureState,
    config: RenderConfig,
    renderFn: (cfg: RenderConfig) => void,
    getLatestConfig: () => RenderConfig | null,
    initialized: boolean
): void {
    const body = config.bodyShapeKey;
    const frame = config.eyeFrameShapeKey;
    const ball = config.eyeBallShapeKey;
    if (!body || !frame || !ball) return;

    const bodyChanged = ts.bodyMaskAtlasKey !== body || !ts.bodyMaskAtlasTexture;
    const eyeChanged = ts.eyeMaskKey !== `${frame}:${ball}` || !ts.eyeMaskTexture;
    if (!bodyChanged && !eyeChanged) return;

    // A load is already in flight. The re-render below reads the *latest*
    // config, so a shape picked meanwhile is loaded right after this one
    // instead of being dropped.
    if (ts.maskLoadPromise) return;
    ts.maskLoadPromise = loadShapeMasks(ts, body, frame, ball)
        .catch((e) => {
            console.error('WebGL: failed to load shape masks', e);
        })
        .finally(() => {
            ts.maskLoadPromise = null;
            if (!ts.gl || !initialized) return;
            if (!ts.bodyMaskAtlasTexture || !ts.eyeMaskTexture) return;
            if (!getLatestConfig() || ts.maskReadyRerenderScheduled) return;

            ts.maskReadyRerenderScheduled = true;
            // A macrotask rather than requestAnimationFrame: rAF is paused in
            // background tabs, which left the canvas showing the old shapes.
            window.setTimeout(() => {
                ts.maskReadyRerenderScheduled = false;
                const latest = getLatestConfig();
                if (!latest || !ts.gl || !initialized) return;
                renderFn(latest);
            }, 0);
        });
}

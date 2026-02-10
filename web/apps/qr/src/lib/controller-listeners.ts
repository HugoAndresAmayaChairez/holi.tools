/**
 * controller-listeners.ts — DOM event listener setup
 *
 * Extracted from QRController.initListeners() to reduce class size.
 * Each function registers listeners using the provided AbortSignal.
 */
import { state } from './qr-engine';
import { scanVerifier } from './scan-verifier';
import { qrScanner } from './qr-scanner';
import type { QRController } from './qr-controller';
import type { QRLayersConfig } from './core/layers';

/**
 * Attach core click-delegation listeners (generate, reset, verify, copy).
 */
export function attachClickDelegation(ctrl: QRController, signal: AbortSignal): void {
    document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;

        if (target.closest("#generate-btn")) {
            console.log("QRController: Delegated Click -> Generate");
            ctrl.generateQR();
            return;
        }
        if (target.closest("#btn-reset")) {
            ctrl.resetToZero();
            return;
        }
        if (target.closest("#btn-verify")) {
            scanVerifier.verifyScan();
            return;
        }
        if (target.closest("#btn-copy")) {
            ctrl.copyQRToClipboard();
            return;
        }
    }, { signal });
}

/**
 * Attach input field listeners (auto-generate on typing, enter key).
 */
export function attachInputListeners(ctrl: QRController, signal: AbortSignal): void {
    document.body.addEventListener("input", (e) => {
        if ((e.target as HTMLElement).classList.contains("input-field")) {
            ctrl.debouncedAutoGenerate();
        }
    }, { signal });

    document.body.addEventListener("keydown", (e) => {
        if ((e.target as HTMLElement).classList.contains("input-field") && (e as KeyboardEvent).key === "Enter" && !(e.target as HTMLElement).matches("textarea")) {
            ctrl.clearInputDebounce();
            ctrl.generateQR();
        }
    }, { signal });
}

/**
 * Attach content-type change listener (brand logo injection, scanner activation).
 */
export function attachTypeChangeListener(ctrl: QRController, signal: AbortSignal): void {
    window.addEventListener('qr-type-changed', ((e: CustomEvent<{ type?: string }>) => {
        const type = e.detail?.type || (window as any).currentContentType;
        if (type === 'scan') {
            qrScanner.activate();
        } else {
            ctrl.injectBrandLogo(type);
            ctrl.debouncedAutoGenerate();
        }
    }) as EventListener, { signal });
}

/**
 * Attach effect / filter / gradient / noise listeners for WebGL preview.
 */
export function attachEffectListeners(
    ctrl: QRController,
    signal: AbortSignal
): void {
    // Effect Change Listener (From StylePanel) - Full re-render (toggle on/off)
    window.addEventListener('qr-effect-change', async (e) => {
        const detail = (e as CustomEvent).detail;
        console.log("QRController: Effect Change (full)", detail);
        const { liquid, blur, thresh } = detail;
        const layers = ctrl.getLayers();
        layers.ink.liquid.enabled = !!liquid;
        layers.ink.liquid.blur = blur;
        layers.ink.liquid.thresh = thresh;
        ctrl.syncLayers(layers);

        const hasGradient = (layers.ink.gradient.type ?? 0) > 0;
        const hasArt = layers.bg.enabled && layers.bg.image;
        const useWebGL = layers.ink.liquid.enabled || hasGradient || hasArt;

        if (ctrl.webglRenderer) {
            if (useWebGL && state.text) {
                const ok = await ctrl.uploadMatrix(true);
                if (ok) {
                    ctrl.webglRenderer.setVisible(true);
                    ctrl.hideQrSvg();
                    console.log("WebGL: Rendering frame (liquid/gradient/art)");
                    ctrl.webglRenderer.render(ctrl.getFullRenderConfig());
                } else {
                    ctrl.webglRenderer.setVisible(false);
                    ctrl.showQrSvg();
                }
            } else {
                ctrl.webglRenderer.setVisible(false);
                ctrl.showQrSvg();
            }
        }

        (window as any).updateQR();
    }, { signal });

    // LIVE Filter Tweak (60fps) - Uses WebGL for ultra-fast updates
    window.addEventListener('qr-filter-tweak', (e) => {
        const detail = (e as CustomEvent).detail;
        const { blur, thresh } = detail;
        const layers = ctrl.getLayers();
        layers.ink.liquid.blur = blur;
        layers.ink.liquid.thresh = thresh;
        ctrl.syncLayers(layers);

        if (ctrl.webglRenderer && (layers.ink.liquid.enabled || layers.bg.enabled)) {
            const config = ctrl.getFullRenderConfig();
            config.blur = blur;
            config.threshold = thresh;
            ctrl.webglRenderer.render(config);
            scanVerifier.debouncedVerify();
        } else if (ctrl.svgRenderer) {
            ctrl.svgRenderer.updateFilterParams(blur, thresh);
        }
    }, { signal });

    // Gradient Change Listener
    window.addEventListener('qr-gradient-change', async (e) => {
        const detail = (e as CustomEvent).detail;
        console.log("🎨 Gradient Change:", detail);
        const { type, color2, angle } = detail;
        const layers = ctrl.getLayers();
        layers.ink.gradient.type = type;
        layers.ink.gradient.color2 = color2;
        layers.ink.gradient.angle = angle;
        ctrl.syncLayers(layers);

        const hasGradient = type > 0;
        const hasArt = layers.bg.enabled && layers.bg.image;

        if (ctrl.webglRenderer && state.text) {
            if (hasGradient || hasArt) {
                const ok = await ctrl.uploadMatrix(true);
                if (ok) {
                    ctrl.webglRenderer.setVisible(true);
                    ctrl.hideQrSvg();
                } else {
                    ctrl.webglRenderer.setVisible(false);
                    ctrl.showQrSvg();
                }
            }
            ctrl.updateWebGLPreview();
            scanVerifier.debouncedVerify();
        }
    }, { signal });

    // Noise Change Listener
    window.addEventListener('qr-noise-change', async (e) => {
        const detail = (e as CustomEvent).detail;
        console.log("🌫️ Noise Change:", detail);
        const { enabled, amount, scale } = detail;
        const layers = ctrl.getLayers();
        layers.ink.noise.enabled = !!enabled;
        layers.ink.noise.amount = enabled ? (amount / 100) : 0;
        layers.ink.noise.scale = scale;
        ctrl.syncLayers(layers);

        if (ctrl.webglRenderer && state.text) {
            if (enabled || layers.bg.enabled) {
                const ok = await ctrl.uploadMatrix(true);
                if (ok) {
                    ctrl.webglRenderer.setVisible(true);
                    ctrl.hideQrSvg();
                } else {
                    ctrl.webglRenderer.setVisible(false);
                    ctrl.showQrSvg();
                }
            }
            ctrl.updateWebGLPreview();
            scanVerifier.debouncedVerify();
        }
    }, { signal });
}

/**
 * Attach logo-related listeners (upload, remove, size).
 */
export function attachLogoListeners(ctrl: QRController, signal: AbortSignal): void {
    const logoInput = document.getElementById("logo-upload") as HTMLInputElement;
    if (logoInput) logoInput.addEventListener("change", (e) => ctrl.handleLogoUpload(e), { signal });
    (window as any).removeLogo = () => ctrl.removeLogo();
    (window as any).setLogoSize = (size: number) => {
        state.config.logoSize = size;
        const valueEl = document.getElementById('logo-size-value');
        if (valueEl) valueEl.textContent = Math.round(size * 100) + '%';
        (window as any).updateQR();
    };
    (window as any).handleLogoUpload = (e: Event) => ctrl.handleLogoUpload(e);
}

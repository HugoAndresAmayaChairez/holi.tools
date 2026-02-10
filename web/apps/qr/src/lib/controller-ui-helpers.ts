/**
 * controller-ui-helpers.ts — Window-exposed UI helper functions
 *
 * Extracted from QRController constructor to reduce class size.
 * Registers shape/ECC/mask setters and the download handler on `window`.
 */
import { state, type BodyShape, type EyeFrameShape, type EyeBallShape } from './qr-engine';
import { hexToRgba } from './utils/color';
import type { QRController } from './qr-controller';
import type { LayerId, QRLayersConfig } from './core/layers';

/**
 * Register the qrLayers API on `window` for use by panel components.
 */
export function registerLayersAPI(ctrl: QRController): void {
    (window as any).qrLayers = {
        get: () => ctrl.getLayers(),
        setLayerEnabled: (layer: LayerId, enabled: boolean) => {
            const l = ctrl.getLayers();
            if (layer === 'card') {
                l.card.enabled = enabled;
                if (enabled && (l.card.opacity ?? 1) <= 0.001) l.card.opacity = 1;
            } else if (layer === 'bg') {
                l.bg.enabled = enabled;
                if (enabled && (l.bg.opacity ?? 1) <= 0.001) l.bg.opacity = 1;
            } else if (layer === 'paper') {
                l.paper.enabled = enabled;
                if (enabled && (l.paper.opacity ?? 1) <= 0.001) l.paper.opacity = 1;
            } else if (layer === 'ink') {
                l.ink.enabled = enabled;
                if (enabled && (l.ink.opacity ?? 1) <= 0.001) l.ink.opacity = 1;
            } else if (layer === 'logo') {
                l.logo.enabled = enabled;
                if (enabled && (l.logo.opacity ?? 1) <= 0.001) l.logo.opacity = 1;
            }
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setLayerOpacity: (layer: LayerId, opacity01: number) => {
            const l = ctrl.getLayers();
            const clamped = Math.max(0, Math.min(1, opacity01));
            if (layer === 'card') l.card.opacity = clamped;
            else if (layer === 'bg') l.bg.opacity = clamped;
            else if (layer === 'paper') l.paper.opacity = clamped;
            else if (layer === 'ink') l.ink.opacity = clamped;
            else if (layer === 'logo') l.logo.opacity = clamped;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setCard: (image?: string, opacity?: number) => {
            const l = ctrl.getLayers();
            l.card.image = image;
            l.card.enabled = !!image;
            if (typeof opacity === 'number') l.card.opacity = opacity;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setBg: (patch: Partial<QRLayersConfig['bg']>) => {
            const l = ctrl.getLayers();
            Object.assign(l.bg, patch);
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setPaper: (patch: Partial<QRLayersConfig['paper']>) => {
            const l = ctrl.getLayers();
            Object.assign(l.paper, patch);
            if (typeof patch.image === 'string' && patch.image.length > 0) l.paper.enabled = true;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setInk: (patch: Partial<QRLayersConfig['ink']>) => {
            const l = ctrl.getLayers();
            Object.assign(l.ink, patch);
            if (typeof patch.image === 'string' && patch.image.length > 0) l.ink.enabled = true;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setPaperColor: (color: string) => {
            const l = ctrl.getLayers();
            l.paper.color = color;
            l.paper.enabled = color !== 'transparent';
            if (l.paper.enabled && (l.paper.opacity ?? 1) <= 0.001) l.paper.opacity = 1;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setInkColor: (color: string) => {
            const l = ctrl.getLayers();
            l.ink.color = color;
            const a = hexToRgba(color)[3] ?? 1;
            l.ink.enabled = a > 0.001;
            if (l.ink.enabled && (l.ink.opacity ?? 1) <= 0.001) l.ink.opacity = 1;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setInkLiquid: (patch: Partial<QRLayersConfig['ink']['liquid']>) => {
            const l = ctrl.getLayers();
            Object.assign(l.ink.liquid, patch);
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setInkNoise: (patch: Partial<QRLayersConfig['ink']['noise']>) => {
            const l = ctrl.getLayers();
            Object.assign(l.ink.noise, patch);
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setInkGradient: (patch: Partial<QRLayersConfig['ink']['gradient']>) => {
            const l = ctrl.getLayers();
            Object.assign(l.ink.gradient, patch);
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        },
        setLogo: (image?: string) => {
            const l = ctrl.getLayers();
            l.logo.image = image;
            l.logo.enabled = !!image;
            if (l.logo.enabled && (l.logo.opacity ?? 1) <= 0.001) l.logo.opacity = 1;
            ctrl.syncLayers(l);
            (window as any).updateQR?.();
        }
    };
}

/**
 * Register shape, ECC, mask, and download helpers on `window`.
 */
export function registerUIHelpers(ctrl: QRController): void {
    (window as any).downloadAs = async (format: string, size?: number) => {
        const btn = document.getElementById("btn-download") as HTMLButtonElement | null;
        if (btn?.getAttribute("aria-busy") === "true") return;
        try {
            if (btn) btn.setAttribute("aria-busy", "true");
            const m = await import('./export-manager');
            await m.exportManager.handleDownloadAction(format as any, size);
        } finally {
            if (btn) btn.removeAttribute("aria-busy");
        }
    };

    (window as any).setBodyShape = async (val: BodyShape) => {
        state.config.bodyShape = val;
        ctrl.updateUI('bodyshape', val);
        if (ctrl.webglRenderer && ctrl.lastMatrixSize) ctrl.updateWebGLPreview();
        else await ctrl.renderQR();
    };
    (window as any).setEyeFrame = async (val: EyeFrameShape) => {
        state.config.eyeFrameShape = val;
        ctrl.updateUI('eyeframe', val);
        if (ctrl.webglRenderer && ctrl.lastMatrixSize) ctrl.updateWebGLPreview();
        else await ctrl.renderQR();
    };
    (window as any).setEyeBall = async (val: EyeBallShape) => {
        state.config.eyeBallShape = val;
        ctrl.updateUI('eyeball', val);
        if (ctrl.webglRenderer && ctrl.lastMatrixSize) ctrl.updateWebGLPreview();
        else await ctrl.renderQR();
    };

    (window as any).setEcc = (val: string) => {
        state.config.ecc = val as any;
        console.log("ECC set to:", val);
        ctrl.generateQR(true);
    };
    (window as any).setMaskPattern = (val: string) => {
        state.config.mask = val === "auto" ? undefined : parseInt(val);
        console.log("Mask set to:", state.config.mask);
        ctrl.generateQR(true);
    };
}

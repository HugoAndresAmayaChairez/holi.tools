import { state } from './qr-engine';
import { getIconSvg } from './icons';
import { getLuminance } from './utils/color';

/**
 * ScanVerifier - Lightweight QR verification using jsQR
 * Uses WebGL renderer's captureHighRes method
 */

export class ScanVerifier {
    private scanDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() { }

    public debouncedVerify(delayMs: number = 800) {
        if (this.scanDebounceTimer) clearTimeout(this.scanDebounceTimer);
        this.updateUIStatus("checking");
        this.scanDebounceTimer = setTimeout(() => {
            this.verifyScan();
        }, delayMs);
    }

    /**
     * Verify QR using jsQR + WebGL renderer's captureHighRes
     * This WORKS because captureHighRes re-renders to an offscreen canvas
     */
    public async verifyScan() {
        if (!state.text) {
            this.updateUIStatus("none");
            return;
        }

        try {
            // @ts-ignore - Access global qrController
            const qrController = window.qrController;

            if (!qrController?.webglRenderer) {
                console.warn("⚠️ Verifier: WebGL renderer not found");
                this.updateUIStatus("invalid");
                return;
            }

            // Use centralized render config from controller
            // This ensures verifier always captures with ALL current effects
            const config = qrController.getFullRenderConfig();

            // Capture at 512px (optimal for jsQR)
            const blob = await qrController.webglRenderer.captureHighRes(config, 512);

            if (!blob) {
                console.warn("⚠️ Capture failed");
                this.updateUIStatus("invalid");
                return;
            }

            console.log("🔍 Captured blob:", blob.size, "bytes");

            // Convert blob to Image with timeout
            const img = new Image();
            const url = URL.createObjectURL(blob);

            await Promise.race([
                new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = url;
                }),
                new Promise<void>((_, reject) =>
                    setTimeout(() => reject(new Error('Image load timeout')), 5000)
                )
            ]);

            // Draw to canvas and get ImageData (Scale to 512px)
            const canvas = document.createElement('canvas');
            const targetSize = 512; // Optimal for jsQR
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                URL.revokeObjectURL(url);
                this.updateUIStatus("invalid");
                return;
            }

            // Smart Background Selection for Transparent QRs
            // If QR is light -> Use Black BG. If QR is dark -> Use White BG.
            const fgHex = state.config.fg || '#000000';
            const isLightFg = getLuminance(fgHex) > 0.5;

            ctx.fillStyle = isLightFg ? '#000000' : '#FFFFFF';
            ctx.fillRect(0, 0, targetSize, targetSize);

            // Draw 2048px image scaled down to 512px
            ctx.drawImage(img, 0, 0, targetSize, targetSize);
            URL.revokeObjectURL(url);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Import jsQR
            const { default: jsQR } = await import('jsqr');

            // Decode
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
            });

            if (code && code.data) {
                console.log("✅ jsQR verified:", code.data);
                this.updateUIStatus("valid");
            } else {
                console.warn("❌ jsQR: Not readable");
                this.updateUIStatus("invalid");
            }

        } catch (e: any) {
            console.warn("❌ Verifier error:", e.message);
            this.updateUIStatus("invalid");
        }
    }

    // getLuminance moved to ./utils/color.ts

    // hexToRgb, parseBgColor, getBodyShapeId, getEyeFrameId, getEyeBallId
    // moved to centralized modules: ./utils/color.ts and ./constants/shapes.ts

    private updateUIStatus(status: "valid" | "invalid" | "checking" | "none") {
        const btn = document.getElementById("btn-verify");
        const icon = document.getElementById("verify-icon");

        const setIcon = (name: string) => {
            if (icon) {
                const svg = getIconSvg(name, 24);
                if (svg) icon.innerHTML = svg;
            }
        };

        if (btn) {
            btn.classList.remove("valid", "invalid", "checking");
            if (status === "checking") {
                btn.classList.add("checking");
                setIcon("history");
                btn.title = "Checking...";
            } else if (status === "valid") {
                btn.classList.add("valid");
                setIcon("check_circle");
                btn.title = "QR Scannable";
            } else if (status === "invalid") {
                btn.classList.add("invalid");
                setIcon("error");
                btn.title = "QR Unreadable";
            } else {
                setIcon("verified_user");
                btn.title = "Verify QR";
            }
        }

        const styleStatus = document.getElementById("style-readable-status");
        const styleIcon = document.getElementById("style-status-icon");
        const styleText = document.getElementById("style-status-text");

        if (styleStatus && styleIcon && styleText) {
            styleStatus.classList.remove("valid", "invalid", "checking");
            if (status === "checking") {
                styleStatus.classList.add("checking");
                styleIcon.textContent = "⏳";
                styleText.textContent = "Checking...";
            } else if (status === "valid") {
                styleStatus.classList.add("valid");
                styleIcon.textContent = "✅";
                styleText.textContent = "QR is readable";
            } else if (status === "invalid") {
                styleStatus.classList.add("invalid");
                styleIcon.textContent = "❌";
                styleText.textContent = "QR not readable";
            }
        }
    }
}

export const scanVerifier = new ScanVerifier();

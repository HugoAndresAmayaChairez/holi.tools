import { state } from "./qr-engine";
import { getIconSvg } from "./icons";
import { getLuminance } from "./utils/color";
import {
  BODY_SHAPES,
  EYE_BALL_SHAPES,
  EYE_FRAME_SHAPES,
} from "./qr-styles-config";
import { getHoliWasmQr } from "./wasm-qr-loader";

/**
 * ScanVerifier - Lightweight QR verification using jsQR
 * Uses WebGL renderer's captureHighRes method
 */

export class ScanVerifier {
  private scanDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {}

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

      // Capture at 1024px (more robust for stylized shapes)
      const blob = await qrController.webglRenderer.captureHighRes(
        config,
        1024
      );

      if (!blob) {
        console.warn("⚠️ Capture failed");
        this.updateUIStatus("invalid");
        return;
      }

      console.log("🔍 Captured blob:", blob.size, "bytes");

      // Prefer Rust/WASM decoder (rxing / ZXing-like) on the captured PNG bytes.
      let decoded: string | null = null;
      try {
        const wasm = await getHoliWasmQr();
        const decodeFn = (wasm as any).decode_qr_image as
          | undefined
          | ((bytes: Uint8Array) => string);
        if (typeof decodeFn === "function") {
          decoded = decodeFn(new Uint8Array(await blob.arrayBuffer()));
        }
      } catch (e) {
        console.warn("Verifier: WASM decode failed, falling back to jsQR", e);
      }

      // Fallback to native BarcodeDetector if WASM isn't available for any reason.
      if (!decoded && "BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
          const barcodes = await barcodeDetector.detect(blob);
          if (barcodes.length > 0) {
            decoded = barcodes[0].rawValue;
          }
        } catch (e) {
          console.warn("BarcodeDetector fallback failed", e);
        }
      }

      if (decoded) {
        console.log("✅ Verified:", decoded);
        this.updateUIStatus("valid");
      } else {
        console.warn("❌ Not readable");
        this.updateUIStatus("invalid");
      }
    } catch (e: any) {
      console.warn("❌ Verifier error:", e.message);
      this.updateUIStatus("invalid");
    }
  }

  private async decodeBlob(
    blob: Blob,
    targetSize: number
  ): Promise<string | null> {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    try {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image load failed"));
          img.src = url;
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Image load timeout")), 5000)
        ),
      ]);

      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Pick a solid background for transparency cases.
      const fgHex = state.config.fg || "#000000";
      const isLightFg = getLuminance(fgHex) > 0.5;
      ctx.fillStyle = isLightFg ? "#000000" : "#FFFFFF";
      ctx.fillRect(0, 0, targetSize, targetSize);

      ctx.drawImage(img, 0, 0, targetSize, targetSize);
      const imageData = ctx.getImageData(0, 0, targetSize, targetSize);

      if ("BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
          const barcodes = await barcodeDetector.detect(imageData);
          if (barcodes.length > 0) {
            return barcodes[0].rawValue;
          }
        } catch (e) {
          console.warn("BarcodeDetector decodeBlob failed", e);
        }
      }

      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Dev helper: checks readability across each shape option, one category at a time.
   * Use in DevTools: `await window.__qrDebugCheckShapes()`
   */
  public async debugCheckShapes() {
    // @ts-ignore - Access global qrController
    const qrController = window.qrController;
    if (!qrController?.webglRenderer) {
      console.warn(
        "Verifier debugCheckShapes: qrController.webglRenderer missing"
      );
      return null;
    }
    if (!state.text) {
      console.warn("Verifier debugCheckShapes: no state.text set");
      return null;
    }

    const prev = {
      body: state.config.bodyShape,
      frame: state.config.eyeFrameShape,
      ball: state.config.eyeBallShape,
    };

    const runOne = async () => {
      const config = qrController.getFullRenderConfig();
      const blob = await qrController.webglRenderer.captureHighRes(config, 512);
      if (!blob) return null;
      return await this.decodeBlob(blob, 512);
    };

    const results = {
      body: [] as Array<{ id: string; ok: boolean }>,
      eyeFrame: [] as Array<{ id: string; ok: boolean }>,
      eyeBall: [] as Array<{ id: string; ok: boolean }>,
    };

    try {
      // Body shapes: keep eyes stable.
      state.config.eyeFrameShape = "square";
      state.config.eyeBallShape = "square";
      for (const s of BODY_SHAPES) {
        state.config.bodyShape = s.id as any;
        const decoded = await runOne();
        results.body.push({ id: s.id, ok: !!decoded });
      }

      // Eye frame shapes: keep body/ball stable.
      state.config.bodyShape = "square";
      state.config.eyeBallShape = "square";
      for (const s of EYE_FRAME_SHAPES) {
        state.config.eyeFrameShape = s.id as any;
        const decoded = await runOne();
        results.eyeFrame.push({ id: s.id, ok: !!decoded });
      }

      // Eye ball shapes: keep body/frame stable.
      state.config.bodyShape = "square";
      state.config.eyeFrameShape = "square";
      for (const s of EYE_BALL_SHAPES) {
        state.config.eyeBallShape = s.id as any;
        const decoded = await runOne();
        results.eyeBall.push({ id: s.id, ok: !!decoded });
      }
    } finally {
      state.config.bodyShape = prev.body;
      state.config.eyeFrameShape = prev.frame;
      state.config.eyeBallShape = prev.ball;
    }

    console.table(results.body);
    console.table(results.eyeFrame);
    console.table(results.eyeBall);

    return results;
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
      btn.setAttribute("data-verify-status", status);
      if (status === "checking") {
        btn.classList.add("checking");
        setIcon("history");
        btn.setAttribute("aria-busy", "true");
      } else if (status === "valid") {
        btn.classList.add("valid");
        setIcon("check_circle");
        btn.removeAttribute("aria-busy");
      } else if (status === "invalid") {
        btn.classList.add("invalid");
        setIcon("error");
        btn.removeAttribute("aria-busy");
      } else {
        setIcon("verified_user");
        btn.removeAttribute("aria-busy");
        // Keep localized tooltip from the toolbar component.
        const base = btn.getAttribute("data-title");
        if (base) btn.title = base;
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

// Devtools helper
if (typeof window !== "undefined") {
  (window as any).__qrDebugCheckShapes = async () =>
    scanVerifier.debugCheckShapes();
}

import { state, initWasm, getQrMatrix } from "./qr-engine";
import { scanVerifier } from "./scan-verifier";
import { getTypeLogo } from "./brand-logos";
import {
  WasmSvgRenderer,
  type RenderConfig as SvgRenderConfig,
} from "./wasm-svg-renderer";
import { WebGLLiquidRenderer } from "./webgl-liquid-renderer";
import { hexToRgb, hexToRgba, parseBgColor } from "./utils/color";
import { ensureLayersConfig, type QRLayersConfig } from "./core/layers";
import {
  getBodyShapeId,
  getEyeFrameId,
  getEyeBallId,
} from "./constants/shapes";
import { isGifFile, parseGifFile, gifAnimator } from "./gif-handler";
import { strategies } from "./strategies/content-types";
import type { RenderConfig } from "./core/types";
import { showToast, toastCopyResult } from "./ui/toast";
import { applyFrameToPng } from "./workspace/frame";

// Extracted modules
import {
  importLegacyIntoLayers,
  syncLegacyFromLayers,
} from "./controller-layers";
import {
  attachClickDelegation,
  attachInputListeners,
  attachTypeChangeListener,
  attachEffectListeners,
  attachLogoListeners,
} from "./controller-listeners";
import { registerLayersAPI, registerUIHelpers } from "./controller-ui-helpers";

// Expose GIF handler globally for ArtPanel
(window as any).gifHandler = { isGifFile, parseGifFile, gifAnimator };

// Tipos para los elementos del DOM extendidos
interface QRElements {
  generateBtn: HTMLButtonElement | null;
  resetBtn: HTMLButtonElement | null;
  canvas: HTMLElement | null;
  qr: HTMLElement | null;
  qrFrame: HTMLElement | null; // Container for background color
  fg: HTMLInputElement | null;
  bg: HTMLInputElement | null;
  [key: string]: HTMLElement | null;
}

export class QRController {
  public els: QRElements = {
    generateBtn: null,
    resetBtn: null,
    canvas: null,
    qr: null,
    qrFrame: null,
    fg: null,
    bg: null,
  };

  private inputDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static instance: QRController;
  public svgRenderer: WasmSvgRenderer | null = null;
  public webglRenderer: WebGLLiquidRenderer | null = null;
  private webglReady: Promise<boolean> | null = null;
  public lastMatrixSize: number = 0;
  private abortController: AbortController = new AbortController();
  private copyInProgress = false;

  public getLayers(): QRLayersConfig {
    return ensureLayersConfig(state.config);
  }

  /** Sync layers → legacy config (delegates to extracted pure function) */
  public syncLayers(layers: QRLayersConfig): void {
    syncLegacyFromLayers(state.config, layers);
  }

  constructor() {
    const existing = QRController.instance || (window as any).qrController;
    if (existing && existing instanceof QRController) {
      return existing;
    }
    QRController.instance = this;
    console.log("QRController: Constructor started");
    (window as any).state = state;
    (window as any).qrController = this;

    // Initialize canonical layer config from legacy fields once.
    const hadLayers = !!state.config.layers;
    const layers = this.getLayers();
    if (!hadLayers) {
      importLegacyIntoLayers(state.config, layers);
      syncLegacyFromLayers(state.config, layers);
    }

    // Register extracted module APIs
    registerLayersAPI(this);
    registerUIHelpers(this);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.onDomReady());
    } else {
      this.onDomReady();
    }
  }

  private onDomReady() {
    console.log(
      "QRController: onDomReady executing. Readystate:",
      document.readyState
    );
    this.initElements();
    this.initListeners();
    this.init();
  }

  public static getInstance(): QRController {
    if (!QRController.instance) QRController.instance = new QRController();
    return QRController.instance;
  }

  /**
   * Cleanup all event listeners and resources
   */
  public destroy(): void {
    this.abortController.abort();
    console.log("QRController: Destroyed, all event listeners removed");
  }

  private initElements() {
    console.log("QRController: initElements");

    this.els.generateBtn = document.getElementById(
      "generate-btn"
    ) as HTMLButtonElement;
    if (this.els.generateBtn)
      console.log("QRController: generate-btn found in DOM");
    else
      console.warn(
        "QRController: generate-btn NOT FOUND in DOM (will use delegation)"
      );

    this.els.resetBtn = document.getElementById(
      "btn-reset"
    ) as HTMLButtonElement;
    this.els.canvas = document.getElementById("canvas-container");
    this.els.qrFrame = document.getElementById("qr-output");
    this.els.qr = document.getElementById("qr-svg-target");
    this.els.fg = document.getElementById("color-fg") as HTMLInputElement;
    this.els.bg = document.getElementById("color-bg") as HTMLInputElement;

    // Init WASM SVG Renderer
    if (this.els.qr) {
      console.log("QRController: Initializing WasmSvgRenderer");
      this.svgRenderer = new WasmSvgRenderer("qr-svg-target");
      this.svgRenderer.init();

      this.webglRenderer = new WebGLLiquidRenderer("qr-render-target");
      this.webglReady = this.webglRenderer.init().then((ok) => {
        if (ok) console.log("🎮 WebGL Liquid Renderer ready");
        else console.warn("🎮 WebGL Liquid Renderer failed to init");
        return ok;
      });
    } else {
      console.error("QRController: qr-svg-target NOT FOUND");
    }

    // Auto-map inputs by ID
    const inputIds = [
      ["urlInput", "input-url"],
      ["textInput", "input-text"],
      ["wifiSsid", "input-wifi-ssid"],
      ["wifiPass", "input-wifi-pass"],
      ["wifiEnc", "input-wifi-enc"],
      ["vcardName", "input-vcard-name"],
      ["vcardPhone", "input-vcard-phone"],
      ["vcardEmail", "input-vcard-email"],
      ["vcardCompany", "input-vcard-company"],
      ["appstoreInput", "input-appstore"],
      ["playstoreInput", "input-playstore"],
      ["fbInput", "input-fb"],
      ["twitterInput", "input-twitter"],
      ["ytInput", "input-yt"],
      ["phoneInput", "input-phone"],
      ["emailAddr", "input-email-addr"],
      ["emailSub", "input-email-sub"],
      ["emailBody", "input-email-body"],
      ["smsPhone", "input-sms-phone"],
      ["smsMsg", "input-sms-msg"],
      ["locLat", "input-loc-lat"],
      ["locLong", "input-loc-long"],
      ["eventTitle", "input-event-title"],
      ["eventStart", "input-event-start"],
      ["eventEnd", "input-event-end"],
      ["eventLoc", "input-event-loc"],
      ["btcAddr", "input-btc-addr"],
      ["btcAmount", "input-btc-amount"],
    ];

    inputIds.forEach(([prop, id]) => {
      this.els[prop] = document.getElementById(id);
    });
  }

  private initListeners() {
    console.log("QRController: initListeners (using delegation)");
    const signal = this.abortController.signal;

    // Delegate to extracted listener modules
    attachClickDelegation(this, signal);
    attachInputListeners(this, signal);
    attachTypeChangeListener(this, signal);
    attachEffectListeners(this, signal);
    attachLogoListeners(this, signal);

    (window as any).updateQR = () => {
      this.renderQR();
      scanVerifier.debouncedVerify();
    };
  }

  // ─── Public helpers consumed by extracted modules ──────────────

  /** Clear the input debounce timer (used by enter-key handler) */
  public clearInputDebounce(): void {
    if (this.inputDebounceTimer) clearTimeout(this.inputDebounceTimer);
  }

  /** Show the SVG QR container */
  public showQrSvg(): void {
    if (this.els.qr) this.els.qr.style.display = "flex";
  }

  /** Hide the SVG QR container */
  public hideQrSvg(): void {
    if (this.els.qr) this.els.qr.style.display = "none";
  }

  /** Proxy for uploadMatrixToWebGL (exposed for listener modules) */
  public uploadMatrix(liquid: boolean): Promise<boolean> {
    return this.uploadMatrixToWebGL(liquid);
  }

  // ─── Render Config ────────────────────────────────────────────

  /**
   * CENTRALIZED RENDER CONFIG
   * Single source of truth for all WebGL render calls.
   */
  public getFullRenderConfig(): RenderConfig {
    const layers = this.getLayers();
    syncLegacyFromLayers(state.config, layers);

    const isLiquid = layers.ink.liquid.enabled;
    const safeFg = layers.ink.color || "#000000";
    const fgRgba = hexToRgba(safeFg);
    const paperColor = layers.paper.color || "#ffffff";
    const bgBase = layers.paper.enabled ? hexToRgba(paperColor) : [0, 0, 0, 0];
    const bgRgba: [number, number, number, number] = [
      bgBase[0],
      bgBase[1],
      bgBase[2],
      (bgBase[3] ?? 1) * (layers.paper.opacity ?? 1),
    ];

    const bgLayerOpacity = layers.bg.enabled ? (layers.bg.opacity ?? 1) : 0;
    const rawBgBase = layers.bg.enabled
      ? (hexToRgba(layers.bg.color || "#ffffff") as [
          number,
          number,
          number,
          number,
        ])
      : ([0, 0, 0, 0] as [number, number, number, number]);
    const bgBaseColor: [number, number, number, number] = [
      rawBgBase[0],
      rawBgBase[1],
      rawBgBase[2],
      (rawBgBase[3] ?? 1) * bgLayerOpacity,
    ];

    const normalizeGradientType = (raw: unknown): number => {
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string") {
        const trimmed = raw.trim().toLowerCase();
        if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
        if (trimmed === "none") return 0;
        if (trimmed === "linear") return 1;
        if (trimmed === "radial") return 2;
        if (trimmed === "conic" || trimmed === "sweep") return 3;
        if (trimmed === "diamond") return 4;
      }
      return 0;
    };

    const normalizeGradientAngle = (raw: unknown): number => {
      const angle =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? parseFloat(raw)
            : 0;
      if (!Number.isFinite(angle)) return 0;
      if (Math.abs(angle) > 2 * Math.PI + 0.001 && Math.abs(angle) <= 360) {
        return angle * (Math.PI / 180);
      }
      return angle;
    };

    const gType = normalizeGradientType(layers.ink.gradient.type);
    const gAngle = normalizeGradientAngle(layers.ink.gradient.angle);

    const inkAlpha = fgRgba[3] ?? 1;
    const wantsTransparentInk =
      !layers.ink.enabled ||
      (layers.ink.opacity ?? 1) <= 0.001 ||
      inkAlpha <= 0.001;

    const gradientColor2Rgba = hexToRgba(
      layers.ink.gradient.color2 || safeFg || "#000000"
    );
    const inkOpacity = layers.ink.opacity ?? 1;
    fgRgba[3] = (fgRgba[3] ?? 1) * inkOpacity;
    gradientColor2Rgba[3] = (gradientColor2Rgba[3] ?? 1) * inkOpacity;
    if (wantsTransparentInk) {
      fgRgba[3] = 0;
      gradientColor2Rgba[3] = 0;
    }
    return {
      blur: isLiquid ? layers.ink.liquid.blur || 0.35 : 0.0,
      threshold: isLiquid ? layers.ink.liquid.thresh || 6 : -10.0,
      color: fgRgba,
      inkEnabled:
        layers.ink.enabled &&
        (layers.ink.opacity ?? 1) > 0.001 &&
        (fgRgba[3] ?? 1) > 0.001,
      gradientColor2: gradientColor2Rgba,
      gradientType: gType,
      gradientAngle: gAngle,
      noiseAmount: layers.ink.noise.enabled ? layers.ink.noise.amount || 0 : 0,
      noiseScale: layers.ink.noise.scale || 100,
      backgroundColor: parseBgColor(
        layers.paper.enabled ? paperColor : "transparent"
      ) ?? [1, 1, 1],
      bgBaseColor,
      paperImage: layers.paper.enabled ? layers.paper.image : undefined,
      paperBoundsScale: layers.paper.boundsScale || 1.1,
      inkImage: layers.ink.enabled ? layers.ink.image : undefined,
      paperFit: layers.paper.fit,
      paperRotation: layers.paper.rotation,
      paperScale: layers.paper.scale,
      paperOffsetX: layers.paper.offsetX,
      paperOffsetY: layers.paper.offsetY,
      inkFit: layers.ink.fit,
      inkRotation: layers.ink.rotation,
      inkScale: layers.ink.scale,
      inkOffsetX: layers.ink.offsetX,
      inkOffsetY: layers.ink.offsetY,
      qrBgColor: bgRgba,
      qrSize: this.lastMatrixSize || 21,
      bodyShape: getBodyShapeId(state.config.bodyShape || "square"),
      eyeFrameShape: getEyeFrameId(state.config.eyeFrameShape || "square"),
      eyeBallShape: getEyeBallId(state.config.eyeBallShape || "square"),
      bodyShapeKey: state.config.bodyShape || "square",
      eyeFrameShapeKey: state.config.eyeFrameShape || "square",
      eyeBallShapeKey: state.config.eyeBallShape || "square",
      logo: layers.logo.enabled ? layers.logo.image : undefined,
      logoSize: state.config.logoSize || 0.2,
      logoOpacity: layers.logo.opacity ?? 1.0,
      logoFit: layers.logo.fit || state.config.logoFit || "contain",
      logoBgEnabled: state.config.logoBgEnabled !== false,
      logoBgColor: this.getLogoBgColorRgb(),
      logoBgShape: state.config.logoBgShape || "rounded",
      logoPadding: state.config.logoPadding || 0,
      logoCornerRadius: state.config.logoCornerRadius || 0,
      logoRotation: state.config.logoRotation || 0,
      logoScale: state.config.logoScale ?? 1.0,
      logoOffsetX: state.config.logoOffsetX || 0,
      logoOffsetY: state.config.logoOffsetY || 0,
      artImage: layers.bg.enabled ? layers.bg.image : undefined,
      artBoundsScale: layers.bg.boundsScale || 1.25,
      artOpacity: bgLayerOpacity,
      artBlendMode: layers.bg.blendMode || "normal",
      artFit: layers.bg.fit || "cover",
      artRotation: layers.bg.rotation || 0,
      artScale: layers.bg.scale || 1.0,
      artOffsetX: layers.bg.offsetX || 0,
      artOffsetY: layers.bg.offsetY || 0,
    };
  }

  public updateWebGLPreview() {
    if (!this.webglRenderer || !this.lastMatrixSize) return;

    this.webglRenderer.setVisible(true);
    if (this.els.qr) this.els.qr.style.display = "none";

    this.webglRenderer.render(this.getFullRenderConfig());

    this.updateQrFrameBackground();
    this.updateQrFrameImage();

    scanVerifier.debouncedVerify();
  }

  private getLogoBgColorRgb(): [number, number, number] {
    const raw = (state.config as any).logoBgColor;
    if (Array.isArray(raw) && raw.length >= 3) {
      const values = raw
        .slice(0, 3)
        .map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 1));
      const scale = values.some((v) => v > 1) ? 255 : 1;
      return [
        Math.max(0, Math.min(1, values[0] / scale)),
        Math.max(0, Math.min(1, values[1] / scale)),
        Math.max(0, Math.min(1, values[2] / scale)),
      ];
    }
    if (typeof raw === "string" && raw.trim()) {
      return hexToRgb(raw);
    }
    return [1, 1, 1];
  }

  private updateQrFrameImage() {
    if (!this.els.qrFrame) return;
    this.els.qrFrame.style.backgroundImage = "";
    this.els.qrFrame.style.backgroundSize = "";
    this.els.qrFrame.style.backgroundPosition = "";
    this.els.qrFrame.style.backgroundRepeat = "";
    this.els.qrFrame.style.backgroundColor = "";
  }

  private updateQrFrameBackground() {
    if (!this.els.qrFrame) return;

    const layers = this.getLayers();
    const bgAlpha = layers.paper.enabled
      ? (hexToRgba(layers.paper.color || "#ffffff")[3] ?? 1) *
        (layers.paper.opacity ?? 1)
      : 0;
    const fgAlpha = layers.ink.enabled
      ? (hexToRgba(layers.ink.color || "#000000")[3] ?? 1) *
        (layers.ink.opacity ?? 1)
      : 0;
    const wantsTransparentBg = !layers.paper.enabled || bgAlpha <= 0.001;
    const wantsTransparentInk = !layers.ink.enabled || fgAlpha <= 0.001;

    this.els.qrFrame.classList.toggle(
      "transparent-bg",
      wantsTransparentBg || wantsTransparentInk
    );
    this.els.qrFrame.style.backgroundColor = "";
  }

  private getSvgRenderConfig(): SvgRenderConfig {
    const layers = this.getLayers();
    syncLegacyFromLayers(state.config, layers);

    const numericType = layers.ink.gradient.type || 0;
    const gradientEnabled = numericType > 0;

    let svgGradientType: SvgRenderConfig["gradientType"] | undefined =
      undefined;
    if (numericType === 1) svgGradientType = "linear";
    else if (numericType === 2) svgGradientType = "radial";

    const gradientColor2 =
      layers.ink.gradient.color2 || layers.ink.color || "#000000";
    const rawGradientAngle = layers.ink.gradient.angle || 0;
    const gradientAngle =
      Math.abs(rawGradientAngle) > 2 * Math.PI + 0.001 &&
      Math.abs(rawGradientAngle) <= 360
        ? rawGradientAngle * (Math.PI / 180)
        : rawGradientAngle;

    const toCssRgba = (hex: string, alphaMul: number): string => {
      const [r, g, b, a] = hexToRgba(hex);
      const alpha = Math.max(0, Math.min(1, (a ?? 1) * alphaMul));
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha.toFixed(3)})`;
    };

    const inkOpacity = layers.ink.opacity ?? 1;
    const paperOpacity = layers.paper.opacity ?? 1;
    const paperColor = layers.paper.color || "#ffffff";
    const paperAlpha = (hexToRgba(paperColor)[3] ?? 1) * paperOpacity;
    const svgBgColor =
      layers.paper.enabled && paperAlpha > 0.001
        ? toCssRgba(paperColor, paperOpacity)
        : "transparent";
    const svgFgColor =
      layers.ink.enabled && inkOpacity > 0.001
        ? toCssRgba(layers.ink.color || "#000000", inkOpacity)
        : "transparent";
    const bgLayerOpacity = layers.bg.enabled ? (layers.bg.opacity ?? 1) : 0;
    const svgBaseColor = layers.bg.enabled
      ? toCssRgba(layers.bg.color || "#ffffff", bgLayerOpacity)
      : "transparent";

    return {
      fgColor: svgFgColor,
      bgColor: svgBgColor,
      baseColor: svgBaseColor,
      artImage: layers.bg.enabled ? layers.bg.image : undefined,
      artBoundsScale: layers.bg.boundsScale || 1.25,
      artOpacity: bgLayerOpacity,
      artFit: layers.bg.fit,
      artRotation: layers.bg.rotation,
      artScale: layers.bg.scale,
      artOffsetX: layers.bg.offsetX,
      artOffsetY: layers.bg.offsetY,
      artBlendMode: layers.bg.blendMode,
      paperImage: layers.paper.enabled ? layers.paper.image : undefined,
      paperBoundsScale: layers.paper.boundsScale || 1.1,
      paperOpacity: layers.paper.opacity ?? 1.0,
      paperFit: layers.paper.fit,
      paperRotation: layers.paper.rotation,
      paperScale: layers.paper.scale,
      paperOffsetX: layers.paper.offsetX,
      paperOffsetY: layers.paper.offsetY,
      inkImage: layers.ink.enabled ? layers.ink.image : undefined,
      inkOpacity: layers.ink.opacity ?? 1.0,
      inkFit: layers.ink.fit,
      inkRotation: layers.ink.rotation,
      inkScale: layers.ink.scale,
      inkOffsetX: layers.ink.offsetX,
      inkOffsetY: layers.ink.offsetY,
      gradientEnabled: gradientEnabled && !!svgGradientType,
      gradientType: svgGradientType,
      gradientColors: [
        toCssRgba(layers.ink.color || "#000000", inkOpacity),
        toCssRgba(gradientColor2, inkOpacity),
      ],
      gradientAngle: gradientAngle,
      bodyShape: state.config.bodyShape || "square",
      eyeFrameShape: state.config.eyeFrameShape || "square",
      eyeBallShape: state.config.eyeBallShape || "square",
      logo: layers.logo.enabled ? layers.logo.image : undefined,
      logoSize: state.config.logoSize || 0.2,
      logoOpacity: layers.logo.opacity ?? 1.0,
      logoFit: layers.logo.fit || state.config.logoFit || "contain",
      effectLiquid: layers.ink.liquid.enabled ?? false,
      effectBlur: layers.ink.liquid.blur ?? 0.35,
      effectCrystalize: layers.ink.liquid.thresh ?? 6,
      inkEnabled: layers.ink.enabled && (layers.ink.opacity ?? 1) > 0.001,
      ecc: state.config.ecc || "M",
      mask: state.config.mask,
    };
  }

  public updateUI(type: string, value: string) {
    document
      .querySelectorAll(`[data-${type}]`)
      .forEach((b) =>
        b.classList.toggle("active", (b as HTMLElement).dataset[type] === value)
      );
  }

  public async init() {
    if (!state.text) return;
    const ready = await initWasm();
    if (ready) (window as any).updateQR();
  }

  /**
   * Upload matrix data to WebGL
   */
  private async uploadMatrixToWebGL(_liquid: boolean): Promise<boolean> {
    if (!this.webglRenderer || !state.text) return false;

    if (this.webglReady) {
      const okInit = await this.webglReady;
      if (!okInit) return false;
    }

    try {
      console.log("uploadMatrixToWebGL: Importing WASM module...");
      console.log(
        "uploadMatrixToWebGL: Calling get_qr_matrix for:",
        state.text,
        state.config.ecc,
        state.config.mask
      );
      const maskVal =
        state.config.mask === undefined || state.config.mask === null
          ? -1
          : state.config.mask;
      const matrixData = await getQrMatrix(
        state.text,
        state.config.ecc || "M",
        maskVal
      );

      if (matrixData && matrixData.length > 1) {
        const size = matrixData[0];
        const data = new Uint8Array(size * size);
        for (let i = 0; i < size * size; i++) {
          data[i] = matrixData[i + 1] ? 255 : 0;
        }
        console.log(
          `uploadMatrixToWebGL: Matrix ${size}x${size}, ${data.length} bytes (normalized 0-255)`
        );
        this.lastMatrixSize = size;
        this.webglRenderer.setMatrix(data, size);

        this.updateWebGLPreview();
        return true;
      } else {
        console.warn("uploadMatrixToWebGL: Empty or invalid matrix data");
        return false;
      }
    } catch (e) {
      console.error("Failed to upload matrix to WebGL:", e);
      return false;
    }
  }

  public async renderQR() {
    this.updateQrFrameImage();

    if (!state.text) return;

    console.log("Rendering QR:", state.text);

    if (this.webglRenderer) {
      if (this.webglReady) {
        const okInit = await this.webglReady;
        if (!okInit) {
          this.webglRenderer = null;
          this.webglReady = null;
        }
      }
    }

    if (this.webglRenderer) {
      const layers = this.getLayers();
      const artUrl =
        layers.bg.enabled && layers.bg.image ? layers.bg.image : null;
      const logoUrl = layers.logo.enabled ? (layers.logo.image ?? null) : null;
      const paperUrl =
        layers.paper.enabled && layers.paper.image ? layers.paper.image : null;
      const inkUrl =
        layers.ink.enabled && layers.ink.image ? layers.ink.image : null;
      await this.webglRenderer.setArtImage(artUrl);
      await this.webglRenderer.setLogo(logoUrl);
      await this.webglRenderer.setPaperImage(paperUrl);
      await this.webglRenderer.setInkImage(inkUrl);
    }

    if (this.webglRenderer) {
      if (this.els.qr) this.els.qr.style.display = "flex";
      this.webglRenderer.setVisible(false);
      const ok = await this.uploadMatrixToWebGL(true);
      if (ok) {
        this.webglRenderer.setVisible(true);
        if (this.els.qr) this.els.qr.style.display = "none";
        this.updateQrFrameBackground();
        this.updateQrFrameImage();
        scanVerifier.debouncedVerify();
        return;
      }

      this.webglRenderer.setVisible(false);
    }

    if (this.els.qr) {
      this.els.qr.style.display = "flex";
    }
    this.updateQrFrameBackground();
    this.updateQrFrameImage();

    if (this.svgRenderer) {
      await this.svgRenderer.render(state.text, this.getSvgRenderConfig());
    }

    scanVerifier.debouncedVerify();
  }

  public generateQR(immediate: boolean = false) {
    console.log("QRController: generateQR called");
    const content = this.getContentData();
    console.log("QRController: content =", content);

    if (!content) {
      console.warn("QRController: No content data found");
      return;
    }
    state.text = content;
    if (this.els.canvas?.classList.contains("generating") || immediate) {
      this.els.canvas?.classList.add("generating");
      this.renderQR();
      scanVerifier.debouncedVerify();
    } else {
      this.els.canvas?.classList.add("generating");
      setTimeout(() => {
        this.renderQR();
        scanVerifier.debouncedVerify();
      }, 400);
    }
  }

  public debouncedAutoGenerate() {
    if (this.inputDebounceTimer) clearTimeout(this.inputDebounceTimer);
    this.inputDebounceTimer = setTimeout(() => {
      const content = this.getContentData();
      if (content) this.generateQR(true);
    }, 300);
  }

  public resetToZero() {
    state.text = "";
    Object.values(this.els).forEach((el) => {
      if (
        el &&
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      )
        el.value = "";
    });
    if (this.els.qr) this.els.qr.innerHTML = "";
    this.els.canvas?.classList.remove("generating");
    if ((window as any).setContentType) (window as any).setContentType("url");
    this.removeLogo();
  }

  public async copyQRToClipboard() {
    if (!state.text) return;

    const btn = document.getElementById("btn-copy") as HTMLButtonElement | null;
    if (this.copyInProgress || btn?.getAttribute("aria-busy") === "true") return;
    const clipboard = navigator.clipboard;
    const ClipboardItemCtor = (window as any).ClipboardItem;

    const setBusy = (busy: boolean) => {
      if (!btn) return;
      if (busy) btn.setAttribute("aria-busy", "true");
      else btn.removeAttribute("aria-busy");
    };
    const flashOk = () => {
      if (!btn) return;
      btn.classList.add("success");
      window.setTimeout(() => btn.classList.remove("success"), 650);
    };
    const pngPromise = this.getClipboardPngBlob(2048);
    pngPromise.catch(() => undefined);

    try {
      this.copyInProgress = true;
      setBusy(true);
      if (!clipboard?.write || typeof ClipboardItemCtor !== "function") {
        throw new Error("Image clipboard API is not available");
      } else {
        let clipboardItem: any;
        try {
          clipboardItem = new ClipboardItemCtor({ "image/png": pngPromise });
        } catch {
          clipboardItem = new ClipboardItemCtor({
            "image/png": await pngPromise,
          });
        }
        await clipboard.write([clipboardItem]);
      }

      console.log("✅ PNG copied to clipboard");
      toastCopyResult(true);
      flashOk();
    } catch (e) {
      console.error("Copy failed:", e);
      const blocked =
        e instanceof DOMException
          ? e.name === "NotAllowedError" || e.name === "SecurityError"
          : /NotAllowedError|SecurityError|permission/i.test(String(e));
      const png = await pngPromise.catch(() => null);

      if (blocked && png) {
        this.showCopyBlockedImageFallback(png);
        showToast(
          "Tu navegador bloqueo copiar la imagen. Abri el PNG generado.",
          {
            variant: "error",
            timeoutMs: 4200,
          },
        );
      } else {
        toastCopyResult(false);
      }
    } finally {
      setBusy(false);
      this.copyInProgress = false;
    }
  }

  private showCopyBlockedImageFallback(blob: Blob): void {
    const existing = document.getElementById("qr-copy-fallback-overlay");
    existing?.remove();

    const url = URL.createObjectURL(blob);
    const overlay = document.createElement("div");
    overlay.id = "qr-copy-fallback-overlay";
    overlay.setAttribute("role", "presentation");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:10000",
      "display:grid",
      "place-items:center",
      "padding:18px",
      "background:rgba(8,10,14,.62)",
      "backdrop-filter:blur(12px)",
      "-webkit-backdrop-filter:blur(12px)",
    ].join(";");

    const dialog = document.createElement("section");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "qr-copy-fallback-title");
    dialog.style.cssText = [
      "width:min(440px,100%)",
      "max-height:min(760px,calc(100vh - 36px))",
      "display:grid",
      "gap:14px",
      "overflow:auto",
      "border:1px solid rgba(255,255,255,.18)",
      "border-radius:14px",
      "padding:18px",
      "background:rgba(20,22,26,.96)",
      "color:#fff",
      "box-shadow:0 24px 80px rgba(0,0,0,.38)",
      "font:500 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
    ].join(";");

    const title = document.createElement("h2");
    title.id = "qr-copy-fallback-title";
    title.textContent = "Copia directa bloqueada";
    title.style.cssText = "margin:0;font-size:18px;line-height:1.2";

    const body = document.createElement("p");
    body.textContent =
      "El navegador nego copiar imagenes al portapapeles. Usa clic derecho sobre el QR para copiar la imagen, o descarga el PNG.";
    body.style.cssText = "margin:0;color:rgba(255,255,255,.72)";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "QR generado";
    img.style.cssText = [
      "width:100%",
      "aspect-ratio:1/1",
      "object-fit:contain",
      "border-radius:10px",
      "background:#fff",
      "display:block",
    ].join(";");

    const actions = document.createElement("div");
    actions.style.cssText =
      "display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap";

    const download = document.createElement("button");
    download.type = "button";
    download.textContent = "Descargar PNG";
    download.style.cssText = [
      "border:0",
      "border-radius:9px",
      "padding:10px 13px",
      "background:#fff",
      "color:#111",
      "font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
      "cursor:pointer",
    ].join(";");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Cerrar";
    closeButton.style.cssText = [
      "border:1px solid rgba(255,255,255,.2)",
      "border-radius:9px",
      "padding:10px 13px",
      "background:rgba(255,255,255,.08)",
      "color:#fff",
      "font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
      "cursor:pointer",
    ].join(";");

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      URL.revokeObjectURL(url);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    download.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = `holi-qr-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(download, closeButton);
    dialog.append(title, body, img, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    closeButton.focus();
  }

  private async getClipboardPngBlob(targetSize: number): Promise<Blob> {
    let blob = await this.getVisiblePreviewPngBlob(targetSize);
    if (!blob) blob = await this.getHighResSnapshot(targetSize);
    if (!blob) {
      const svg = await this.getSVGForExport();
      if (!svg) throw new Error("Failed to generate SVG for copy");
      const { exportPNG } = await import("./qr-engine");
      blob = await exportPNG(svg, targetSize);
    }

    const png = blob.type === "image/png" ? blob : new Blob([await blob.arrayBuffer()], { type: "image/png" });
    return await applyFrameToPng(png);
  }

  private async getVisiblePreviewPngBlob(targetSize: number): Promise<Blob | null> {
    const canvas = document.getElementById("liquid-canvas") as HTMLCanvasElement | null;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;
    if (canvas.style.display === "none") return null;

    if (canvas.width === targetSize && canvas.height === targetSize) {
      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
      });
    }

    const out = document.createElement("canvas");
    out.width = targetSize;
    out.height = targetSize;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
    return await new Promise<Blob | null>((resolve) => {
      out.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }

  /**
   * Generate SVG string for Export (Download/Copy)
   */
  public async getSVGForExport(): Promise<string> {
    if (!state.text || !this.svgRenderer) return "";
    return await this.svgRenderer.getSVG(state.text, this.getSvgRenderConfig());
  }

  /**
   * Capture high-resolution WebGL snapshot for export
   */
  async getHighResSnapshot(targetSize: number = 2048): Promise<Blob | null> {
    if (!this.webglRenderer || !state.text) {
      console.error("QRController: WebGL renderer not available for snapshot");
      return null;
    }

    if (this.webglReady) {
      const okInit = await this.webglReady;
      if (!okInit) {
        console.error("QRController: WebGL not ready for snapshot");
        return null;
      }
    }

    const okMatrix = await this.uploadMatrixToWebGL(true);
    if (!okMatrix) {
      console.error("QRController: Failed to upload QR matrix for snapshot");
      return null;
    }

    const config = this.getFullRenderConfig();

    await this.webglRenderer.setArtImage(config.artImage ?? null);
    await this.webglRenderer.setPaperImage(config.paperImage ?? null);
    await this.webglRenderer.setInkImage(config.inkImage ?? null);
    await this.webglRenderer.setLogo(config.logo ?? null);
    const ready = await this.webglRenderer.prepareForRender(config);
    if (!ready) {
      console.error("QRController: WebGL assets are not ready for snapshot");
      return null;
    }

    return await this.webglRenderer.captureHighRes(config, targetSize);
  }

  private getContentData(): string {
    const type = (window as any).currentContentType || "url";
    const strategy = strategies[type];
    return strategy ? strategy.getData(this.els) : "";
  }

  public async handleLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const logoUrl = e.target?.result as string;
      const layers = this.getLayers();
      layers.logo.image = logoUrl;
      layers.logo.enabled = true;
      syncLegacyFromLayers(state.config, layers);
      state.config.logoColor = "original";
      state.config.ecc = "H";
      this.updateUI("ecc", "H");
      if (!state.config.logoSize) state.config.logoSize = 0.2;

      if (this.webglRenderer) {
        await this.webglRenderer.setLogo(logoUrl);
      }

      this.updateLogoUI();
      this.generateQR(true);
    };
    reader.readAsDataURL(file);
  }

  private updateLogoUI() {
    const hasLogo = !!state.config.logo;
    const preview = document.getElementById("logo-preview");
    const placeholder = document.getElementById("logo-placeholder");
    const controls = document.getElementById("logo-controls");
    const img = document.getElementById("logo-img") as HTMLImageElement;

    if (hasLogo && preview && placeholder && controls && img) {
      preview.classList.remove("hidden");
      preview.style.display = "flex";
      placeholder.style.display = "none";
      controls.style.display = "flex";
      img.src = state.config.logo || "";
    } else if (!hasLogo && preview && placeholder && controls) {
      preview.classList.add("hidden");
      preview.style.display = "none";
      placeholder.style.display = "flex";
      controls.style.display = "none";
    }
  }

  public removeLogo() {
    const layers = this.getLayers();
    layers.logo.enabled = false;
    syncLegacyFromLayers(state.config, layers);
    state.config.logoColor = "original";
    const logoInput = document.getElementById(
      "logo-upload"
    ) as HTMLInputElement;
    if (logoInput) logoInput.value = "";
    this.updateLogoUI();
    this.generateQR(true);
  }

  /**
   * Inject brand logo for branded content types (youtube, facebook, etc.)
   */
  public async injectBrandLogo(type: string) {
    const brandedTypes = [
      "facebook",
      "twitter",
      "youtube",
      "bitcoin",
      "appstore",
      "playstore",
      "wifi",
    ];

    if (brandedTypes.includes(type)) {
      const logo = getTypeLogo(type);
      if (logo) {
        const layers = this.getLayers();
        layers.logo.image = logo;
        layers.logo.enabled = true;
        layers.logo.opacity = 1;
        layers.logo.fit = "contain";
        syncLegacyFromLayers(state.config, layers);
        state.config.ecc = "H";
        state.config.logoSize = state.config.logoSize || 0.2;
        state.config.logoColor = "original";
        state.config.logoFit = "contain";
        state.config.logoBgEnabled = true;
        state.config.logoBgColor = "#ffffff";
        state.config.logoBgShape = "rounded";
        state.config.logoPadding = 10;
        state.config.logoScale = 1;
        state.config.logoOffsetX = 0;
        state.config.logoOffsetY = 0;
        state.config.logoRotation = 0;
        this.updateUI("ecc", "H");

        if (this.webglRenderer) {
          await this.webglRenderer.setLogo(null);
          await this.webglRenderer.setLogo(logo);
        }

        this.updateLogoUI();
        console.log(`[QRController] Injected brand logo for: ${type}`);
      }
    } else {
      const currentLogo = state.config.logo;
      if (
        currentLogo &&
        brandedTypes.some((bt) => {
          const brandLogo = getTypeLogo(bt);
          return brandLogo && currentLogo === brandLogo;
        })
      ) {
        const layers = this.getLayers();
        layers.logo.enabled = false;
        syncLegacyFromLayers(state.config, layers);
        state.config.logoColor = "original";
        this.updateLogoUI();
        console.log(
          `[QRController] Cleared brand logo for non-branded type: ${type}`
        );
      }
    }
  }
}

// hexToRgb moved to ./utils/color.ts

export const qrController = QRController.getInstance();

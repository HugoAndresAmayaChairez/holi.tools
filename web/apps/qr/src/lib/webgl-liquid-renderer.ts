/**
 * WebGL 2 Liquid Preview Renderer
 * Provides <1ms gooey effect updates for real-time slider interaction.
 * Uses two-pass Gaussian blur + alpha threshold.
 *
 * MAGIC NUMBERS DOCUMENTATION:
 * - 19.0 in gooey shader: Alpha contrast multiplier for threshold-based shape blending.
 *   Lower (10-15) = softer edges, Higher (20-25) = sharper edges. 19.0 is balanced.
 * - 12.0 blur multiplier: Scales UI slider (0.05-1.4) to pixel blur radius.
 *   At 2048px canvas, blur 1.0 = 12px radius for visible liquid effect.
 * - Gaussian weights (0.0162, 0.0540, 0.1216, 0.1945, 0.2270): 9-tap kernel approximation
 *   of Gaussian distribution with sigma ~= 1.4. Weights sum to 1.0.
 */

import { VERTEX_SHADER } from "./shaders/vertex";
import { BLUR_SHADER } from "./shaders/blur";
import { GOOEY_SHADER } from "./shaders/gooey";
import { LOGO_SHADER } from "./shaders/logo";
import { SHAPE_SHADER } from "./shaders/shape";
import { COMPOSITE_SHADER } from "./shaders/composite";
import { MASK_SHADER } from "./shaders/mask";
import type { RenderConfig } from "./core/types";

// Extracted modules
import { createProgram, createTexture, createFBO } from "./webgl-setup";
import {
  setLogo as texSetLogo,
  setArtImage as texSetArtImage,
  setPaperImage as texSetPaperImage,
  setInkImage as texSetInkImage,
  ensureShapeMasks as texEnsureShapeMasks,
  loadShapeMasks as texLoadShapeMasks,
  type TextureState,
} from "./webgl-textures";

export type { RenderConfig };
export type WebGLLiquidConfig = RenderConfig; // Alias for compatibility with existing code

const LIQUID_BLUR_RADIUS = 12.0;

export class WebGLLiquidRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private initialized = false;

  // Programs
  private blurProgram: WebGLProgram | null = null;
  private gooeyProgram: WebGLProgram | null = null;
  private shapeProgram: WebGLProgram | null = null;
  private maskProgram: WebGLProgram | null = null;
  private logoProgram: WebGLProgram | null = null;
  private compositeProgram: WebGLProgram | null = null;

  // Buffers & Textures
  private quadVAO: WebGLVertexArrayObject | null = null;
  private matrixTexture: WebGLTexture | null = null;
  private pingTexture: WebGLTexture | null = null; // Intermediate
  private pongTexture: WebGLTexture | null = null; // Intermediate
  private pingFBO: WebGLFramebuffer | null = null;
  private pongFBO: WebGLFramebuffer | null = null;

  // Mask (matrix-based) ping-pong for complement cutout
  private maskPingTexture: WebGLTexture | null = null;
  private maskPongTexture: WebGLTexture | null = null;
  private maskPingFBO: WebGLFramebuffer | null = null;
  private maskPongFBO: WebGLFramebuffer | null = null;

  // State
  private matrixSize = 0;
  private canvasSize = 2048; // High-res canvas for perfect export match

  // 1x1 transparent texture to satisfy samplers when art is disabled
  private blankTexture: WebGLTexture | null = null;

  private lastRenderConfig: RenderConfig | null = null;

  // Texture state (delegated to webgl-textures.ts)
  private texState: TextureState | null = null;

  constructor(private containerId: string) {}

  /** Lazily build the TextureState once gl is available. */
  private getTexState(): TextureState {
    if (!this.texState) {
      this.texState = {
        gl: this.gl!,
        logoTexture: null,
        currentLogoUrl: null,
        logoAspect: 1.0,
        artTexture: null,
        currentArtUrl: null,
        artAspect: 1.0,
        paperTexture: null,
        currentPaperUrl: null,
        paperAspect: 1.0,
        inkTexture: null,
        currentInkUrl: null,
        inkAspect: 1.0,
        bodyMaskAtlasTexture: null,
        eyeMaskTexture: null,
        bodyMaskAtlasKey: null,
        eyeMaskKey: null,
        maskLoadPromise: null,
        maskReadyRerenderScheduled: false,
        bodyAtlasTileSize: 64,
        eyeMaskTileSize: 512,
      };
    }
    return this.texState;
  }

  /**
   * Initialize WebGL 2 context and compile shaders
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    // Create canvas
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error("WebGLLiquidRenderer: Container not found");
      return false;
    }

    this.canvas = document.createElement("canvas");
    this.canvas.id = "liquid-canvas";
    this.canvas.className = "liquid-overlay";
    this.canvas.width = this.canvasSize; // Native: 2048px
    this.canvas.height = this.canvasSize;

    // CSS: Display at 100% of container (usually 512px), GPU scales automatically
    this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: none;
            z-index: 10;
            background: transparent;
            image-rendering: auto;
            border-radius: 0;
        `;
    container.appendChild(this.canvas);
    console.log(
      `🎮 WebGL Canvas: Native ${this.canvasSize}px, Display scaled to container`
    );

    // Get WebGL 2 context
    this.gl = this.canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: true, // Required for canvas readback (jsQR verification)
    });

    if (!this.gl) {
      console.error("WebGLLiquidRenderer: WebGL 2 not supported");
      return false;
    }

    const gl = this.gl;

    // Compile shaders (delegated to webgl-setup.ts)
    this.blurProgram = createProgram(gl, VERTEX_SHADER, BLUR_SHADER);
    this.gooeyProgram = createProgram(gl, VERTEX_SHADER, GOOEY_SHADER);
    this.logoProgram = createProgram(gl, VERTEX_SHADER, LOGO_SHADER);
    this.shapeProgram = createProgram(gl, VERTEX_SHADER, SHAPE_SHADER);
    this.maskProgram = createProgram(gl, VERTEX_SHADER, MASK_SHADER);
    this.compositeProgram = createProgram(gl, VERTEX_SHADER, COMPOSITE_SHADER);

    if (
      !this.blurProgram ||
      !this.gooeyProgram ||
      !this.shapeProgram ||
      !this.maskProgram ||
      !this.logoProgram ||
      !this.compositeProgram
    ) {
      console.error("WebGLLiquidRenderer: Shader compilation failed");
      return false;
    }

    // Create fullscreen quad VAO
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    // Create ping-pong textures and FBOs (delegated to webgl-setup.ts)
    this.pingTexture = createTexture(gl, this.canvasSize, true);
    this.pongTexture = createTexture(gl, this.canvasSize, true);
    this.pingFBO = createFBO(gl, this.pingTexture!);
    this.pongFBO = createFBO(gl, this.pongTexture!);

    // Mask ping-pong
    this.maskPingTexture = createTexture(gl, this.canvasSize, true);
    this.maskPongTexture = createTexture(gl, this.canvasSize, true);
    this.maskPingFBO = createFBO(gl, this.maskPingTexture!);
    this.maskPongFBO = createFBO(gl, this.maskPongTexture!);

    // Matrix texture (R8 for optimal 1-byte storage)
    this.matrixTexture = createTexture(gl, 256, false); // Max QR size

    // Create blank texture (1x1 transparent)
    this.blankTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.blankTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.initialized = true;
    console.log("🎮 WebGL 2 Liquid Renderer Initialized");
    return true;
  }

  /**
   * Set QR matrix data from WASM
   */
  setMatrix(data: Uint8Array, size: number) {
    if (!this.gl || !this.matrixTexture) {
      console.error("WebGL setMatrix: GL or texture not ready");
      return;
    }

    const gl = this.gl;
    this.matrixSize = size;

    // Convert 0/1 data to 0/255 for correct normalized texture sampling
    const pixelData = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      pixelData[i] = data[i] ? 255 : 0;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.matrixTexture);
    // CRITICAL: Set unpack alignment to 1 because QR data (e.g. 21px) is not 4-byte aligned
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      size,
      size,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      pixelData
    );
  }

  // ─── Image texture delegates (via webgl-textures.ts) ─────────

  async setLogo(logoUrl: string | null): Promise<void> {
    if (!this.gl) return;
    await texSetLogo(this.getTexState(), logoUrl);
  }

  async setArtImage(artUrl: string | null): Promise<void> {
    if (!this.gl) return;
    await texSetArtImage(this.getTexState(), artUrl);
  }

  async setPaperImage(paperUrl: string | null): Promise<void> {
    if (!this.gl) return;
    await texSetPaperImage(this.getTexState(), paperUrl);
  }

  async setInkImage(inkUrl: string | null): Promise<void> {
    if (!this.gl) return;
    await texSetInkImage(this.getTexState(), inkUrl);
  }

  async prepareForRender(config: RenderConfig): Promise<boolean> {
    if (!this.gl || !this.initialized) return false;
    const ts = this.getTexState();
    if (ts.maskLoadPromise) await ts.maskLoadPromise;
    if (config.bodyShapeKey && config.eyeFrameShapeKey && config.eyeBallShapeKey) {
      await texLoadShapeMasks(
        ts,
        config.bodyShapeKey,
        config.eyeFrameShapeKey,
        config.eyeBallShapeKey
      );
    }
    return !!ts.bodyMaskAtlasTexture && !!ts.eyeMaskTexture;
  }

  isVisible(): boolean {
    return !!this.canvas && this.canvas.style.display !== "none";
  }

  /**
   * Render logo overlay on top of QR
   */
  private renderLogo(config: RenderConfig) {
    const ts = this.getTexState();
    if (!this.gl || !ts.logoTexture || !this.logoProgram) return;

    const gl = this.gl;
    const logoSize = config.logoSize || 0.2;

    gl.useProgram(this.logoProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ts.logoTexture);
    gl.uniform1i(gl.getUniformLocation(this.logoProgram, "uLogo"), 0);

    // Logo Styling Uniforms
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uBgEnabled"),
      config.logoBgEnabled ? 1.0 : 0.0
    );
    gl.uniform3fv(
      gl.getUniformLocation(this.logoProgram, "uBgColor"),
      config.logoBgColor || [1, 1, 1]
    );

    let shape = 0;
    if (config.logoBgShape === "circle") shape = 1;
    else if (config.logoBgShape === "rounded") shape = 2;
    gl.uniform1i(gl.getUniformLocation(this.logoProgram, "uShape"), shape);

    const radius = (config.logoCornerRadius || 0) / 100.0;
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uCornerRadius"),
      radius
    );

    const padding = (config.logoPadding || 0) / 100.0;
    gl.uniform1f(gl.getUniformLocation(this.logoProgram, "uPadding"), padding);

    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uOpacity"),
      Math.max(0.0, Math.min(1.0, config.logoOpacity ?? 1.0))
    );

    // Transform Uniforms
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uLogoRotation"),
      config.logoRotation || 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uLogoScale"),
      config.logoScale ?? 1.0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uLogoOffsetX"),
      config.logoOffsetX || 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uLogoOffsetY"),
      config.logoOffsetY || 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.logoProgram, "uLogoAspect"),
      ts.logoAspect || 1.0
    );
    let logoFitMode = 1;
    if (config.logoFit === "cover") logoFitMode = 0;
    else if (config.logoFit === "fill") logoFitMode = 2;
    gl.uniform1i(
      gl.getUniformLocation(this.logoProgram, "uLogoFitMode"),
      logoFitMode
    );

    const fullSize = this.canvasSize;

    const logoPixels = Math.floor(fullSize * logoSize);
    const logoX = Math.floor((fullSize - logoPixels) / 2);
    const logoY = Math.floor((fullSize - logoPixels) / 2);

    gl.viewport(logoX, logoY, logoPixels, logoPixels);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.viewport(0, 0, fullSize, fullSize);
    gl.disable(gl.BLEND);
  }

  /**
   * Render Pipeline
   */
  render(config: RenderConfig) {
    if (!this.gl || !this.initialized) return;
    this.lastRenderConfig = config;

    const gl = this.gl;
    const size = this.canvasSize;
    const ts = this.getTexState();

    // Ensure Rust/WASM shape masks are ready (delegated to webgl-textures.ts)
    texEnsureShapeMasks(
      ts,
      config,
      (cfg) => this.render(cfg),
      this.lastRenderConfig,
      this.initialized
    );
    if (!ts.bodyMaskAtlasTexture || !ts.eyeMaskTexture) {
      return;
    }

    // 1. Setup State
    gl.clearColor(0, 0, 0, 0);
    gl.bindVertexArray(this.quadVAO);

    // 2. Decide Pipeline
    const baseA = config.bgBaseColor?.[3] ?? 0;
    const hasBase = baseA > 0.001;
    const hasArt = !!(config.artImage && ts.artTexture);
    const hasBlur = config.blur > 0;
    const complementAlpha = config.qrBgColor?.[3] ?? 0;
    const hasComplement = complementAlpha > 0.001;
    const hasPaperTexture = !!(config.paperImage && ts.paperTexture);
    const hasInkTexture = !!(config.inkImage && ts.inkTexture);

    const win = window as any;
    const readBool = (...keys: string[]) => keys.some((k) => !!win[k]);
    const readValue = <T>(...keys: string[]): T | undefined => {
      for (const k of keys) {
        if (win[k] !== undefined) return win[k] as T;
      }
      return undefined;
    };

    const dbgView = readValue<"mask" | "ink" | "under" | "final">(
      "__qrDebugView",
      "_qrDebugView"
    );
    const dbgMode =
      dbgView === "mask"
        ? 1
        : dbgView === "ink"
          ? 2
          : dbgView === "under"
            ? 3
            : 0;
    const forceCompositeForDebug = dbgMode !== 0;

    const dbgReadback = readBool("__qrDebugReadback", "_qrDebugReadback");

    const dbg = readBool(
      "__qrDebugLayers",
      "_qrDebugLayers",
      "__qrDebugLaters",
      "_qrDebugLaters"
    );
    if (dbg) {
      console.debug("[WebGL render]", {
        fg: config.color,
        bg: config.qrBgColor,
        dbgView,
        dbgMode,
        base: config.bgBaseColor,
        inkImage: config.inkImage,
        paperImage: config.paperImage,
        hasComplement,
        hasPaperTexture,
        hasInkTexture,
        hasArt,
        hasBlur,
      });
    }

    const needsComposite =
      forceCompositeForDebug ||
      hasBase ||
      hasArt ||
      hasComplement ||
      hasPaperTexture ||
      hasInkTexture ||
      hasBlur;
    const renderToFBO = needsComposite;

    gl.bindFramebuffer(gl.FRAMEBUFFER, renderToFBO ? this.pingFBO : null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, size, size);

    // --- PHASE A: Render QR Ink (Shapes) ---

    gl.useProgram(this.shapeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.matrixTexture);
    gl.uniform1i(gl.getUniformLocation(this.shapeProgram!, "uTexture"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, ts.bodyMaskAtlasTexture);
    gl.uniform1i(
      gl.getUniformLocation(this.shapeProgram!, "uBodyMaskAtlas"),
      1
    );
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, ts.eyeMaskTexture);
    gl.uniform1i(gl.getUniformLocation(this.shapeProgram!, "uEyeMask"), 2);
    gl.uniform4fv(
      gl.getUniformLocation(this.shapeProgram!, "uColor"),
      config.color
    );
    gl.uniform1i(
      gl.getUniformLocation(this.shapeProgram!, "uQRSize"),
      config.qrSize || this.matrixSize
    );

    // Gradient & Noise Uniforms
    gl.uniform4fv(
      gl.getUniformLocation(this.shapeProgram!, "uColor2"),
      config.gradientColor2 || [0, 0, 0, 1]
    );
    gl.uniform1i(
      gl.getUniformLocation(this.shapeProgram!, "uGradientType"),
      config.gradientType || 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.shapeProgram!, "uGradientAngle"),
      config.gradientAngle || 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.shapeProgram!, "uNoiseAmount"),
      config.noiseAmount || 0
    );
    gl.uniform1f(
      gl.getUniformLocation(this.shapeProgram!, "uNoiseScale"),
      config.noiseScale || 100
    );

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);

    // --- PHASE B: Render Module Mask ---
    const needsMask = hasComplement || dbgMode === 1;
    if (needsMask) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskPingFBO);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.viewport(0, 0, size, size);

      gl.useProgram(this.maskProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.matrixTexture);
      gl.uniform1i(gl.getUniformLocation(this.maskProgram!, "uTexture"), 0);
      gl.uniform1i(
        gl.getUniformLocation(this.maskProgram!, "uQRSize"),
        config.qrSize || this.matrixSize
      );

      gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (dbgReadback) {
        const paddingModules = 4.0;
        const totalModules =
          (config.qrSize || this.matrixSize) + paddingModules * 2.0;
        const padFrac = paddingModules / totalModules;
        const padPx = Math.floor(size * padFrac);

        const w = Math.min(256, size);
        const h = Math.min(256, size);
        const x = Math.min(Math.max(padPx, 0), Math.max(size - w, 0));
        const y = Math.min(Math.max(padPx, 0), Math.max(size - h, 0));
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let minA = 255;
        let maxA = 0;
        let sumA = 0;
        let nonZero = 0;
        let full = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          const a = pixels[i];
          if (a < minA) minA = a;
          if (a > maxA) maxA = a;
          sumA += a;
          if (a > 0) nonZero += 1;
          if (a === 255) full += 1;
        }
        const meanA = sumA / (w * h);
        const total = w * h;
        console.log("[WebGL mask stats]", {
          sample: `${w}x${h}@${x},${y}`,
          padPx,
          minA,
          maxA,
          meanA: Math.round(meanA),
          nonZeroPct: Math.round((nonZero / total) * 100),
          fullPct: Math.round((full / total) * 100),
        });
      }

      if (dbg) {
        const err = gl.getError();
        if (err !== gl.NO_ERROR) {
          console.warn("[WebGL] gl.getError after mask pass", err);
        }
      }
    }

    // --- PHASE C: Liquid Effects (Blur/Gooey) ---
    if (hasBlur) {
      // 1. PingFBO -> PongFBO (Blur H)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pongFBO);
      gl.useProgram(this.blurProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pingTexture);
      gl.uniform1i(gl.getUniformLocation(this.blurProgram!, "uTexture"), 0);
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram!, "uDirection"),
        1.0,
        0.0
      );
      gl.uniform1f(
        gl.getUniformLocation(this.blurProgram!, "uBlur"),
        config.blur * LIQUID_BLUR_RADIUS
      );
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram!, "uResolution"),
        size,
        size
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // 2. PongFBO -> PingFBO (Blur V)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingFBO);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pongTexture);
      gl.uniform2f(
        gl.getUniformLocation(this.blurProgram!, "uDirection"),
        0.0,
        1.0
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // 3. PingFBO -> PongFBO (Gooey Threshold)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pongFBO);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.gooeyProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pingTexture);
      gl.uniform1i(gl.getUniformLocation(this.gooeyProgram!, "uTexture"), 0);
      gl.uniform1i(gl.getUniformLocation(this.gooeyProgram!, "uTexture"), 0);
      gl.uniform1f(
        gl.getUniformLocation(this.gooeyProgram!, "uThreshold"),
        config.threshold
      );
      gl.uniform4fv(
        gl.getUniformLocation(this.gooeyProgram!, "uColor"),
        config.color
      );
      gl.uniform4fv(
        gl.getUniformLocation(this.gooeyProgram!, "uColor2"),
        config.gradientColor2 || [0, 0, 0, 1]
      );
      gl.uniform1i(
        gl.getUniformLocation(this.gooeyProgram!, "uGradientType"),
        config.gradientType || 0
      );
      gl.uniform1f(
        gl.getUniformLocation(this.gooeyProgram!, "uGradientAngle"),
        config.gradientAngle || 0
      );

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disable(gl.BLEND);

      // Apply blur/gooey to module mask if complement is enabled
      if (hasComplement) {
        // 1) MaskPing -> MaskPong (Blur H)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskPongFBO);
        gl.useProgram(this.blurProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.maskPingTexture);
        gl.uniform1i(gl.getUniformLocation(this.blurProgram!, "uTexture"), 0);
        gl.uniform2f(
          gl.getUniformLocation(this.blurProgram!, "uDirection"),
          1.0,
          0.0
        );
        gl.uniform1f(
          gl.getUniformLocation(this.blurProgram!, "uBlur"),
          config.blur * LIQUID_BLUR_RADIUS
        );
        gl.uniform2f(
          gl.getUniformLocation(this.blurProgram!, "uResolution"),
          size,
          size
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2) MaskPong -> MaskPing (Blur V)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskPingFBO);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.maskPongTexture);
        gl.uniform2f(
          gl.getUniformLocation(this.blurProgram!, "uDirection"),
          0.0,
          1.0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 3) MaskPing -> MaskPong (Gooey Threshold)
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.maskPongFBO);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.gooeyProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.maskPingTexture);
        gl.uniform1i(gl.getUniformLocation(this.gooeyProgram!, "uTexture"), 0);
        gl.uniform1f(
          gl.getUniformLocation(this.gooeyProgram!, "uThreshold"),
          config.threshold
        );
        gl.uniform4fv(
          gl.getUniformLocation(this.gooeyProgram!, "uColor"),
          [1, 1, 1, 1]
        );
        gl.uniform4fv(
          gl.getUniformLocation(this.gooeyProgram!, "uColor2"),
          [1, 1, 1, 1]
        );
        gl.uniform1i(
          gl.getUniformLocation(this.gooeyProgram!, "uGradientType"),
          0
        );
        gl.uniform1f(
          gl.getUniformLocation(this.gooeyProgram!, "uGradientAngle"),
          0.0
        );
        gl.uniform1f(
          gl.getUniformLocation(this.gooeyProgram!, "uNoiseAmount"),
          0.0
        );
        gl.uniform1f(
          gl.getUniformLocation(this.gooeyProgram!, "uNoiseScale"),
          0.0
        );

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disable(gl.BLEND);
      }
    } else if (hasArt) {
      // If no blur but we have Art, PING has result.
    }

    // --- PHASE D: Final Composite (BG + Paper + Ink) ---
    if (needsComposite) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.compositeProgram);

      // Bind QR Texture (Ink)
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(
        gl.TEXTURE_2D,
        hasBlur ? this.pongTexture : this.pingTexture
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uQRTexture"),
        0
      );

      // Bind Mask Texture
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(
        gl.TEXTURE_2D,
        needsMask
          ? hasBlur
            ? this.maskPongTexture
            : this.maskPingTexture
          : this.blankTexture
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uMaskTexture"),
        3
      );

      // Bind Art Texture
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, hasArt ? ts.artTexture : this.blankTexture);
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uArtTexture"),
        1
      );

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(
        gl.TEXTURE_2D,
        hasPaperTexture ? ts.paperTexture : this.blankTexture
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uPaperTexture"),
        2
      );

      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(
        gl.TEXTURE_2D,
        hasInkTexture ? ts.inkTexture : this.blankTexture
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uInkTexture"),
        4
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uQRSize"),
        config.qrSize
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uEyeFrameShape"),
        config.eyeFrameShape
      );
      const baseColor = (config.bgBaseColor || [0, 0, 0, 0]) as [
        number,
        number,
        number,
        number,
      ];
      const paperColor = (config.qrBgColor || [0, 0, 0, 0]) as [
        number,
        number,
        number,
        number,
      ];
      const hasDistinctBase =
        (baseColor[3] ?? 0) > 0.001 &&
        (Math.abs(baseColor[0] - paperColor[0]) > 0.01 ||
          Math.abs(baseColor[1] - paperColor[1]) > 0.01 ||
          Math.abs(baseColor[2] - paperColor[2]) > 0.01);
      gl.uniform1f(
        gl.getUniformLocation(
          this.compositeProgram!,
          "uFinderCornerCutoutEnabled"
        ),
        hasArt || hasDistinctBase ? 1.0 : 0.0
      );

      // BG base color
      gl.uniform4fv(
        gl.getUniformLocation(this.compositeProgram!, "uBaseColor"),
        baseColor
      );

      // Paper/complement color
      gl.uniform4fv(
        gl.getUniformLocation(this.compositeProgram!, "uPaperColor"),
        paperColor
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uPaperTexEnabled"),
        hasPaperTexture ? 1.0 : 0.0
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uPaperBoundsScale"),
        config.paperBoundsScale || 1.1
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uPaperAspect"),
        ts.paperAspect
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uPaperFitMode"),
        0
      );
      const paperRotRad = ((config.paperRotation || 0) * Math.PI) / 180;
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uPaperRotation"),
        paperRotRad
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uPaperScale"),
        config.paperScale || 1.0
      );
      gl.uniform2f(
        gl.getUniformLocation(this.compositeProgram!, "uPaperOffset"),
        config.paperOffsetX || 0,
        config.paperOffsetY || 0
      );

      // Ink texture override
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uInkTexEnabled"),
        hasInkTexture ? 1.0 : 0.0
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uInkAspect"),
        ts.inkAspect
      );
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uInkFitMode"),
        0
      );
      const inkRotRad = ((config.inkRotation || 0) * Math.PI) / 180;
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uInkRotation"),
        inkRotRad
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uInkScale"),
        config.inkScale || 1.0
      );
      gl.uniform2f(
        gl.getUniformLocation(this.compositeProgram!, "uInkOffset"),
        config.inkOffsetX || 0,
        config.inkOffsetY || 0
      );

      // Ink enabled
      const inkEnabled = config.inkEnabled ?? (config.color?.[3] ?? 1) > 0.001;
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uInkEnabled"),
        inkEnabled ? 1.0 : 0.0
      );

      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uDebugMode"),
        dbgMode
      );

      // Background (art) uniforms
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uOpacity"),
        hasArt ? (config.artOpacity ?? 1.0) : 0.0
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uArtBoundsScale"),
        config.artBoundsScale || 1.25
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uArtAspect"),
        ts.artAspect
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uContainerAspect"),
        1.0
      );

      // Map blend mode string to int
      let blendMode = 0;
      const mode = config.artBlendMode || "normal";
      if (mode === "multiply") blendMode = 1;
      else if (mode === "overlay") blendMode = 2;
      else if (mode === "screen") blendMode = 3;
      else if (mode === "darken") blendMode = 4;
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uBlendMode"),
        blendMode
      );

      // Map fit mode
      let fitMode = 0;
      if (config.artFit === "contain") fitMode = 1;
      else if (config.artFit === "fill") fitMode = 2;
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uFitMode"),
        fitMode
      );

      // Map paper fit mode
      let paperFitMode = 0;
      if (config.paperFit === "contain") paperFitMode = 1;
      else if (config.paperFit === "fill") paperFitMode = 2;
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uPaperFitMode"),
        paperFitMode
      );

      // Map ink fit mode
      let inkFitMode = 0;
      if (config.inkFit === "contain") inkFitMode = 1;
      else if (config.inkFit === "fill") inkFitMode = 2;
      gl.uniform1i(
        gl.getUniformLocation(this.compositeProgram!, "uInkFitMode"),
        inkFitMode
      );

      // Transform uniforms
      const rotationRad = ((config.artRotation || 0) * Math.PI) / 180;
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uArtRotation"),
        rotationRad
      );
      gl.uniform1f(
        gl.getUniformLocation(this.compositeProgram!, "uArtScale"),
        config.artScale || 1.0
      );
      gl.uniform2f(
        gl.getUniformLocation(this.compositeProgram!, "uArtOffset"),
        config.artOffsetX || 0,
        config.artOffsetY || 0
      );

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disable(gl.BLEND);
    }

    // --- PHASE E: Render Icon (On Top) ---
    if (config.logo && ts.logoTexture && (config.logoOpacity ?? 1.0) > 0.001) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.renderLogo(config);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Show/hide the WebGL canvas
   */
  setVisible(visible: boolean) {
    if (this.canvas) {
      this.canvas.style.display = visible ? "block" : "none";
    }
  }

  /**
   * Capture high-resolution snapshot for export
   */
  async captureHighRes(
    config: RenderConfig,
    targetSize: number = 2048
  ): Promise<Blob | null> {
    if (!this.gl || !this.canvas || !this.initialized) {
      console.error("WebGL captureHighRes: Not initialized");
      return null;
    }

    const safeTarget =
      Number.isFinite(targetSize) && targetSize > 0
        ? Math.round(targetSize)
        : this.canvasSize;
    console.log(
      `📸 WebGL Capture: Rendering at ${this.canvasSize}px before capture...`
    );

    // CRITICAL: Render immediately before capture to fill buffer
    this.render(config);

    // Ensure all WebGL commands are finished before capturing
    this.gl.finish();

    // Capture the freshly rendered canvas
    let blob: Blob | null = null;
    if (safeTarget === this.canvasSize) {
      blob = await new Promise<Blob | null>((resolve) => {
        this.canvas!.toBlob((b) => resolve(b), "image/png", 1.0);
      });
    } else {
      const out = document.createElement("canvas");
      out.width = safeTarget;
      out.height = safeTarget;
      const ctx = out.getContext("2d");
      if (!ctx) {
        console.error("WebGL captureHighRes: Canvas context not available");
        return null;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(this.canvas, 0, 0, safeTarget, safeTarget);
      blob = await new Promise<Blob | null>((resolve) => {
        out.toBlob((b) => resolve(b), "image/png", 1.0);
      });
    }

    console.log(
      `✅ WebGL Capture: ${blob ? "Success" : "Failed"} (${blob?.size || 0} bytes)`
    );
    return blob;
  }
}

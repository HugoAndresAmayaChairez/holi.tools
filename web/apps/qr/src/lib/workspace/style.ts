/**
 * style.ts — the portable "style" of a QR: colours, shapes, layer settings,
 * effects and the text frame, without content or images.
 *
 * One serialised shape feeds three features:
 *  - saved styles (localStorage) with JSON import/export,
 *  - style links (URL fragment, never sent to a server),
 *  - "reset style".
 */
import { state } from "../qr-engine";
import { createDefaultLayersConfig, type QRLayersConfig } from "../core/layers";
import { getFrameState, setFrameState, DEFAULT_FRAME } from "./frame";

import {STYLE_VERSION, stripImages, deepMerge, toBase64Url, fromBase64Url, isQrStyle, type QrStyle} from '@holi/engine-qr/style';
export {STYLE_VERSION, defaultStyle, isQrStyle, type QrStyle} from '@holi/engine-qr/style';
type AnyRecord = Record<string, unknown>;
function getController(): any {
  return (window as any).qrController;
}

function currentLayers(): QRLayersConfig {
  const ctrl = getController();
  return ctrl?.getLayers?.() ?? createDefaultLayersConfig();
}

/** Snapshot the current style. */
export function serializeStyle(name?: string): QrStyle {
  const c: AnyRecord = state.config as AnyRecord;
  const layers = stripImages(currentLayers()) as AnyRecord;
  delete layers.card;
  return {
    v: STYLE_VERSION,
    app: "holi-qr",
    ...(name ? { name } : {}),
    config: {
      bodyShape: String(c.bodyShape || "square"),
      eyeFrameShape: String(c.eyeFrameShape || "square"),
      eyeBallShape: String(c.eyeBallShape || "square"),
      ecc: (c.ecc as QrStyle["config"]["ecc"]) || "M",
      ...(typeof c.mask === "number" ? { mask: c.mask } : {}),
      logoSize: typeof c.logoSize === "number" ? c.logoSize : 0.2,
      logoBgEnabled: c.logoBgEnabled !== false,
      logoBgColor: typeof c.logoBgColor === "string" ? c.logoBgColor : "#ffffff",
      logoBgShape: typeof c.logoBgShape === "string" ? c.logoBgShape : "rounded",
      logoPadding: typeof c.logoPadding === "number" ? c.logoPadding : 0,
      logoCornerRadius: typeof c.logoCornerRadius === "number" ? c.logoCornerRadius : 10,
    },
    layers: layers as QrStyle["layers"],
    frame: { ...getFrameState() },
  };
}

function setInputValue(id: string, value: string | number): void {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (el) el.value = String(value);
}

function radToDeg(rad: number): number {
  const deg = Math.round((rad * 180) / Math.PI);
  return ((deg % 360) + 360) % 360;
}

/**
 * Apply a style to the live editor and mirror it in the panels' UI.
 * Images currently loaded (logo, textures) are kept.
 */
export function applyStyle(style: QrStyle): void {
  const w = window as any;
  const ctrl = getController();
  const layers = currentLayers();
  const c = state.config as AnyRecord;

  // 1. Layers (colours, effects, layer geometry)
  deepMerge(layers as unknown as AnyRecord, style.layers as unknown as AnyRecord);
  ctrl?.syncLayers?.(layers);

  // 2. Config fields
  Object.assign(c, {
    bodyShape: style.config.bodyShape,
    eyeFrameShape: style.config.eyeFrameShape,
    eyeBallShape: style.config.eyeBallShape,
    ecc: style.config.ecc,
    mask: style.config.mask,
    logoSize: style.config.logoSize ?? c.logoSize,
    logoBgEnabled: style.config.logoBgEnabled ?? c.logoBgEnabled,
    logoBgColor: style.config.logoBgColor ?? c.logoBgColor,
    logoBgShape: style.config.logoBgShape ?? c.logoBgShape,
    logoPadding: style.config.logoPadding ?? c.logoPadding,
    logoCornerRadius: style.config.logoCornerRadius ?? c.logoCornerRadius,
  });
  c.fg = layers.ink.color;
  c.bg = layers.paper.enabled ? layers.paper.color : "transparent";

  // 3. Panel UI sync
  setInputValue("color-fg", layers.ink.color);
  setInputValue("color-bg", layers.paper.color);
  ctrl?.updateUI?.("bodyshape", style.config.bodyShape);
  ctrl?.updateUI?.("eyeframe", style.config.eyeFrameShape);
  ctrl?.updateUI?.("eyeball", style.config.eyeBallShape);
  setInputValue("ecc-select", style.config.ecc);
  setInputValue("mask-select", typeof style.config.mask === "number" ? style.config.mask : "auto");

  // Gradient (type select + colour + angle in degrees)
  const g = layers.ink.gradient;
  setInputValue("gradient-type", g.type || 0);
  setInputValue("gradient-color-2", g.color2 || layers.ink.color);
  setInputValue("gradient-angle", radToDeg(g.angle || 0));
  w.updateGradient?.();

  // Liquid + noise toggles (EffectPanel keeps its own mirror state)
  const liquid = layers.ink.liquid;
  if (liquid.enabled) w.applyLiquidPreset?.(liquid.blur, liquid.thresh);
  else if (w.toggleLiquid) {
    const toggle = document.getElementById("effect-liquid-toggle") as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
    w.toggleLiquid(false);
  }
  const noise = layers.ink.noise;
  const noiseToggle = document.getElementById("effect-noise-toggle") as HTMLInputElement | null;
  if (noiseToggle) noiseToggle.checked = !!noise.enabled;
  setInputValue("noise-amount", Math.round((noise.amount ?? 0.3) * 100));
  setInputValue("noise-scale", noise.scale ?? 100);
  w.updateNoiseParam?.("amount", Math.round((noise.amount ?? 0.3) * 100));
  w.updateNoiseParam?.("scale", noise.scale ?? 100);
  w.toggleNoise?.(!!noise.enabled);

  // 4. Frame
  setFrameState(style.frame ?? DEFAULT_FRAME);

  // 5. Re-render (ECC/mask need a fresh matrix)
  if (state.text) ctrl?.generateQR?.(true);
  else w.updateQR?.();

  window.dispatchEvent(new CustomEvent("qr-style-applied", { detail: style }));
}

// ---------------------------------------------------------------------------
// Saved styles (browser-local)
// ---------------------------------------------------------------------------
const PRESETS_KEY = "holi-qr:styles:v1";

export interface SavedStyle {
  id: string;
  name: string;
  savedAt: string;
  style: QrStyle;
}

export function loadSavedStyles(): SavedStyle[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.id === "string" && isQrStyle(p.style));
  } catch {
    return [];
  }
}

function persist(list: SavedStyle[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    // Private mode / quota: styles simply do not persist.
  }
}

export function saveStyle(name: string): SavedStyle {
  const list = loadSavedStyles();
  const entry: SavedStyle = {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || `Style ${list.length + 1}`,
    savedAt: new Date().toISOString(),
    style: serializeStyle(name.trim()),
  };
  list.unshift(entry);
  persist(list.slice(0, 40));
  return entry;
}

export function deleteStyle(id: string): void {
  persist(loadSavedStyles().filter((s) => s.id !== id));
}

export function addImportedStyle(style: QrStyle): SavedStyle {
  const list = loadSavedStyles();
  const entry: SavedStyle = {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: style.name?.trim() || `Style ${list.length + 1}`,
    savedAt: new Date().toISOString(),
    style,
  };
  list.unshift(entry);
  persist(list.slice(0, 40));
  return entry;
}

// ---------------------------------------------------------------------------
// Style links (URL fragment)
// ---------------------------------------------------------------------------
const HASH_KEY = "s";

/** Absolute URL of the current page carrying the current style in its fragment. */
export function buildStyleLink(): string {
  const style = serializeStyle();
  const url = new URL(window.location.href);
  url.hash = `${HASH_KEY}=${toBase64Url(JSON.stringify(style))}`;
  return url.toString();
}

/** Read a style from the current fragment, if any. */
export function readStyleFromHash(): QrStyle | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const encoded = params.get(HASH_KEY);
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    return isQrStyle(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStyleHash(): void {
  if (!window.location.hash) return;
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

/**
 * frame.ts — optional text frame ("Scan me") rendered under the QR.
 *
 * The preview is plain DOM (#qr-cta); exports compose the frame onto the
 * rendered PNG (canvas) or wrap the vector SVG, so what you see is what you
 * download. The frame is part of the portable style (see style.ts).
 */

import {DEFAULT_FRAME, type FrameState} from '@holi/engine-qr/style';
export {DEFAULT_FRAME, type FrameState} from '@holi/engine-qr/style';
const frame: FrameState = { ...DEFAULT_FRAME };
let defaultText = "SCAN ME";

export function getFrameState(): FrameState {
  return { ...frame, text: frame.text || defaultText };
}

export function isFrameActive(): boolean {
  return frame.enabled && (frame.text || defaultText).trim().length > 0;
}

export function setFrameState(next: Partial<FrameState>): void {
  if (typeof next.enabled === "boolean") frame.enabled = next.enabled;
  if (typeof next.text === "string") frame.text = next.text.slice(0, 40);
  if (typeof next.bg === "string") frame.bg = next.bg;
  if (typeof next.fg === "string") frame.fg = next.fg;
  syncDom();
  window.dispatchEvent(new CustomEvent("qr-frame-change", { detail: getFrameState() }));
}

function syncDom(): void {
  const enabled = document.getElementById("frame-enabled") as HTMLInputElement | null;
  const text = document.getElementById("frame-text") as HTMLInputElement | null;
  const bg = document.getElementById("frame-bg") as HTMLInputElement | null;
  const fg = document.getElementById("frame-fg") as HTMLInputElement | null;
  const controls = document.getElementById("frame-controls");
  const card = document.getElementById("qr-card");
  const cta = document.getElementById("qr-cta");

  if (enabled) enabled.checked = frame.enabled;
  if (text && document.activeElement !== text) text.value = frame.text || defaultText;
  if (bg) bg.value = frame.bg;
  if (fg) fg.value = frame.fg;
  if (controls) controls.dataset.disabled = frame.enabled ? "false" : "true";
  if (card) card.dataset.cta = isFrameActive() ? "on" : "off";
  if (cta) {
    cta.textContent = frame.text || defaultText;
    cta.style.setProperty("--qr-cta-bg", frame.bg);
    cta.style.setProperty("--qr-cta-fg", frame.fg);
  }
}

/** Wire the Frame panel inputs. Safe to call once after the DOM is ready. */
export function initFramePanel(): void {
  const text = document.getElementById("frame-text") as HTMLInputElement | null;
  defaultText = text?.placeholder?.trim() || defaultText;

  document.getElementById("frame-enabled")?.addEventListener("change", (e) => {
    setFrameState({ enabled: (e.target as HTMLInputElement).checked });
  });
  text?.addEventListener("input", () => setFrameState({ text: text.value }));
  document.getElementById("frame-bg")?.addEventListener("input", (e) => {
    setFrameState({ bg: (e.target as HTMLInputElement).value });
  });
  document.getElementById("frame-fg")?.addEventListener("input", (e) => {
    setFrameState({ fg: (e.target as HTMLInputElement).value });
  });
  syncDom();
}

// ---------------------------------------------------------------------------
// Export composition
// ---------------------------------------------------------------------------

/** Geometry of the frame band relative to the QR side length. */
function bandMetrics(size: number) {
  const pad = Math.round(size * 0.06); // card padding around the QR
  const pillH = Math.round(size * 0.11);
  const gap = Math.round(size * 0.04);
  const font = Math.round(pillH * 0.42);
  return { pad, pillH, gap, font };
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Compose the frame under a rendered QR PNG. The result keeps the QR at the
 * requested size and adds a band below it. Transparent where the QR is
 * transparent; the pill itself is always opaque.
 */
export async function applyFrameToPng(blob: Blob): Promise<Blob> {
  if (!isFrameActive()) return blob;
  const img = await loadImage(blob);
  const size = img.width;
  const { pad, pillH, gap, font } = bandMetrics(size);
  const width = size + pad * 2;
  const height = size + pad * 2 + gap + pillH;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;

  ctx.drawImage(img, pad, pad, size, size);

  const text = (frame.text || defaultText).toUpperCase();
  ctx.font = `800 ${font}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const letterSpacing = font * 0.22;
  const textWidth = measureSpaced(ctx, text, letterSpacing);
  const pillW = Math.min(width - pad * 2, textWidth + pillH * 1.6);
  const pillX = (width - pillW) / 2;
  const pillY = size + pad * 2 + gap;

  ctx.fillStyle = frame.bg;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.fillStyle = frame.fg;
  drawSpaced(ctx, text, width / 2, pillY + pillH / 2, letterSpacing);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? blob), "image/png", 1.0),
  );
}

function measureSpaced(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, spacing: number): void {
  const total = measureSpaced(ctx, text, spacing);
  let x = cx - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, x, cy);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[ch] as string);
}

/**
 * Wrap a QR SVG (square viewBox) in an outer SVG that adds the frame band.
 * Returns the input unchanged when the frame is off or the SVG is not
 * recognisable.
 */
export function applyFrameToSvg(svg: string): string {
  if (!isFrameActive()) return svg;
  const open = svg.match(/<svg[^>]*>/i);
  if (!open) return svg;
  const vb = open[0].match(/viewBox="([^"]+)"/i)?.[1]?.trim().split(/[\s,]+/).map(Number);
  const side = vb && vb.length === 4 && Number.isFinite(vb[2]) ? vb[2] : 100;

  // Work in a 1000-unit space so text metrics are predictable.
  const size = 1000;
  const { pad, pillH, gap, font } = bandMetrics(size);
  const width = size + pad * 2;
  const height = size + pad * 2 + gap + pillH;
  const text = escapeXml((frame.text || defaultText).toUpperCase());
  const approxCharW = font * 0.62 + font * 0.22;
  const pillW = Math.min(width - pad * 2, text.length * approxCharW + pillH * 1.6);
  const pillX = (width - pillW) / 2;
  const pillY = size + pad * 2 + gap;

  const inner = svg
    .replace(/<\?xml[^>]*>/i, "")
    .replace(/<svg/i, `<svg x="${pad}" y="${pad}" width="${size}" height="${size}"`);
  const hasViewBox = /viewBox=/i.test(open[0]);
  const innerWithVb = hasViewBox ? inner : inner.replace(/<svg/i, `<svg viewBox="0 0 ${side} ${side}"`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    innerWithVb +
    `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${frame.bg}"/>` +
    `<text x="${width / 2}" y="${pillY + pillH / 2}" fill="${frame.fg}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${font}" font-weight="800" letter-spacing="${font * 0.22}" text-anchor="middle" dominant-baseline="central">${text}</text>` +
    `</svg>`
  );
}

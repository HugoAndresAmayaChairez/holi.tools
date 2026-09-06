import { createDefaultLayersConfig, type QRLayersConfig } from "./layers.js";
export interface FrameState {
  enabled: boolean;
  text: string;
  bg: string;
  fg: string;
}

export const DEFAULT_FRAME: FrameState = {
  enabled: false,
  text: "",
  bg: "#24211d",
  fg: "#ffffff",
};

export const STYLE_VERSION = 1;

export interface QrStyle {
  v: typeof STYLE_VERSION;
  app: "holi-qr";
  name?: string;
  config: {
    bodyShape: string;
    eyeFrameShape: string;
    eyeBallShape: string;
    ecc: "L" | "M" | "Q" | "H";
    mask?: number;
    logoSize?: number;
    logoBgEnabled?: boolean;
    logoBgColor?: string;
    logoBgShape?: string;
    logoPadding?: number;
    logoCornerRadius?: number;
  };
  layers: Omit<QRLayersConfig, "card"> & { card?: never };
  frame: FrameState;
}

type AnyRecord = Record<string, unknown>;

const IMAGE_KEYS = new Set(["image"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function safeValue(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (!value || typeof value !== "object") return true;
  return Object.entries(value).every(
    ([key, item]) => !FORBIDDEN_KEYS.has(key) && safeValue(item, depth + 1)
  );
}

const record = (value: unknown): value is AnyRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

function matchesKnownFields(value: AnyRecord, defaults: AnyRecord): boolean {
  return Object.entries(value).every(([key, item]) => {
    if (item === undefined || !Object.hasOwn(defaults, key)) return true;
    const expected = defaults[key];
    return record(expected)
      ? record(item) && matchesKnownFields(item, expected)
      : typeof item === typeof expected;
  });
}

export function isQrStyle(value: unknown): value is QrStyle {
  if (!record(value) || !safeValue(value)) return false;
  if (
    value.app !== "holi-qr" ||
    value.v !== STYLE_VERSION ||
    !record(value.config) ||
    !record(value.layers)
  )
    return false;
  const c = value.config;
  if (
    !["bodyShape", "eyeFrameShape", "eyeBallShape"].every(
      (key) => typeof c[key] === "string"
    )
  )
    return false;
  if (!["L", "M", "Q", "H"].includes(String(c.ecc))) return false;
  if (
    c.mask !== undefined &&
    (!Number.isInteger(c.mask) || Number(c.mask) < -1 || Number(c.mask) > 7)
  )
    return false;
  if (value.name !== undefined && typeof value.name !== "string") return false;
  if (!matchesKnownFields(value, defaultStyle() as unknown as AnyRecord))
    return false;
  if (
    !["bg", "paper", "ink", "logo"].every((key) =>
      record((value.layers as AnyRecord)[key])
    )
  )
    return false;
  return (
    value.frame === undefined ||
    (record(value.frame) &&
      typeof value.frame.enabled === "boolean" &&
      ["text", "bg", "fg"].every(
        (key) => typeof (value.frame as AnyRecord)[key] === "string"
      ))
  );
}

export function stripImages<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripImages) as T;
  if (value && typeof value === "object") {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(value as AnyRecord)) {
      if (IMAGE_KEYS.has(k) || FORBIDDEN_KEYS.has(k)) continue;
      out[k] = stripImages(v);
    }
    return out as T;
  }
  return value;
}

export function deepMerge(target: AnyRecord, patch: AnyRecord): void {
  for (const [k, v] of Object.entries(patch)) {
    if (IMAGE_KEYS.has(k) || FORBIDDEN_KEYS.has(k)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== "object") target[k] = {};
      deepMerge(target[k] as AnyRecord, v as AnyRecord);
    } else {
      target[k] = v;
    }
  }
}

/** Default style = fresh layers + square shapes + no frame. */
export function defaultStyle(): QrStyle {
  const layers = stripImages(
    createDefaultLayersConfig()
  ) as unknown as AnyRecord;
  delete layers.card;
  return {
    v: STYLE_VERSION,
    app: "holi-qr",
    config: {
      bodyShape: "square",
      eyeFrameShape: "square",
      eyeBallShape: "square",
      ecc: "M",
      logoSize: 0.2,
      logoBgEnabled: true,
      logoBgColor: "#ffffff",
      logoBgShape: "rounded",
      logoPadding: 0,
      logoCornerRadius: 10,
    },
    layers: layers as QrStyle["layers"],
    frame: { ...DEFAULT_FRAME },
  };
}

export function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): string {
  const b64 =
    text.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((text.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

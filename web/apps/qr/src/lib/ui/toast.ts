import { getLangFromUrl, useTranslations } from "../../i18n/utils";

type ToastVariant = "info" | "success" | "error";

type ToastOptions = {
    variant?: ToastVariant;
    timeoutMs?: number;
};

let didInit = false;
let hostEl: HTMLDivElement | null = null;
let styleEl: HTMLStyleElement | null = null;

function getHost(): HTMLDivElement {
    if (hostEl) return hostEl;
    hostEl = document.createElement("div");
    hostEl.id = "holi-toast-host";
    hostEl.setAttribute("aria-live", "polite");
    hostEl.setAttribute("aria-atomic", "true");
    document.body.appendChild(hostEl);
    return hostEl;
}

function ensureStyles() {
    if (styleEl) return;
    styleEl = document.createElement("style");
    styleEl.textContent = `
#holi-toast-host{
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: min(520px, calc(100vw - 24px));
}
.holi-toast{
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(127,127,127,.18);
  background: rgba(20,20,22,.92);
  color: rgba(255,255,255,.92);
  box-shadow: 0 14px 40px rgba(0,0,0,.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font: 600 12px/1.25 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  letter-spacing: .2px;
  transform: translateY(8px);
  opacity: 0;
  animation: holiToastIn 180ms ease-out forwards;
}
.holi-toast[data-variant="success"]{ border-color: rgba(34,197,94,.35); }
.holi-toast[data-variant="error"]{ border-color: rgba(239,68,68,.35); }
.holi-toast__dot{
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.65);
}
.holi-toast[data-variant="success"] .holi-toast__dot{ background: rgba(34,197,94,.9); }
.holi-toast[data-variant="error"] .holi-toast__dot{ background: rgba(239,68,68,.9); }
.holi-toast__msg{ white-space: normal; }
.holi-toast--out{
  animation: holiToastOut 160ms ease-in forwards;
}
@keyframes holiToastIn{
  to{ transform: translateY(0); opacity: 1; }
}
@keyframes holiToastOut{
  to{ transform: translateY(6px); opacity: 0; }
}
`;
    document.head.appendChild(styleEl);
}

function ensureInit() {
    if (didInit) return;
    didInit = true;
    // Lazy-create host when needed, but styles are safe to insert once now.
    ensureStyles();
}

function safeText(s: unknown) {
    return typeof s === "string" ? s : "";
}

function getT() {
    try {
        const lang = getLangFromUrl(new URL(window.location.href));
        return useTranslations(lang);
    } catch {
        return (key: any) => String(key ?? "");
    }
}

function tr(key: any, fallback: string): string {
    const raw = getT()(key);
    return safeText(raw).trim() || fallback;
}

export function showToast(message: string, opts: ToastOptions = {}) {
    if (typeof document === "undefined") return;
    ensureInit();

    const msg = safeText(message).trim();
    if (!msg) return;

    const variant: ToastVariant = opts.variant ?? "info";
    const timeoutMs = Number.isFinite(opts.timeoutMs) ? (opts.timeoutMs as number) : 2200;

    const toast = document.createElement("div");
    toast.className = "holi-toast";
    toast.dataset.variant = variant;

    const dot = document.createElement("span");
    dot.className = "holi-toast__dot";
    toast.appendChild(dot);

    const span = document.createElement("span");
    span.className = "holi-toast__msg";
    span.textContent = msg;
    toast.appendChild(span);

    const host = getHost();
    host.appendChild(toast);

    const close = () => {
        toast.classList.add("holi-toast--out");
        window.setTimeout(() => toast.remove(), 180);
    };

    window.setTimeout(close, Math.max(650, timeoutMs));
}

export function toastCopyResult(ok: boolean) {
    showToast(`${tr("toolbar.copy", "Copy")}: ${ok ? "OK" : tr("image.error", "Error")}`, {
        variant: ok ? "success" : "error",
    });
}

export function toastDownloadResult(label: string, ok: boolean) {
    const base = safeText(label).trim();
    const msg = ok
        ? `${tr("image.download", "Download")}: ${base || "OK"}`
        : `${tr("image.download", "Download")}: ${tr("image.error", "Error")}`;
    showToast(msg, { variant: ok ? "success" : "error" });
}

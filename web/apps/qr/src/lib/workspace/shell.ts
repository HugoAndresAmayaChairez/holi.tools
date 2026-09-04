/**
 * shell.ts — behaviour of the QR workspace shell.
 *
 * Owns: rail/inspector collapse, inspector tabs (and the mobile bottom
 * sheet), the empty-state hero, toolbar status + caption, preview
 * background and zoom, saved styles, style links, keyboard shortcuts.
 * Rendering stays in qr-controller; this module only talks to it.
 */
import { qrController } from "../qr-controller";
import { state } from "../qr-engine";
import { showToast } from "../ui/toast";
import { initDownloadMenu, runExport, getExportPrefs } from "./download-menu";
import { initFramePanel, getFrameState } from "./frame";
import {
  applyStyle,
  defaultStyle,
  serializeStyle,
  loadSavedStyles,
  saveStyle,
  deleteStyle,
  addImportedStyle,
  isQrStyle,
  buildStyleLink,
  readStyleFromHash,
  clearStyleHash,
  type SavedStyle,
} from "./style";

const w = window as any;
const root = document.getElementById("canvas-container") as HTMLElement;
const PREF_KEY = "holi-qr:workspace:v1";
const PANES = ["color", "shapes", "effect", "image", "frame", "advanced"];

type Prefs = { rail?: "open" | "closed"; inspector?: "open" | "closed"; previewBg?: string; pane?: string };

function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writePrefs(patch: Prefs): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    // ignore
  }
}

function t(id: string, attr: string): string {
  return document.getElementById(id)?.getAttribute(attr) || "";
}

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

// ---------------------------------------------------------------------------
// Collapse toggles
// ---------------------------------------------------------------------------
function initCollapse(): void {
  const prefs = readPrefs();
  if (prefs.rail) root.dataset.rail = prefs.rail;
  if (prefs.inspector) root.dataset.inspector = prefs.inspector;

  const railBtn = document.getElementById("qr-rail-toggle");
  const inspBtn = document.getElementById("qr-inspector-toggle");

  const syncToggle = (button: HTMLElement | null, expanded: boolean) => {
    if (!button) return;
    button.setAttribute("aria-expanded", String(expanded));
    const label = expanded ? button.dataset.lCollapse : button.dataset.lExpand;
    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  };

  const sync = () => {
    const railOpen = root.dataset.rail !== "closed";
    const inspOpen = root.dataset.inspector !== "closed";
    syncToggle(railBtn, railOpen);
    syncToggle(inspBtn, inspOpen);
  };

  railBtn?.addEventListener("click", () => {
    root.dataset.rail = root.dataset.rail === "closed" ? "open" : "closed";
    writePrefs({ rail: root.dataset.rail as Prefs["rail"] });
    sync();
    w.qrController?.webglRenderer?.resize?.();
  });
  inspBtn?.addEventListener("click", () => {
    root.dataset.inspector = root.dataset.inspector === "closed" ? "open" : "closed";
    writePrefs({ inspector: root.dataset.inspector as Prefs["inspector"] });
    sync();
  });
  // Clicking the collapsed rail re-opens it.
  document.querySelectorAll<HTMLElement>(".qr-rail .qr-rail-collapsed").forEach((el) =>
    el.addEventListener("click", () => railBtn?.click()),
  );
  document.querySelectorAll<HTMLElement>(".qr-inspector .qr-rail-collapsed").forEach((el) =>
    el.addEventListener("click", () => inspBtn?.click()),
  );
  sync();
}

// ---------------------------------------------------------------------------
// Inspector tabs (+ mobile bottom sheet)
// ---------------------------------------------------------------------------
export function selectPane(pane: string): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".inspector-tab");
  tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.pane === pane)));
  if (pane === "content") {
    root.dataset.mobilePane = "content";
    return;
  }
  root.dataset.mobilePane = pane;
  document.querySelectorAll<HTMLElement>(".inspector-pane").forEach((el) => {
    el.dataset.active = String(el.id === `pane-${pane}`);
  });
  if (root.dataset.inspector === "closed") {
    root.dataset.inspector = "open";
    writePrefs({ inspector: "open" });
  }
  writePrefs({ pane });
}

function initTabs(): void {
  document.querySelectorAll<HTMLButtonElement>(".inspector-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectPane(tab.dataset.pane || "color"));
  });
  const prefs = readPrefs();
  selectPane(prefs.pane && PANES.includes(prefs.pane) ? prefs.pane : "color");
  // Legacy hooks some panels still call.
  w.openPanel = (id: string) => selectPane(id === "style" ? "effect" : id);
  w.togglePanel = w.openPanel;
  w.closePanel = () => undefined;
}

// ---------------------------------------------------------------------------
// Empty state (hero) and content
// ---------------------------------------------------------------------------
function initHero(): void {
  const form = document.getElementById("hero-form") as HTMLFormElement | null;
  const hero = document.getElementById("hero-input") as HTMLInputElement | null;
  const urlInput = document.getElementById("input-url") as HTMLInputElement | null;
  if (!form || !hero) return;

  const mirror = () => {
    if (w.currentContentType && w.currentContentType !== "url") w.setContentType?.("url");
    if (urlInput) urlInput.value = hero.value;
  };
  hero.addEventListener("input", () => {
    mirror();
    if (hero.value.trim()) qrController.debouncedAutoGenerate();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    mirror();
    if (!hero.value.trim()) return;
    qrController.clearInputDebounce();
    qrController.generateQR(true);
    urlInput?.focus();
  });

  // Picking a type from the hero reveals the workspace and focuses its form.
  document.querySelectorAll<HTMLButtonElement>(".stage-hero .type-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.dataset.state = "editing";
      window.setTimeout(() => {
        const first = document.querySelector<HTMLElement>(".input-template.active .input-field");
        first?.focus();
      }, 30);
    });
  });
  // Rail types also leave the empty state.
  document.querySelectorAll<HTMLButtonElement>(".qr-rail .type-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.dataset.state = "editing";
      if (btn.dataset.type === "scan") selectPane("content");
    });
  });
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    root.dataset.state = "empty";
    hero.value = "";
    updateToolbarContent();
    window.setTimeout(() => hero.focus(), 50);
  });
}

// ---------------------------------------------------------------------------
// Toolbar status + caption
// ---------------------------------------------------------------------------
function updateToolbarContent(): void {
  const el = document.getElementById("qr-toolbar-content");
  if (!el) return;
  const type = String(w.currentContentType || "url");
  const text = String(state.text || "").replace(/\s+/g, " ").trim();
  if (!text || !root.classList.contains("generating")) {
    el.textContent = el.dataset.idle || "";
    return;
  }
  const short = text.length > 42 ? `${text.slice(0, 41)}…` : text;
  const size = qrController.lastMatrixSize ? ` · ${qrController.lastMatrixSize}×${qrController.lastMatrixSize}` : "";
  el.textContent = `${type} · ${short} · ${state.config.ecc || "M"}${size}`;
}

function updateStatus(): void {
  const btn = document.getElementById("btn-verify");
  const label = document.getElementById("qr-status-text");
  const cap = document.getElementById("caption-verify");
  if (!btn || !label) return;
  const status = btn.dataset.verifyStatus || "none";
  const map: Record<string, string> = {
    valid: btn.dataset.lValid || "",
    invalid: btn.dataset.lInvalid || "",
    checking: btn.dataset.lChecking || "",
  };
  label.textContent = map[status] || "";
  if (cap) {
    cap.textContent = status === "valid" ? cap.dataset.ok || "" : status === "invalid" ? cap.dataset.bad || "" : "";
    cap.className = status === "valid" ? "ok" : "";
  }
  updateToolbarContent();
  updateFrameCaption();
}

function updateFrameCaption(): void {
  const cap = document.getElementById("caption-frame");
  if (!cap) return;
  const f = getFrameState();
  cap.textContent = f.enabled ? `${cap.dataset.frame || "frame"}: ${f.text}` : cap.dataset.none || "";
}

function initStatus(): void {
  const btn = document.getElementById("btn-verify");
  const cap = document.getElementById("caption-frame");
  if (cap) {
    cap.dataset.none = cap.textContent || "";
    cap.dataset.frame = (document.getElementById("stage-caption")?.dataset.frameLabel || "").trim() || cap.dataset.none;
  }
  if (btn) {
    new MutationObserver(updateStatus).observe(btn, { attributes: true, attributeFilter: ["data-verify-status", "class"] });
  }
  new MutationObserver(updateToolbarContent).observe(root, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("qr-type-changed", () => window.setTimeout(updateToolbarContent, 350));
  window.addEventListener("qr-frame-change", updateFrameCaption);
  updateStatus();
}

// ---------------------------------------------------------------------------
// Preview background + zoom + reset style
// ---------------------------------------------------------------------------
function initStageControls(): void {
  const body = document.getElementById("stage-body");
  const card = document.getElementById("qr-card");
  const prefs = readPrefs();
  const setBg = (bg: string) => {
    if (body) body.dataset.previewBg = bg;
    document.querySelectorAll<HTMLButtonElement>("[data-preview-bg]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.previewBg === bg)),
    );
    writePrefs({ previewBg: bg });
  };
  document.querySelectorAll<HTMLButtonElement>("#preview-bg-seg [data-preview-bg]").forEach((b) => {
    b.addEventListener("click", () => setBg(b.dataset.previewBg || "light"));
  });
  setBg(prefs.previewBg || "light");

  let zoom = 1;
  const zoomLabel = document.getElementById("stage-zoom-value");
  const applyZoom = () => {
    card?.style.setProperty("--stage-zoom", String(zoom));
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  };
  document.querySelectorAll<HTMLButtonElement>("#stage-zoom [data-zoom]").forEach((b) => {
    b.addEventListener("click", () => {
      const step = Number(b.dataset.zoom);
      zoom = step === 0 ? 1 : Math.min(1.5, Math.max(0.5, Math.round((zoom + step * 0.1) * 10) / 10));
      applyZoom();
    });
  });

  document.getElementById("btn-reset-style")?.addEventListener("click", () => applyStyle(defaultStyle()));
}

// ---------------------------------------------------------------------------
// Saved styles
// ---------------------------------------------------------------------------
function renderPresets(): void {
  const host = document.getElementById("preset-chips");
  const empty = document.getElementById("preset-empty");
  if (!host) return;
  const list = loadSavedStyles();
  host.innerHTML = "";
  if (empty) empty.hidden = list.length > 0;
  const removeLabel = t("preset-chips", "data-l-delete");
  list.forEach((entry: SavedStyle) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preset-chip";
    chip.setAttribute("role", "listitem");
    chip.title = entry.name;
    const dot = document.createElement("i");
    dot.style.background = entry.style.layers.ink?.color || "#000";
    const name = document.createElement("span");
    name.textContent = entry.name;
    const del = document.createElement("span");
    del.className = "preset-remove";
    del.setAttribute("role", "button");
    del.setAttribute("aria-label", `${removeLabel}: ${entry.name}`);
    del.innerHTML = w.getIconSvg?.("x", 10) || "×";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteStyle(entry.id);
      renderPresets();
    });
    chip.append(dot, name, del);
    chip.addEventListener("click", () => {
      applyStyle(entry.style);
      document.querySelectorAll(".preset-chip").forEach((c) => c.classList.toggle("active", c === chip));
      showToast(t("preset-chips", "data-l-applied") || entry.name, { variant: "success", timeoutMs: 1600 });
    });
    host.appendChild(chip);
  });
}

function initPresets(): void {
  const host = document.getElementById("preset-chips");
  const labels = {
    prompt: t("preset-save-btn", "data-l-prompt"),
    saved: t("preset-save-btn", "data-l-saved"),
    imported: t("preset-import-btn", "data-l-imported"),
    invalid: t("preset-import-btn", "data-l-invalid"),
  };
  document.getElementById("preset-save-btn")?.addEventListener("click", () => {
    const name = window.prompt(labels.prompt || "Style name", "");
    if (name === null) return;
    saveStyle(name);
    renderPresets();
    showToast(labels.saved || "Saved", { variant: "success", timeoutMs: 1600 });
  });
  document.getElementById("preset-export-btn")?.addEventListener("click", () => {
    const style = serializeStyle();
    const blob = new Blob([JSON.stringify(style, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `holi-qr-style-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  const input = document.getElementById("preset-import-input") as HTMLInputElement | null;
  document.getElementById("preset-import-btn")?.addEventListener("click", () => input?.click());
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isQrStyle(parsed)) throw new Error("invalid");
      if (!parsed.name) parsed.name = file.name.replace(/\.json$/i, "");
      addImportedStyle(parsed);
      applyStyle(parsed);
      renderPresets();
      showToast(labels.imported || "Imported", { variant: "success", timeoutMs: 1600 });
    } catch {
      showToast(labels.invalid || "Invalid style file", { variant: "error", timeoutMs: 2600 });
    }
  });
  if (host) renderPresets();
}

// ---------------------------------------------------------------------------
// Style links
// ---------------------------------------------------------------------------
async function copyStyleLink(): Promise<void> {
  const link = buildStyleLink();
  const ok = t("btn-share-style", "data-l-copied");
  const bad = t("btn-share-style", "data-l-failed");
  try {
    await navigator.clipboard.writeText(link);
    showToast(ok || "Link copied", { variant: "success", timeoutMs: 1800 });
  } catch {
    window.prompt(bad || "Copy this link", link);
  }
}

function initShare(): void {
  document.getElementById("btn-share-style")?.addEventListener("click", copyStyleLink);
  document.getElementById("btn-share-style-card")?.addEventListener("click", copyStyleLink);

  const incoming = readStyleFromHash();
  if (incoming) {
    const apply = () => {
      applyStyle(incoming);
      clearStyleHash();
      showToast(t("btn-share-style", "data-l-applied") || "Style applied", { variant: "success", timeoutMs: 2200 });
    };
    // Panels register their globals synchronously; wait a tick for WASM-free UI sync.
    window.setTimeout(apply, 120);
  }
}

// ---------------------------------------------------------------------------
// Shapes: diamond frame guidance
// ---------------------------------------------------------------------------
const DIAMOND_SAFE_BALLS = new Set(["circle", "diamond", "star", "hexagon"]);

function updateDiamondHint(): void {
  const hint = document.getElementById("shapes-diamond-hint");
  const isDiamond = (state.config.eyeFrameShape || "square") === "diamond";
  if (hint) hint.hidden = !isDiamond;
  document.querySelectorAll<HTMLButtonElement>("button[data-eyeball]").forEach((b) => {
    const risky = isDiamond && !DIAMOND_SAFE_BALLS.has(b.dataset.eyeball || "");
    b.dataset.risky = risky ? "true" : "false";
  });
}

function initShapesHints(): void {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-eyeframe], [data-eyeball], .preset-chip, #btn-reset-style")) {
      window.setTimeout(updateDiamondHint, 0);
    }
  });
  window.addEventListener("qr-style-applied", updateDiamondHint);
  updateDiamondHint();
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------
function initShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "s") {
      if (!state.text) return;
      e.preventDefault();
      const p = getExportPrefs();
      runExport(p.format, p.size);
      return;
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
      if (!state.text) return;
      e.preventDefault();
      qrController.copyQRToClipboard();
      return;
    }
    if (mod || e.altKey || isTypingTarget(e.target)) return;
    const idx = Number(e.key);
    if (idx >= 1 && idx <= PANES.length && root.classList.contains("generating")) {
      selectPane(PANES[idx - 1]);
    }
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
export function initWorkspace(): void {
  if (!root) return;
  root.dataset.state = state.text ? "editing" : "empty";
  initCollapse();
  initTabs();
  initHero();
  initStatus();
  initStageControls();
  initDownloadMenu();
  initFramePanel();
  initPresets();
  initShare();
  initShapesHints();
  initShortcuts();
}

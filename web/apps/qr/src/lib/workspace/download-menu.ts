/**
 * download-menu.ts — export menu behaviour (format + size), remembered in
 * localStorage, plus the label on the primary Download button.
 */

const SIZE_KEY = "qrExportSize";
const FORMAT_KEY = "qrExportFormat";
const FORMAT_LABEL: Record<string, string> = {
  png: "PNG",
  jpeg: "JPG",
  jpg: "JPG",
  webp: "WebP",
  svg: "SVG",
  pdf: "PDF",
};

export interface ExportPrefs {
  size: number;
  format: string;
}

const prefs: ExportPrefs = { size: 2048, format: "png" };

export function getExportPrefs(): ExportPrefs {
  return { ...prefs };
}

function readStored(): void {
  try {
    const size = Number(localStorage.getItem(SIZE_KEY));
    if (Number.isFinite(size) && size > 0) prefs.size = size;
    const fmt = String(localStorage.getItem(FORMAT_KEY) || "");
    if (fmt && FORMAT_LABEL[fmt]) prefs.format = fmt;
  } catch {
    // storage unavailable
  }
}

function store(): void {
  try {
    localStorage.setItem(SIZE_KEY, String(prefs.size));
    localStorage.setItem(FORMAT_KEY, prefs.format);
  } catch {
    // ignore
  }
}

function updateLabels(): void {
  const label = document.getElementById("download-label");
  const fmt = FORMAT_LABEL[prefs.format] || "PNG";
  if (label) label.textContent = prefs.format === "svg" ? "SVG" : `${fmt} · ${prefs.size}`;
  const capSize = document.getElementById("caption-size");
  const capFmt = document.getElementById("caption-format");
  if (capSize) capSize.textContent = prefs.format === "svg" ? "vector" : `${prefs.size} × ${prefs.size} px`;
  if (capFmt) capFmt.textContent = fmt;
  document.querySelectorAll<HTMLButtonElement>("[data-export-size]").forEach((btn) => {
    const active = btn.dataset.exportSize === String(prefs.size);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

export function runExport(format = prefs.format, size = prefs.size): void {
  prefs.format = format;
  prefs.size = size;
  store();
  updateLabels();
  (window as any).downloadAs?.(format, size);
}

export function initDownloadMenu(): void {
  const btn = document.getElementById("btn-download") as HTMLButtonElement | null;
  const menu = document.getElementById("download-menu");
  readStored();
  updateLabels();
  if (!btn || !menu) return;

  const open = () => {
    menu.classList.add("show");
    menu.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    (menu.querySelector("[data-export-format]") as HTMLElement | null)?.focus();
  };
  const close = (returnFocus = false) => {
    if (!menu.classList.contains("show")) return;
    menu.classList.remove("show");
    menu.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    if (returnFocus) btn.focus();
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (menu.classList.contains("show")) close();
    else open();
  });
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  });
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  });
  menu.querySelectorAll<HTMLButtonElement>("[data-export-size]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const size = Number(el.dataset.exportSize);
      if (Number.isFinite(size) && size > 0) {
        prefs.size = size;
        store();
        updateLabels();
      }
    });
  });
  menu.querySelectorAll<HTMLButtonElement>("[data-export-format]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const format = el.dataset.exportFormat;
      if (!format) return;
      runExport(format, prefs.size);
      close();
    });
  });
  document.addEventListener("click", (e) => {
    const target = e.target as Node;
    if (!menu.contains(target) && target !== btn && !btn.contains(target)) close();
  });
}

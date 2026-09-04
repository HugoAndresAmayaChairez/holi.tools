/**
 * Preview manager for Holi Typst.
 *
 * Handles the compilation loop, SVG rendering, diagnostics display,
 * zoom/pan gestures, and preview status updates.
 */

import { escapeHtml, hasUnclosedInlineMath, clamp } from "../utils";
import type { TypstCopy } from "../../i18n/translations";

// ── Types ─────────────────────────────────────────────────────────────

export interface PreviewRefs {
  previewContent: HTMLElement | null;
  previewErrors: HTMLElement | null;
  previewStatus: HTMLElement | null;
  previewContainer: HTMLElement | null;
  previewStage: HTMLElement | null;
  editorContainer: HTMLElement | null;
  zoomOutput: HTMLElement | null;
}

export interface PreviewDeps {
  compileSvg: (source: string) => Promise<string>;
  onSourceJump?: (ratio: number) => void;
  copy: TypstCopy;
}

// ── Factory ───────────────────────────────────────────────────────────

export function createPreviewManager(refs: PreviewRefs, deps: PreviewDeps) {
  const pageGap = 28;
  let lastSuccessfulSvg = "";
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;
  let zoom = 1;
  let basePageWidthPx = 0;
  let basePageMinHeightPx = 0;
  let hasInitialFit = false;

  // ── Status / errors ─────────────────────────────────────────────

  function setStatus(text: string): void {
    if (!refs.previewStatus) return;
    refs.previewStatus.textContent = text;
  }

  function setEditorErrorState(hasErrors: boolean): void {
    if (!refs.editorContainer) return;
    refs.editorContainer.classList.toggle("border-red-400", hasErrors);
  }

  function clearErrors(): void {
    if (refs.previewErrors) refs.previewErrors.innerHTML = "";
    setEditorErrorState(false);
  }

  function showDiagnostics(
    diags: unknown[] | undefined,
    fallbackMessage: string
  ): void {
    const message = fallbackMessage || deps.copy.compilationFailed;
    const list = Array.isArray(diags) ? diags : [];

    setEditorErrorState(true);
    if (!refs.previewErrors) return;

    const itemsHtml = list
      .map((d: any) => {
        const msg = typeof d?.message === "string" ? d.message : String(d);
        const hints: string[] = Array.isArray(d?.hints)
          ? d.hints.filter((h: unknown) => typeof h === "string")
          : [];

        const hintsHtml = hints.length
          ? `<div class="mt-1 text-[11px] text-red-800">${hints
              .map((h) => `• ${escapeHtml(h)}`)
              .join("<br/>")}</div>`
          : "";

        return `<div class="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2">
          <div class="text-sm font-semibold text-red-700">${escapeHtml(msg)}</div>
          ${hintsHtml}
        </div>`;
      })
      .join("");

    refs.previewErrors.innerHTML = `
      <div class="rounded border border-red-200 bg-white shadow-sm">
        <div class="px-3 py-2 text-xs font-semibold text-red-700 border-b border-red-100 bg-red-50">${escapeHtml(
          message
        )}</div>
        <div class="px-3 py-2">${itemsHtml || `<div class="text-sm text-red-700">${escapeHtml(message)}</div>`}</div>
      </div>
    `;
  }

  // ── SVG rendering ───────────────────────────────────────────────

  function separatePages(svg: SVGSVGElement): number {
    const pages = Array.from(
      svg.querySelectorAll<SVGGElement>(":scope > g.typst-page")
    );
    if (!pages.length) return 0;

    for (const [index, page] of pages.entries()) {
      const pageWidth = Number(
        page.dataset.pageWidth || svg.dataset.width || 0
      );
      const pageHeight = Number(page.dataset.pageHeight || 0);
      const transform = page.getAttribute("transform") || "translate(0, 0)";
      const translate = transform.match(
        /translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*\)/
      );
      const x = Number(translate?.[1] || 0);
      const y = Number(translate?.[2] || 0);
      page.setAttribute("transform", `translate(${x}, ${y + index * pageGap})`);

      if (pageWidth > 0 && pageHeight > 0) {
        const paper = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        paper.setAttribute("class", "holi-page-background");
        paper.setAttribute("width", String(pageWidth));
        paper.setAttribute("height", String(pageHeight));
        paper.setAttribute("fill", "#fff");
        page.insertBefore(paper, page.firstChild);
      }
    }

    if (pages.length > 1) {
      const viewBox = (svg.getAttribute("viewBox") || "").trim().split(/\s+/);
      const originalHeight = Number(
        svg.dataset.height || svg.getAttribute("height") || 0
      );
      const spacedHeight = originalHeight + (pages.length - 1) * pageGap;
      if (viewBox.length === 4 && spacedHeight > 0) {
        viewBox[3] = String(spacedHeight);
        svg.setAttribute("viewBox", viewBox.join(" "));
      }
      svg.setAttribute("height", String(spacedHeight));
      svg.dataset.height = String(spacedHeight);
    }

    return pages.length;
  }

  function ensureSvgFitsContainer(): void {
    if (!refs.previewContent) return;
    const svg = refs.previewContent.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    const pageCount = separatePages(svg);
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.overflow = "visible";
    refs.previewContent.dataset.pages = String(pageCount);
    refs.previewContent.setAttribute(
      "aria-label",
      `${deps.copy.renderedDocument}, ${pageCount} ${pageCount === 1 ? deps.copy.page : deps.copy.pages}`
    );
  }

  function schedulePreviewUpdate(source: string): void {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      if (hasUnclosedInlineMath(source)) {
        clearErrors();
        setStatus("waiting… (close $)");
        return;
      }
      updatePreview(source);
    }, 250);
  }

  async function updatePreview(source: string): Promise<void> {
    if (!refs.previewContent) return;
    const current = ++requestId;

    setStatus(deps.copy.compiling);
    try {
      const startedAt = performance.now();
      const svg = await deps.compileSvg(source);
      if (current !== requestId) return;

      refs.previewContent.innerHTML = svg;
      ensureSvgFitsContainer();
      if (!hasInitialFit) {
        fitPreviewToWidth();
        hasInitialFit = true;
      }
      lastSuccessfulSvg = svg;
      clearErrors();
      setStatus(`${Math.round(performance.now() - startedAt)}ms`);
    } catch (e: any) {
      console.error("Compilation error:", e);

      const diagnostics = Array.isArray(e) ? e : undefined;
      const first = diagnostics?.[0];
      const message =
        typeof first?.message === "string"
          ? first.message
          : typeof e?.message === "string"
            ? e.message
            : String(e);

      // Keep the last successful render to avoid the preview "going blank".
      if (!lastSuccessfulSvg) {
        refs.previewContent.innerHTML = `<div class="p-4 text-sm text-gray-700">${escapeHtml(deps.copy.noRender)}</div>`;
      }
      showDiagnostics(diagnostics, message);
      setStatus(deps.copy.error);
    }
  }

  // ── Zoom ────────────────────────────────────────────────────────

  function applyPreviewZoom(): void {
    if (!refs.previewContent || !basePageWidthPx) return;

    refs.previewContent.style.width = `${Math.round(basePageWidthPx * zoom)}px`;
    if (basePageMinHeightPx) {
      refs.previewContent.style.minHeight = `${Math.round(basePageMinHeightPx * zoom)}px`;
    }
    if (refs.previewStage) {
      (refs.previewStage as HTMLElement).style.justifyContent =
        zoom <= 1 ? "center" : "flex-start";
    }
    if (refs.zoomOutput) {
      refs.zoomOutput.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  function setZoom(nextZoom: number): void {
    zoom = clamp(nextZoom, 0.25, 4);
    applyPreviewZoom();
  }

  function zoomIn(): void {
    setZoom(zoom * 1.15);
  }

  function zoomOut(): void {
    setZoom(zoom / 1.15);
  }

  function fitPreviewToWidth(): void {
    if (!refs.previewContainer) return;
    if (!basePageWidthPx) measureBasePage();
    if (!basePageWidthPx) return;
    const padding = 32;
    const available = Math.max(
      200,
      refs.previewContainer.clientWidth - padding
    );
    zoom = clamp(available / basePageWidthPx, 0.25, 1);
    applyPreviewZoom();
  }

  function resetZoom(): void {
    zoom = 1;
    applyPreviewZoom();
    if (refs.previewContainer) {
      refs.previewContainer.scrollTop = 0;
      refs.previewContainer.scrollLeft = 0;
    }
  }

  function measureBasePage(): void {
    if (!refs.previewContent) return;
    const rect = refs.previewContent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    basePageWidthPx = rect.width / zoom;
    basePageMinHeightPx = rect.height / zoom;
    applyPreviewZoom();
  }

  // ── Gestures ────────────────────────────────────────────────────

  function wirePreviewGestures(): void {
    if (!refs.previewContainer) return;

    const setLocateCursor = (active: boolean) => {
      refs.previewContainer?.classList.toggle("is-source-locating", active);
    };

    window.addEventListener("keydown", (event) => {
      if (event.key === "Control" || event.key === "Meta") setLocateCursor(true);
    });
    window.addEventListener("keyup", (event) => {
      if (event.key === "Control" || event.key === "Meta") setLocateCursor(false);
    });
    window.addEventListener("blur", () => setLocateCursor(false));

    refs.previewContent?.addEventListener("click", (event) => {
      if (!(event.ctrlKey || event.metaKey) || !deps.onSourceJump) return;
      const svg = refs.previewContent?.querySelector<SVGSVGElement>("svg");
      if (!svg) return;
      event.preventDefault();

      const pages = Array.from(svg.querySelectorAll<SVGGElement>(":scope > g.typst-page"));
      if (pages.length === 0) return;
      const target = event.target instanceof Element
        ? event.target.closest<SVGGElement>("g.typst-page")
        : null;
      let pageIndex = target ? pages.indexOf(target) : -1;
      if (pageIndex < 0) {
        pageIndex = pages.reduce((bestIndex, page, index) => {
          const rect = page.getBoundingClientRect();
          const distance = event.clientY < rect.top
            ? rect.top - event.clientY
            : event.clientY > rect.bottom
              ? event.clientY - rect.bottom
              : 0;
          const bestRect = pages[bestIndex].getBoundingClientRect();
          const bestDistance = event.clientY < bestRect.top
            ? bestRect.top - event.clientY
            : event.clientY > bestRect.bottom
              ? event.clientY - bestRect.bottom
              : 0;
          return distance < bestDistance ? index : bestIndex;
        }, 0);
      }
      const pageRect = pages[pageIndex].getBoundingClientRect();
      const withinPage = clamp(
        (event.clientY - pageRect.top) / Math.max(1, pageRect.height),
        0,
        1
      );
      deps.onSourceJump((pageIndex + withinPage) / pages.length);
    });

    refs.previewContainer.addEventListener(
      "wheel",
      (e) => {
        if (!refs.previewContent) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();

        const prevZoom = zoom;
        const factor = Math.exp(-e.deltaY * 0.001);
        zoom = clamp(zoom * factor, 0.25, 4);
        if (Math.abs(prevZoom - zoom) < 0.0005) return;

        const container = refs.previewContainer!;
        const centerX = container.scrollLeft + container.clientWidth / 2;
        const centerY = container.scrollTop + container.clientHeight / 2;

        applyPreviewZoom();

        const ratio = zoom / prevZoom;
        container.scrollLeft = centerX * ratio - container.clientWidth / 2;
        container.scrollTop = centerY * ratio - container.clientHeight / 2;
      },
      { passive: false }
    );
  }

  return {
    schedulePreviewUpdate,
    clearErrors,
    setStatus,
    showDiagnostics,
    applyPreviewZoom,
    fitPreviewToWidth,
    wirePreviewGestures,
    resetZoom,
    zoomIn,
    zoomOut,
    measureBasePage,
  };
}

export type PreviewManager = ReturnType<typeof createPreviewManager>;

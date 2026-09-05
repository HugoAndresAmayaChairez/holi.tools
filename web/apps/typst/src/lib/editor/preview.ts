/**
 * Preview manager for Holi Typst.
 *
 * Handles the compilation loop, SVG rendering, diagnostics display,
 * zoom/pan gestures, and preview status updates.
 */

import { hasUnclosedInlineMath, clamp } from "../utils";
import type { TypstCopy } from "../../i18n/translations";
import type { TypstDiagnostic } from "../compiler/typst";

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

export interface PreviewOutcome {
  /** Rendered SVG, or `null` when the document did not compile. */
  result: string | null;
  diagnostics: TypstDiagnostic[];
}

export interface PreviewDeps {
  compile: (source: string) => Promise<PreviewOutcome>;
  onSourceJump?: (ratio: number) => void;
  /** Receives every compile's diagnostics (errors and warnings). */
  onDiagnostics?: (diagnostics: TypstDiagnostic[]) => void;
  /** Called when a problem's location is clicked. */
  onLocate?: (diagnostic: TypstDiagnostic) => void;
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
  /** True after the user zoomed by hand; auto-fit then stops overriding it. */
  let userZoomed = false;

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
    if (refs.previewErrors) refs.previewErrors.replaceChildren();
    setEditorErrorState(false);
  }

  function formatLocation(diagnostic: TypstDiagnostic): string {
    const path = diagnostic.path.replace(/^\/+/, "");
    if (!diagnostic.start) return path;
    const position = `${diagnostic.start.line}:${diagnostic.start.column}`;
    return path ? `${path}:${position}` : position;
  }

  function severityLabel(severity: TypstDiagnostic["severity"]): string {
    if (severity === "error") return deps.copy.error;
    if (severity === "warning") return deps.copy.warningLabel;
    return "info";
  }

  /**
   * Render compiler problems in the overlay. Errors and warnings share one
   * panel; every located problem gets a button that jumps to the source.
   */
  function renderDiagnostics(diagnostics: TypstDiagnostic[]): void {
    if (!refs.previewErrors) return;
    refs.previewErrors.replaceChildren();
    if (diagnostics.length === 0) return;

    const hasErrors = diagnostics.some((d) => d.severity === "error");
    const panel = document.createElement("div");
    panel.className = "preview-diagnostics";
    panel.dataset.tone = hasErrors ? "error" : "warning";
    panel.setAttribute("role", hasErrors ? "alert" : "status");

    const head = document.createElement("div");
    head.className = "preview-diagnostics-head";
    const title = document.createElement("span");
    title.textContent = hasErrors ? deps.copy.compilationFailed : deps.copy.problems;
    const count = document.createElement("span");
    count.className = "preview-diagnostics-count";
    count.textContent = String(diagnostics.length);
    head.append(title, count);
    panel.appendChild(head);

    const list = document.createElement("div");
    list.className = "preview-diagnostics-list";
    for (const diagnostic of diagnostics) {
      const item = document.createElement("div");
      item.className = "preview-diagnostic";
      item.dataset.severity = diagnostic.severity;

      const top = document.createElement("div");
      top.className = "preview-diagnostic-top";
      const badge = document.createElement("span");
      badge.className = "preview-diagnostic-badge";
      badge.textContent = severityLabel(diagnostic.severity);
      top.appendChild(badge);

      const location = formatLocation(diagnostic);
      if (location) {
        const canLocate = Boolean(diagnostic.start && deps.onLocate);
        const where = document.createElement(canLocate ? "button" : "span");
        where.className = "preview-diagnostic-location";
        where.textContent = location;
        if (where instanceof HTMLButtonElement) {
          where.type = "button";
          where.title = deps.copy.showInEditor;
          where.addEventListener("click", () => deps.onLocate?.(diagnostic));
        }
        top.appendChild(where);
      }
      item.appendChild(top);

      const message = document.createElement("div");
      message.className = "preview-diagnostic-message";
      message.textContent = diagnostic.message;
      item.appendChild(message);

      if (diagnostic.hints.length > 0) {
        const hints = document.createElement("ul");
        hints.className = "preview-diagnostic-hints";
        for (const hint of diagnostic.hints) {
          const li = document.createElement("li");
          li.textContent = hint;
          hints.appendChild(li);
        }
        item.appendChild(hints);
      }
      list.appendChild(item);
    }
    panel.appendChild(list);
    refs.previewErrors.appendChild(panel);
  }

  /** Show problems as a failure; falls back to one message when the list is empty. */
  function showDiagnostics(
    diagnostics: TypstDiagnostic[] | undefined,
    fallbackMessage: string
  ): void {
    const list = Array.isArray(diagnostics) && diagnostics.length > 0
      ? diagnostics
      : [{
          severity: "error" as const,
          message: fallbackMessage || deps.copy.compilationFailed,
          hints: [],
          path: "",
          package: "",
        }];
    setEditorErrorState(list.some((d) => d.severity === "error"));
    renderDiagnostics(list);
  }

  function renderNotice(text: string): void {
    if (!refs.previewContent) return;
    refs.previewContent.replaceChildren();
    const notice = document.createElement("div");
    notice.className = "p-4 text-sm text-gray-700";
    notice.textContent = text;
    refs.previewContent.appendChild(notice);
  }

  /** The WASM compiler could not load: explain it and offer a retry. */
  function showCompilerUnavailable(detail: string, retry: () => void): void {
    if (!refs.previewContent) return;
    refs.previewContent.replaceChildren();
    const box = document.createElement("div");
    box.className = "preview-notice";

    const text = document.createElement("p");
    text.textContent = deps.copy.compilerUnavailable;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pane-action pane-action--primary";
    button.textContent = deps.copy.retry;
    button.addEventListener("click", () => {
      button.disabled = true;
      retry();
    });

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = deps.copy.error;
    const pre = document.createElement("pre");
    pre.textContent = detail;
    details.append(summary, pre);

    box.append(text, button, details);
    refs.previewContent.appendChild(box);
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
        setStatus(deps.copy.waitingMath);
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
      const outcome = await deps.compile(source);
      if (current !== requestId) return;

      deps.onDiagnostics?.(outcome.diagnostics);
      const hasErrors = outcome.diagnostics.some((d) => d.severity === "error");

      if (outcome.result) {
        refs.previewContent.innerHTML = outcome.result;
        ensureSvgFitsContainer();
        if (!hasInitialFit) {
          fitPreviewToWidth();
          hasInitialFit = true;
        }
        lastSuccessfulSvg = outcome.result;
      } else if (!lastSuccessfulSvg) {
        // Keep the last successful render otherwise, so the preview never goes blank.
        renderNotice(deps.copy.noRender);
      }

      if (outcome.result && !hasErrors) {
        setEditorErrorState(false);
        renderDiagnostics(outcome.diagnostics);
        setStatus(`${Math.round(performance.now() - startedAt)}ms`);
      } else {
        showDiagnostics(outcome.diagnostics, deps.copy.compilationFailed);
        setStatus(deps.copy.error);
      }
    } catch (e: any) {
      if (current !== requestId) return;
      console.error("Compilation error:", e);
      const message = typeof e?.message === "string" ? e.message : String(e);
      if (!lastSuccessfulSvg) renderNotice(deps.copy.noRender);
      showDiagnostics(Array.isArray(e?.diagnostics) ? e.diagnostics : undefined, message);
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
    userZoomed = true;
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
    userZoomed = false;
    applyPreviewZoom();
  }

  /** Fit to width again unless the user chose a zoom level by hand. */
  function refit(): void {
    if (userZoomed) return;
    fitPreviewToWidth();
  }

  function resetZoom(): void {
    zoom = 1;
    userZoomed = true;
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
        userZoomed = true;

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

    // Keep the page fitted while the panes resize (splitter, sidebar, window)
    // until the user picks a zoom level explicitly.
    if (typeof ResizeObserver === "function") {
      let frame = 0;
      const observer = new ResizeObserver(() => {
        if (userZoomed || !hasInitialFit) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => fitPreviewToWidth());
      });
      observer.observe(refs.previewContainer);
    }
  }

  return {
    schedulePreviewUpdate,
    clearErrors,
    setStatus,
    showDiagnostics,
    showCompilerUnavailable,
    applyPreviewZoom,
    fitPreviewToWidth,
    refit,
    wirePreviewGestures,
    resetZoom,
    zoomIn,
    zoomOut,
    measureBasePage,
  };
}

export type PreviewManager = ReturnType<typeof createPreviewManager>;

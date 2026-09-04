/**
 * Split pane (resizer) for Holi Typst.
 *
 * Handles pointer-drag resizing between the editor and preview panes,
 * and persists/restores the split ratio via localStorage.
 */

import { safeGetItem, safeSetItem } from "../storage/idb";

const SPLIT_KEY = "holi-typst:split:v1";

export interface SplitterRefs {
    workbenchRoot: HTMLElement | null;
    splitter: HTMLElement | null;
    editorContainer: HTMLElement | null;
}

function setEditorWidthPercent(refs: SplitterRefs, nextPercent: number): void {
    if (!refs.editorContainer) return;
    const clamped = Math.min(80, Math.max(20, nextPercent));
    refs.editorContainer.style.width = `${clamped}%`;
}

function persistSplit(refs: SplitterRefs): void {
    if (!refs.editorContainer) return;
    safeSetItem(SPLIT_KEY, refs.editorContainer.style.width || "");
}

export function restoreSplit(refs: SplitterRefs): void {
    if (!refs.editorContainer) return;
    const value = safeGetItem(SPLIT_KEY);
    if (typeof value === "string" && value.trim().endsWith("%")) {
        refs.editorContainer.style.width = value.trim();
    }
}

export function wireSplitter(refs: SplitterRefs): void {
    if (!refs.workbenchRoot || !refs.splitter || !refs.editorContainer) return;

    refs.splitter.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        refs.splitter!.setPointerCapture(e.pointerId);

        const rect = refs.workbenchRoot!.getBoundingClientRect();
        const startX = e.clientX;
        const startWidth = refs.editorContainer!.getBoundingClientRect().width;

        function onMove(ev: PointerEvent) {
            const delta = ev.clientX - startX;
            const next = ((startWidth + delta) / rect.width) * 100;
            setEditorWidthPercent(refs, next);
        }

        function onUp(ev: PointerEvent) {
            try {
                refs.splitter!.releasePointerCapture(ev.pointerId);
            } catch { /* ignore */ }
            refs.splitter!.removeEventListener("pointermove", onMove);
            refs.splitter!.removeEventListener("pointerup", onUp);
            refs.splitter!.removeEventListener("pointercancel", onUp);
            persistSplit(refs);
        }

        refs.splitter!.addEventListener("pointermove", onMove);
        refs.splitter!.addEventListener("pointerup", onUp);
        refs.splitter!.addEventListener("pointercancel", onUp);
    });
}

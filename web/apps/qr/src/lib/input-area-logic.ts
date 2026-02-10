/**
 * input-area-logic.ts — Client-side logic for QRInputArea
 *
 * Extracted from QRInputArea.astro inline <script> to keep the
 * Astro component focused on template and CSS.
 *
 * Handles:
 *  - WASM prefetch when inputs receive focus
 *  - Content-type switcher (dropdown open/close, icon rendering)
 *  - setContentType global helper
 */

// ─── WASM Prefetch ─────────────────────────────────────────────

let wasmPrefetchPromise: Promise<any> | null = null;
let wasmPrefetchScheduled = false;

function scheduleWasmPrefetchOnce(): void {
    if (wasmPrefetchScheduled) return;
    wasmPrefetchScheduled = true;

    const run = (): Promise<any> | null => {
        if (wasmPrefetchPromise) return wasmPrefetchPromise;
        wasmPrefetchPromise = import('../lib/wasm-qr-loader')
            .then((m) => m.getHoliWasmQr())
            .catch(() => null);
        return wasmPrefetchPromise;
    };

    if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
        (window as any).requestIdleCallback(() => run(), { timeout: 1200 });
    } else {
        setTimeout(run, 200);
    }
}

// ─── Dropdown elements (captured once) ─────────────────────────

const typeSwitcherBtn = document.getElementById('type-switcher-btn');
const typeDropdown = document.getElementById('type-dropdown');
const typeIcon = document.getElementById('current-type-icon');
const typeLabel = document.getElementById('current-type-label');
const typeOptions = document.querySelectorAll('.type-option');
const templates = document.querySelectorAll('.input-template');

function closeTypeDropdown(): void {
    if (typeSwitcherBtn) typeSwitcherBtn.classList.remove('open');
    if (typeDropdown) typeDropdown.classList.remove('open');
}

// ─── Icon Initialization ───────────────────────────────────────

function initDropdownIcons(): void {
    if (!(window as any).getIconSvg) {
        setTimeout(initDropdownIcons, 50);
        return;
    }

    document.querySelectorAll('.type-option .icon').forEach((iconEl) => {
        const iconName = iconEl.textContent?.trim();
        const opt = iconEl.closest('.type-option');
        if (opt && iconName) opt.setAttribute('data-icon', iconName);
        if (iconName && !iconEl.querySelector('svg')) {
            iconEl.innerHTML = (window as any).getIconSvg(iconName, 18);
        }
    });
}

// ─── Event Binding ─────────────────────────────────────────────

export function initInputArea(): void {
    // WASM prefetch on input focus
    document.addEventListener('focusin', (e) => {
        const t = e.target as HTMLElement | null;
        if (!t?.closest) return;
        if (t.closest('.shared-input-container')) scheduleWasmPrefetchOnce();
    }, { passive: true });

    // Init icons
    initDropdownIcons();

    // Toggle dropdown
    if (typeSwitcherBtn && typeDropdown) {
        typeSwitcherBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const willOpen = !typeDropdown.classList.contains('open');
            if (willOpen) {
                typeSwitcherBtn.classList.add('open');
                typeDropdown.classList.add('open');
                const active = typeDropdown.querySelector('.type-option.active');
                if (active && (active as HTMLElement).scrollIntoView) {
                    (active as HTMLElement).scrollIntoView({ block: 'nearest' });
                }
            } else {
                closeTypeDropdown();
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            const t = e.target as HTMLElement | null;
            if (!t?.closest) return;
            if (t.closest('.type-switcher-wrapper')) return;
            closeTypeDropdown();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeTypeDropdown();
        });
    }

    // Select type from dropdown
    typeOptions.forEach((opt) => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = opt.getAttribute('data-type');
            if (type && (window as any).setContentType) {
                (window as any).setContentType(type);
            }
            closeTypeDropdown();
        });
    });

    // Global setContentType
    (window as any).setContentType = function (type: string) {
        (window as any).currentContentType = type;

        const opt = document.querySelector(`.type-option[data-type="${type}"]`);
        if (!opt) return;

        const iconEl = opt.querySelector('.icon');
        const labelEl = opt.querySelector('span:last-child');

        const iconName =
            opt.getAttribute('data-icon') ||
            (iconEl ? iconEl.textContent?.trim() : 'link') ||
            'link';
        const labelText = labelEl
            ? labelEl.textContent?.trim() || type.toUpperCase()
            : type.toUpperCase();

        if (typeIcon && typeof (window as any).getIconSvg === 'function') {
            typeIcon.innerHTML = (window as any).getIconSvg(iconName, 20);
        }
        if (typeLabel) typeLabel.textContent = labelText;

        typeOptions.forEach((o) => {
            o.classList.toggle('active', o.getAttribute('data-type') === type);
        });

        templates.forEach((tpl) => {
            tpl.classList.toggle('active', tpl.id === 'template-' + type);
        });

        const event = new CustomEvent('qr-type-changed', {
            detail: { type },
        });
        window.dispatchEvent(event);
    };
}

// Auto-initialize when module runs (matches the IIFE pattern of the original)
initInputArea();

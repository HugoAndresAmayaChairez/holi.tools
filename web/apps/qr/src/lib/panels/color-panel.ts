/**
 * Color Panel Logic
 * Handles color selection, gradients, and transparent background
 */

import { dispatchQREvent, QREvents } from '../core/events';

// =============================================================================
// COLOR HANDLING
// =============================================================================

export function updateColor(type: 'fg' | 'bg', value: string): void {
    dispatchQREvent(QREvents.COLOR_CHANGE, { type, value });

    // Also update global state for compatibility
    const state = (window as any).state;
    if (state?.config) {
        state.config[type] = value;
        (window as any).updateQR?.();
    }
}

export function toggleBgTransparent(enabled: boolean): void {
    const bgPicker = document.getElementById('color-bg') as HTMLInputElement | null;
    const bgColorRow = document.getElementById('bg-color-row');

    if (bgColorRow) {
        bgColorRow.style.opacity = enabled ? '0.5' : '1';
    }

    const state = (window as any).state;
    if (state?.config) {
        state.config.bg = enabled ? 'transparent' : (bgPicker?.value || '#ffffff');
        (window as any).updateQR?.();
    }
}

// =============================================================================
// GRADIENT HANDLING
// =============================================================================

export function toggleGradient(enabled: boolean): void {
    const controls = document.getElementById('gradient-controls');
    if (controls) {
        controls.style.display = enabled ? 'flex' : 'none';
    }

    const state = (window as any).state;
    if (state?.config) {
        state.config.gradientEnabled = enabled;
        if (enabled && !state.config.gradientColors) {
            state.config.gradientColors = ['#6366f1', '#ec4899'];
            state.config.gradientType = 'linear';
            state.config.gradientAngle = 45;
        }
        (window as any).updateQR?.();
    }
}

export function updateGradient(): void {
    const typeSelect = document.getElementById('gradient-type') as HTMLSelectElement | null;
    const color2Input = document.getElementById('gradient-color-2') as HTMLInputElement | null;
    const angleInput = document.getElementById('gradient-angle') as HTMLInputElement | null;

    if (!typeSelect || !color2Input || !angleInput) return;

    const type = parseInt(typeSelect.value);
    const color2 = color2Input.value;
    const angle = parseInt(angleInput.value);

    // Show/Hide controls based on type
    const colorRow = document.getElementById('gradient-color-row');
    const angleRow = document.getElementById('gradient-angle-row');

    if (colorRow) colorRow.style.display = type > 0 ? 'flex' : 'none';
    if (angleRow) angleRow.style.display = (type === 1 || type === 3) ? 'flex' : 'none';

    // Dispatch typed event
    dispatchQREvent(QREvents.GRADIENT_CHANGE, {
        type,
        color2,
        angle: angle * (Math.PI / 180) // Convert to radians
    });
}

export function setGradientType(type: number): void {
    const typeSelect = document.getElementById('gradient-type') as HTMLSelectElement | null;
    if (typeSelect) {
        typeSelect.value = type.toString();
        updateGradient();
    }
}

// =============================================================================
// PRESETS
// =============================================================================

export function applyTransparentPreset(): void {
    const fgPicker = document.getElementById('color-fg') as HTMLInputElement | null;
    const bgCheck = document.getElementById('chk-bg-transparent') as HTMLInputElement | null;

    if (fgPicker) {
        fgPicker.value = '#000000';
        updateColor('fg', '#000000');
    }

    if (bgCheck && !bgCheck.checked) {
        bgCheck.checked = true;
        toggleBgTransparent(true);
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export function initColorPanel(): void {
    // Set up event listeners for color pickers
    const fgPicker = document.getElementById('color-fg') as HTMLInputElement | null;
    const bgPicker = document.getElementById('color-bg') as HTMLInputElement | null;
    const bgTransparentCheck = document.getElementById('chk-bg-transparent') as HTMLInputElement | null;

    fgPicker?.addEventListener('input', (e) => {
        updateColor('fg', (e.target as HTMLInputElement).value);
    });

    bgPicker?.addEventListener('input', (e) => {
        updateColor('bg', (e.target as HTMLInputElement).value);
    });

    bgTransparentCheck?.addEventListener('change', (e) => {
        toggleBgTransparent((e.target as HTMLInputElement).checked);
    });
}

// Expose to window for HTML onclick handlers
if (typeof window !== 'undefined') {
    (window as any).updateColor = updateColor;
    (window as any).toggleGradient = toggleGradient;
    (window as any).updateGradient = updateGradient;
    (window as any).setGradientType = setGradientType;
    (window as any).toggleBgTransparent = toggleBgTransparent;
    (window as any).applyTransparentPreset = applyTransparentPreset;
}

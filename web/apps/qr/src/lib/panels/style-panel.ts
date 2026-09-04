/**
 * Style Panel Logic
 * Handles Liquid effect, Noise effect, and Preset application
 */

import { dispatchQREvent, dispatchQREventThrottled, QREvents } from '../core/events';

// =============================================================================
// STATE
// =============================================================================

interface EffectsState {
    liquid: boolean;
    blur: number;
    thresh: number;
}

interface NoiseState {
    enabled: boolean;
    amount: number;
    scale: number;
}

const currentEffects: EffectsState = { liquid: false, blur: 0.55, thresh: 8 };
const currentNoise: NoiseState = { enabled: false, amount: 30, scale: 100 };

// =============================================================================
// LIQUID EFFECT
// =============================================================================

export function initLiquidToggle(): void {
    const toggle = document.getElementById('effect-liquid-toggle') as HTMLInputElement | null;
    if (!toggle) return;

    // Clone to strip old listeners
    const newToggle = toggle.cloneNode(true) as HTMLInputElement;
    toggle.parentNode?.replaceChild(newToggle, toggle);

    newToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        toggleLiquid(target.checked);
    });

    // Restore state
    newToggle.checked = currentEffects.liquid;
}

export function toggleLiquid(enabled: boolean): void {
    currentEffects.liquid = enabled;

    const controls = document.getElementById('liquid-controls');
    if (controls) controls.style.display = enabled ? 'flex' : 'none';

    dispatchQREvent(QREvents.EFFECT_CHANGE, {
        liquid: currentEffects.liquid,
        blur: currentEffects.blur,
        thresh: currentEffects.thresh
    });
}

export function updateLiquidParam(key: 'blur' | 'thresh', value: string): void {
    const numValue = parseFloat(value);

    if (key === 'blur') currentEffects.blur = numValue;
    if (key === 'thresh') currentEffects.thresh = numValue;

    // Throttled for 60fps slider updates
    dispatchQREventThrottled(QREvents.FILTER_TWEAK, {
        blur: currentEffects.blur,
        thresh: currentEffects.thresh
    });
}

// =============================================================================
// NOISE EFFECT
// =============================================================================

export function initNoiseToggle(): void {
    const toggle = document.getElementById('effect-noise-toggle') as HTMLInputElement | null;
    if (!toggle) return;

    const newToggle = toggle.cloneNode(true) as HTMLInputElement;
    toggle.parentNode?.replaceChild(newToggle, toggle);

    newToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        toggleNoise(target.checked);
    });

    newToggle.checked = currentNoise.enabled;
}

export function toggleNoise(enabled: boolean): void {
    currentNoise.enabled = enabled;

    const controls = document.getElementById('noise-controls');
    if (controls) controls.style.display = enabled ? 'flex' : 'none';

    dispatchQREvent(QREvents.NOISE_CHANGE, { ...currentNoise });
}

export function updateNoiseParam(key: 'amount' | 'scale', value: string): void {
    const numValue = parseFloat(value);

    if (key === 'amount') currentNoise.amount = numValue;
    if (key === 'scale') currentNoise.scale = numValue;

    dispatchQREvent(QREvents.NOISE_CHANGE, { ...currentNoise });
}

// =============================================================================
// PRESETS
// =============================================================================

export function applyPreset(
    body: string,
    frame: string,
    ball: string,
    effectLiquid: boolean
): void {
    // Call global setters if available
    if (typeof (window as any).setBodyShape === 'function') {
        (window as any).setBodyShape(body);
    }
    if (typeof (window as any).setEyeFrame === 'function') {
        (window as any).setEyeFrame(frame);
    }
    if (typeof (window as any).setEyeBall === 'function') {
        (window as any).setEyeBall(ball);
    }

    // Update toggle visual
    const toggle = document.getElementById('effect-liquid-toggle') as HTMLInputElement | null;
    if (toggle) toggle.checked = effectLiquid;

    // Trigger effect
    toggleLiquid(effectLiquid);
}

// =============================================================================
// UI HELPERS
// =============================================================================

export function setActiveButton(group: string, value: string): void {
    document.querySelectorAll(`button[data-${group}]`).forEach((btn) => {
        const button = btn as HTMLButtonElement;
        if (button.dataset[group] === value) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

export function initStylePanel(): void {
    initLiquidToggle();
    initNoiseToggle();
}

// Auto-init on page load
if (typeof document !== 'undefined') {
    initStylePanel();
    document.addEventListener('astro:page-load', initStylePanel);
}

// Expose to window for onclick handlers in HTML
if (typeof window !== 'undefined') {
    (window as any).toggleLiquid = toggleLiquid;
    (window as any).toggleNoise = toggleNoise;
    (window as any).updateLiquidParam = updateLiquidParam;
    (window as any).updateNoiseParam = updateNoiseParam;
    (window as any).applyPreset = applyPreset;
}

/**
 * Typed Event System for QR Generator
 * Provides type-safe event dispatching and listening
 */

import type {
    GradientChangeEvent,
    NoiseChangeEvent,
    EffectChangeEvent,
    FilterTweakEvent,
    ColorChangeEvent
} from './types';

// =============================================================================
// EVENT NAMES (Constants)
// =============================================================================

export const QREvents = {
    GRADIENT_CHANGE: 'qr-gradient-change',
    NOISE_CHANGE: 'qr-noise-change',
    EFFECT_CHANGE: 'qr-effect-change',
    FILTER_TWEAK: 'qr-filter-tweak',
    COLOR_CHANGE: 'qr-color-change',
    // SHAPE_CHANGE and LOGO_CHANGE removed - were defined but never used
} as const;

export type QREventName = typeof QREvents[keyof typeof QREvents];

// =============================================================================
// EVENT TYPE MAP
// =============================================================================

interface QREventMap {
    [QREvents.GRADIENT_CHANGE]: GradientChangeEvent;
    [QREvents.NOISE_CHANGE]: NoiseChangeEvent;
    [QREvents.EFFECT_CHANGE]: EffectChangeEvent;
    [QREvents.FILTER_TWEAK]: FilterTweakEvent;
    [QREvents.COLOR_CHANGE]: ColorChangeEvent;
}

// =============================================================================
// TYPED EVENT HELPERS
// =============================================================================

/**
 * Dispatch a typed QR event
 */
export function dispatchQREvent<K extends keyof QREventMap>(
    eventName: K,
    detail: QREventMap[K]
): void {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// addQRListener and addQRListenerOnce removed - were never used in codebase

// =============================================================================
// UTILITY: Throttled dispatch for 60fps updates
// =============================================================================

const throttleTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};

export function dispatchQREventThrottled<K extends keyof QREventMap>(
    eventName: K,
    detail: QREventMap[K],
    delayMs: number = 16 // ~60fps
): void {
    if (throttleTimers[eventName]) return;

    throttleTimers[eventName] = setTimeout(() => {
        dispatchQREvent(eventName, detail);
        throttleTimers[eventName] = null;
    }, delayMs);
}

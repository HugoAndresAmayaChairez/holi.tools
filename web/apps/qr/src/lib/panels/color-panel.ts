/**
 * Color Panel Logic
 * Handles color selection, gradients, and transparent background
 */

import { dispatchQREvent, QREvents } from "../core/events";
import { ensureLayersConfig } from "../core/layers";
import { hexToRgba } from "../utils/color";

function getLayers(): any {
  const state = (window as any).state;
  if (state?.config) return ensureLayersConfig(state.config);
  return null;
}

// =============================================================================
// COLOR HANDLING
// =============================================================================

export function updateColor(type: "fg" | "bg", value: string): void {
  const state = (window as any).state;
  const valueToStore = value;

  dispatchQREvent(QREvents.COLOR_CHANGE, { type, value: valueToStore });

  // Also update global state for compatibility
  if (state?.config) {
    state.config[type] = valueToStore;
    const layers = getLayers();
    if (layers) {
      if (type === "fg") {
        layers.ink.color = valueToStore;
        const alpha = hexToRgba(valueToStore)[3] ?? 1;
        layers.ink.enabled = alpha > 0.001;
      } else {
        // Paper: keep color even when turning transparent; toggle enable separately.
        if (valueToStore !== "transparent") layers.paper.color = valueToStore;
        layers.paper.enabled = valueToStore !== "transparent";
      }
    }
    (window as any).updateQR?.();
  }
}

// =============================================================================
// GRADIENT HANDLING
// =============================================================================

export function toggleGradient(enabled: boolean): void {
  const controls = document.getElementById("gradient-controls");
  if (controls) {
    controls.style.display = enabled ? "flex" : "none";
  }

  const state = (window as any).state;
  if (state?.config) {
    state.config.gradientEnabled = enabled;
    if (enabled && !state.config.gradientColors) {
      state.config.gradientColors = ["#6366f1", "#ec4899"];
      // WebGL expects numeric type (0..4). 1 = linear.
      state.config.gradientType = 1;
      // WebGL shaders use radians.
      state.config.gradientAngle = 45 * (Math.PI / 180);
    }
    const layers = getLayers();
    if (layers) {
      if (!enabled) {
        layers.ink.gradient.type = 0;
      } else {
        layers.ink.gradient.type = (
          typeof state.config.gradientType === "number"
            ? state.config.gradientType
            : 1
        ) as number;
        layers.ink.gradient.angle = (
          typeof state.config.gradientAngle === "number"
            ? state.config.gradientAngle
            : 0
        ) as number;
        const c2 =
          (state.config.gradientColors && state.config.gradientColors[1]) ||
          layers.ink.color ||
          "#000000";
        layers.ink.gradient.color2 = c2;
      }
    }
    (window as any).updateQR?.();
  }
}

export function updateGradient(): void {
  const typeSelect = document.getElementById(
    "gradient-type"
  ) as HTMLSelectElement | null;
  const color2Input = document.getElementById(
    "gradient-color-2"
  ) as HTMLInputElement | null;
  const angleInput = document.getElementById(
    "gradient-angle"
  ) as HTMLInputElement | null;

  if (!typeSelect || !color2Input || !angleInput) return;

  const type = parseInt(typeSelect.value);
  const color2 = color2Input.value;
  const angle = parseInt(angleInput.value);

  // Show/Hide controls based on type
  const colorRow = document.getElementById("gradient-color-row");
  const angleRow = document.getElementById("gradient-angle-row");

  if (colorRow) colorRow.style.display = type > 0 ? "flex" : "none";
  if (angleRow)
    angleRow.style.display = type === 1 || type === 3 ? "flex" : "none";

  // Dispatch typed event
  dispatchQREvent(QREvents.GRADIENT_CHANGE, {
    type,
    color2,
    angle: angle * (Math.PI / 180), // Convert to radians
  });
}

export function applyGradientPreset(
  type: number,
  color1: string,
  color2: string,
  angleDeg: number = 45
): void {
  const fgPicker = document.getElementById(
    "color-fg"
  ) as HTMLInputElement | null;
  const typeSelect = document.getElementById(
    "gradient-type"
  ) as HTMLSelectElement | null;
  const color2Input = document.getElementById(
    "gradient-color-2"
  ) as HTMLInputElement | null;
  const angleInput = document.getElementById(
    "gradient-angle"
  ) as HTMLInputElement | null;

  if (fgPicker) fgPicker.value = color1;
  updateColor("fg", color1);

  if (typeSelect) typeSelect.value = String(type);
  if (color2Input) color2Input.value = color2;
  if (angleInput) angleInput.value = String(angleDeg);

  updateGradient();
}

export function setGradientType(type: number): void {
  const typeSelect = document.getElementById(
    "gradient-type"
  ) as HTMLSelectElement | null;
  if (typeSelect) {
    typeSelect.value = type.toString();
    updateGradient();
  }
}

// =============================================================================
// PRESETS
// =============================================================================

export function applyColorPreset(fg: string, bg: string): void {
  const fgPicker = document.getElementById(
    "color-fg"
  ) as HTMLInputElement | null;
  const bgPicker = document.getElementById(
    "color-bg"
  ) as HTMLInputElement | null;

  // Apply colors
  if (fgPicker) {
    fgPicker.value = fg;
    updateColor("fg", fg);
  }

  if (bgPicker) {
    bgPicker.value = bg;
    updateColor("bg", bg);
  }

  const layers = getLayers();
  if (layers) {
    layers.ink.enabled = true;
    layers.ink.opacity = 1;
    layers.paper.enabled = true;
    layers.paper.opacity = 1;
    (window as any).updateQR?.();
  }
}

export function applyTransparentPreset(): void {
  const fgPicker = document.getElementById(
    "color-fg"
  ) as HTMLInputElement | null;

  if (fgPicker) {
    fgPicker.value = "#000000";
    updateColor("fg", "#000000");
  }
  const layers = getLayers();
  if (layers) {
    layers.paper.enabled = false;
    (window as any).updateQR?.();
  } else {
    const state = (window as any).state;
    if (state?.config) {
      state.config.bg = "transparent";
      (window as any).updateQR?.();
    }
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let didInit = false;

export function initColorPanel(): void {
  if (didInit) return;
  didInit = true;

  // Set up event listeners for color pickers
  const fgPicker = document.getElementById(
    "color-fg"
  ) as HTMLInputElement | null;
  const bgPicker = document.getElementById(
    "color-bg"
  ) as HTMLInputElement | null;

  fgPicker?.addEventListener("input", (e) => {
    updateColor("fg", (e.target as HTMLInputElement).value);
  });

  bgPicker?.addEventListener("input", (e) => {
    updateColor("bg", (e.target as HTMLInputElement).value);
  });
}

// Expose to window for HTML onclick handlers
// Expose to window for HTML onclick handlers
if (typeof window !== "undefined") {
  (window as any).updateColor = updateColor;
  (window as any).toggleGradient = toggleGradient;
  (window as any).updateGradient = updateGradient;
  (window as any).setGradientType = setGradientType;
  (window as any).applyGradientPreset = applyGradientPreset;
  (window as any).applyTransparentPreset = applyTransparentPreset;
  (window as any).applyColorPreset = applyColorPreset; // Exposed!
  (window as any).initColorPanel = initColorPanel;

  // Auto-init once on the client so checkbox toggles always work.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initColorPanel(), {
      once: true,
    });
  } else {
    initColorPanel();
  }
}

/**
 * controller-layers.ts — Layer synchronization logic
 *
 * Pure functions that translate between the legacy flat QRConfig and
 * the canonical QRLayersConfig.  Extracted from QRController to keep
 * the god-object manageable.
 */
import { hexToRgba } from './utils/color';
import { stripHexAlpha, type QRLayersConfig } from './core/layers';
import type { QRConfig } from './qr-engine';

// ─── Legacy → Layers ──────────────────────────────────────────────

/**
 * Populate a QRLayersConfig from the flat legacy QRConfig fields.
 * Mutates `layers` in place.
 */
export function importLegacyIntoLayers(config: QRConfig, layers: QRLayersConfig): void {
    // Colors
    const fg = config.fg;
    if (typeof fg === 'string' && fg.length > 0) {
        if (fg === 'transparent') {
            layers.ink.enabled = false;
            layers.ink.opacity = 0;
        } else {
            const rgba = hexToRgba(fg);
            layers.ink.opacity = rgba[3] ?? 1;
            layers.ink.color = stripHexAlpha(fg);
            layers.ink.enabled = (layers.ink.opacity ?? 1) > 0.001;
        }
    }

    const bg = config.bg;
    if (typeof bg === 'string' && bg.length > 0 && bg !== 'transparent') {
        const rgba = hexToRgba(bg);
        layers.paper.opacity = rgba[3] ?? 1;
        layers.paper.color = stripHexAlpha(bg);
    }

    const bgAlpha = bg === 'transparent' ? 0 : (layers.paper.opacity ?? 1);
    layers.paper.enabled = bg !== 'transparent' && bgAlpha > 0.001;
    if (!layers.paper.enabled) layers.paper.opacity = 0;

    // Card / Art / Logo images
    layers.card.image = config.frameImage;
    layers.bg.enabled = true;
    layers.bg.image = (config.artEnabled && config.artImage) ? config.artImage : undefined;
    layers.bg.opacity = config.artOpacity ?? layers.bg.opacity;
    layers.bg.blendMode = config.artBlendMode || layers.bg.blendMode;
    layers.bg.fit = config.artFit || layers.bg.fit;
    layers.bg.rotation = config.artRotation ?? layers.bg.rotation;
    layers.bg.scale = config.artScale ?? layers.bg.scale;
    layers.bg.offsetX = config.artOffsetX ?? layers.bg.offsetX;
    layers.bg.offsetY = config.artOffsetY ?? layers.bg.offsetY;

    layers.logo.image = config.logo;
    layers.logo.enabled = !!config.logo;

    // Ink effects (legacy → layered)
    layers.ink.liquid.enabled = !!config.effectLiquid;
    if (typeof config.effectBlur === 'number') layers.ink.liquid.blur = config.effectBlur;
    if (typeof config.effectCrystalize === 'number') layers.ink.liquid.thresh = config.effectCrystalize;

    layers.ink.noise.enabled = !!config.noiseEnabled;
    if (typeof config.noiseAmount === 'number') layers.ink.noise.amount = config.noiseAmount;
    if (typeof config.noiseScale === 'number') layers.ink.noise.scale = config.noiseScale;

    const rawType = config.gradientType;
    const gType = (typeof rawType === 'number' && Number.isFinite(rawType))
        ? rawType
        : (typeof rawType === 'string' && /^-?\d+$/.test(rawType.trim()) ? parseInt(rawType.trim(), 10) : 0);

    layers.ink.gradient.type = gType;
    const c2 = (config.gradientColors && config.gradientColors[1]) || layers.ink.color || '#000000';
    layers.ink.gradient.color2 = c2;
    if (typeof config.gradientAngle === 'number') layers.ink.gradient.angle = config.gradientAngle;
}

// ─── Layers → Legacy ──────────────────────────────────────────────

/**
 * Write the canonical layer state back into the flat QRConfig fields.
 * Mutates `config` in place.
 */
export function syncLegacyFromLayers(config: QRConfig, layers: QRLayersConfig): void {
    // Core colors
    config.fg = layers.ink.color || '#000000';
    config.bg = layers.paper.enabled ? (layers.paper.color || '#ffffff') : 'transparent';

    // Images
    config.frameImage = (layers.card.enabled ? layers.card.image : undefined);
    config.artEnabled = !!(layers.bg.enabled && layers.bg.image);
    config.artImage = layers.bg.image;
    config.artOpacity = layers.bg.opacity;
    config.artBlendMode = layers.bg.blendMode;
    config.artFit = layers.bg.fit;
    config.artRotation = layers.bg.rotation;
    config.artScale = layers.bg.scale;
    config.artOffsetX = layers.bg.offsetX;
    config.artOffsetY = layers.bg.offsetY;

    config.logo = (layers.logo.enabled ? layers.logo.image : undefined);

    // Ink effects
    config.effectLiquid = layers.ink.liquid.enabled;
    config.effectBlur = layers.ink.liquid.blur;
    config.effectCrystalize = layers.ink.liquid.thresh;

    config.noiseEnabled = layers.ink.noise.enabled;
    config.noiseAmount = layers.ink.noise.enabled ? layers.ink.noise.amount : 0;
    config.noiseScale = layers.ink.noise.scale;

    config.gradientType = layers.ink.gradient.type;
    config.gradientColors = [config.fg, layers.ink.gradient.color2];
    config.gradientAngle = layers.ink.gradient.angle;
    config.gradientEnabled = layers.ink.gradient.type > 0;
}

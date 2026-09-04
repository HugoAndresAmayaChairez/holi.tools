/**
 * controller-layers.test.ts — Tests for legacy ↔ layers synchronization
 *
 * These are the most valuable tests since importLegacyIntoLayers and
 * syncLegacyFromLayers are pure functions with complex branching.
 */
import { describe, it, expect } from 'vitest';
import { importLegacyIntoLayers, syncLegacyFromLayers } from './controller-layers';
import { createDefaultLayersConfig } from './core/layers';
import type { QRConfig } from './qr-engine';

function makeConfig(overrides: Partial<QRConfig> = {}): QRConfig {
    return {
        fg: '#000000',
        bg: '#ffffff',
        bodyShape: 'square',
        eyeFrameShape: 'square',
        eyeBallShape: 'square',
        ecc: 'M',
        ...overrides,
    };
}

describe('controller-layers', () => {
    describe('createDefaultLayersConfig', () => {
        it('should use QR-relative layer bounds and logo contain fit by default', () => {
            const layers = createDefaultLayersConfig();

            expect(layers.ink.scale).toBe(1);
            expect(layers.paper.boundsScale).toBe(1.1);
            expect(layers.bg.boundsScale).toBe(1.25);
            expect(layers.logo.fit).toBe('contain');
        });
    });

    // ─── importLegacyIntoLayers ──────────────────────────────────

    describe('importLegacyIntoLayers', () => {
        it('should map fg color to ink layer', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ fg: '#ff0000' }), layers);

            expect(layers.ink.color).toBe('#ff0000');
            expect(layers.ink.enabled).toBe(true);
            expect(layers.ink.opacity).toBe(1);
        });

        it('should handle transparent fg by disabling ink', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ fg: 'transparent' }), layers);

            expect(layers.ink.enabled).toBe(false);
            expect(layers.ink.opacity).toBe(0);
        });

        it('should handle fg with alpha channel', () => {
            const layers = createDefaultLayersConfig();
            // #ff000080 = red at ~50% opacity
            importLegacyIntoLayers(makeConfig({ fg: '#ff000080' }), layers);

            expect(layers.ink.color).toBe('#ff0000');
            expect(layers.ink.opacity).toBeCloseTo(0.502, 1);
            expect(layers.ink.enabled).toBe(true);
        });

        it('should map bg color to paper layer', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ bg: '#00ff00' }), layers);

            expect(layers.paper.color).toBe('#00ff00');
            expect(layers.paper.enabled).toBe(true);
        });

        it('should handle transparent bg by disabling paper', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ bg: 'transparent' }), layers);

            expect(layers.paper.enabled).toBe(false);
            expect(layers.paper.opacity).toBe(0);
        });

        it('should map art settings to bg layer', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({
                artEnabled: true,
                artImage: 'data:image/png;base64,...',
                artOpacity: 0.7,
                artBlendMode: 'multiply',
                artFit: 'contain',
                artRotation: 45,
                artScale: 1.5,
                artOffsetX: 0.1,
                artOffsetY: -0.2,
            }), layers);

            expect(layers.bg.image).toBe('data:image/png;base64,...');
            expect(layers.bg.opacity).toBe(0.7);
            expect(layers.bg.blendMode).toBe('multiply');
            expect(layers.bg.fit).toBe('contain');
            expect(layers.bg.rotation).toBe(45);
            expect(layers.bg.scale).toBe(1.5);
            expect(layers.bg.offsetX).toBe(0.1);
            expect(layers.bg.offsetY).toBe(-0.2);
        });

        it('should not set bg image when art is disabled', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({
                artEnabled: false,
                artImage: 'data:image/png;base64,...',
            }), layers);

            expect(layers.bg.image).toBeUndefined();
        });

        it('should map logo to logo layer', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ logo: 'logo.png', logoFit: 'cover' }), layers);

            expect(layers.logo.image).toBe('logo.png');
            expect(layers.logo.enabled).toBe(true);
            expect(layers.logo.fit).toBe('cover');
        });

        it('should disable logo layer when no logo', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ logo: undefined }), layers);

            expect(layers.logo.enabled).toBe(false);
        });

        it('should map liquid effect settings', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({
                effectLiquid: true,
                effectBlur: 0.7,
                effectCrystalize: 8,
            }), layers);

            expect(layers.ink.liquid.enabled).toBe(true);
            expect(layers.ink.liquid.blur).toBe(0.7);
            expect(layers.ink.liquid.thresh).toBe(8);
        });

        it('should map noise settings', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({
                noiseEnabled: true,
                noiseAmount: 0.5,
                noiseScale: 200,
            }), layers);

            expect(layers.ink.noise.enabled).toBe(true);
            expect(layers.ink.noise.amount).toBe(0.5);
            expect(layers.ink.noise.scale).toBe(200);
        });

        it('should map gradient settings', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({
                gradientType: 1,
                gradientColors: ['#ff0000', '#0000ff'],
                gradientAngle: 90,
            }), layers);

            expect(layers.ink.gradient.type).toBe(1);
            expect(layers.ink.gradient.color2).toBe('#0000ff');
            expect(layers.ink.gradient.angle).toBe(90);
        });

        it('should handle gradient type as string', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({
                gradientType: '2' as any,
            }), layers);

            expect(layers.ink.gradient.type).toBe(2);
        });

        it('should map frameImage to card layer', () => {
            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(makeConfig({ frameImage: 'card.png' }), layers);

            expect(layers.card.image).toBe('card.png');
        });
    });

    // ─── syncLegacyFromLayers ────────────────────────────────────

    describe('syncLegacyFromLayers', () => {
        it('should write ink color to config.fg', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.ink.color = '#ff5500';

            syncLegacyFromLayers(config, layers);

            expect(config.fg).toBe('#ff5500');
        });

        it('should write paper color to config.bg', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.paper.enabled = true;
            layers.paper.color = '#aabbcc';

            syncLegacyFromLayers(config, layers);

            expect(config.bg).toBe('#aabbcc');
        });

        it('should set bg to transparent when paper is disabled', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.paper.enabled = false;

            syncLegacyFromLayers(config, layers);

            expect(config.bg).toBe('transparent');
        });

        it('should round-trip art settings', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.bg.enabled = true;
            layers.bg.image = 'art.jpg';
            layers.bg.opacity = 0.8;
            layers.bg.blendMode = 'overlay';
            layers.bg.fit = 'fill';
            layers.bg.rotation = 30;
            layers.bg.scale = 2;
            layers.bg.offsetX = 0.3;
            layers.bg.offsetY = -0.1;

            syncLegacyFromLayers(config, layers);

            expect(config.artEnabled).toBe(true);
            expect(config.artImage).toBe('art.jpg');
            expect(config.artOpacity).toBe(0.8);
            expect(config.artBlendMode).toBe('overlay');
            expect(config.artFit).toBe('fill');
            expect(config.artRotation).toBe(30);
            expect(config.artScale).toBe(2);
            expect(config.artOffsetX).toBe(0.3);
            expect(config.artOffsetY).toBe(-0.1);
        });

        it('should disable art when bg layer has no image', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.bg.enabled = true;
            layers.bg.image = undefined;

            syncLegacyFromLayers(config, layers);

            expect(config.artEnabled).toBe(false);
        });

        it('should sync layer bounds and logo fit', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.bg.boundsScale = 1.25;
            layers.paper.boundsScale = 1.1;
            layers.logo.fit = 'fill';

            syncLegacyFromLayers(config, layers);

            expect(config.artBoundsScale).toBe(1.25);
            expect(config.paperBoundsScale).toBe(1.1);
            expect(config.logoFit).toBe('fill');
        });

        it('should sync liquid effect settings', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.ink.liquid.enabled = true;
            layers.ink.liquid.blur = 0.5;
            layers.ink.liquid.thresh = 10;

            syncLegacyFromLayers(config, layers);

            expect(config.effectLiquid).toBe(true);
            expect(config.effectBlur).toBe(0.5);
            expect(config.effectCrystalize).toBe(10);
        });

        it('should sync noise settings', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.ink.noise.enabled = true;
            layers.ink.noise.amount = 0.6;
            layers.ink.noise.scale = 150;

            syncLegacyFromLayers(config, layers);

            expect(config.noiseEnabled).toBe(true);
            expect(config.noiseAmount).toBe(0.6);
            expect(config.noiseScale).toBe(150);
        });

        it('should set noise amount to 0 when disabled', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.ink.noise.enabled = false;
            layers.ink.noise.amount = 0.8;

            syncLegacyFromLayers(config, layers);

            expect(config.noiseEnabled).toBe(false);
            expect(config.noiseAmount).toBe(0);
        });

        it('should sync gradient settings', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.ink.gradient.type = 2;
            layers.ink.gradient.color2 = '#00ff00';
            layers.ink.gradient.angle = 270;
            layers.ink.color = '#ff0000';

            syncLegacyFromLayers(config, layers);

            expect(config.gradientType).toBe(2);
            expect(config.gradientColors).toEqual(['#ff0000', '#00ff00']);
            expect(config.gradientAngle).toBe(270);
            expect(config.gradientEnabled).toBe(true);
        });

        it('should disable gradient when type is 0', () => {
            const config = makeConfig();
            const layers = createDefaultLayersConfig();
            layers.ink.gradient.type = 0;

            syncLegacyFromLayers(config, layers);

            expect(config.gradientEnabled).toBe(false);
        });

        it('should round-trip import → sync', () => {
            const original = makeConfig({
                fg: '#ff5500',
                bg: '#003366',
                artEnabled: true,
                artImage: 'photo.jpg',
                artOpacity: 0.85,
                logo: 'icon.svg',
                effectLiquid: true,
                effectBlur: 0.4,
                effectCrystalize: 5,
            });

            const layers = createDefaultLayersConfig();
            importLegacyIntoLayers(original, layers);

            const roundTrip = makeConfig();
            syncLegacyFromLayers(roundTrip, layers);

            expect(roundTrip.fg).toBe('#ff5500');
            expect(roundTrip.bg).toBe('#003366');
            expect(roundTrip.artEnabled).toBe(true);
            expect(roundTrip.artImage).toBe('photo.jpg');
            expect(roundTrip.artOpacity).toBe(0.85);
            expect(roundTrip.logo).toBe('icon.svg');
            expect(roundTrip.effectLiquid).toBe(true);
            expect(roundTrip.effectBlur).toBe(0.4);
            expect(roundTrip.effectCrystalize).toBe(5);
        });
    });
});

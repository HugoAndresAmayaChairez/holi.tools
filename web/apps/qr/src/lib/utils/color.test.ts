import { describe, it, expect } from 'vitest';
import { hexToRgb, parseBgColor, getLuminance, isLightColor } from './color';

describe('Color Utilities', () => {
    describe('hexToRgb', () => {
        it('should convert hex to normalized RGB', () => {
            expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
            expect(hexToRgb('#FFFFFF')).toEqual([1, 1, 1]);
            expect(hexToRgb('#FF0000')).toEqual([1, 0, 0]);
        });

        it('should handle hex without hash', () => {
            expect(hexToRgb('000000')).toEqual([0, 0, 0]);
            expect(hexToRgb('FFFFFF')).toEqual([1, 1, 1]);
        });

        it('should handle lowercase hex', () => {
            expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
            expect(hexToRgb('#00ff00')).toEqual([0, 1, 0]);
        });
    });

    describe('parseBgColor', () => {
        it('should return undefined for transparent', () => {
            expect(parseBgColor('transparent')).toBeUndefined();
            expect(parseBgColor(undefined)).toBeUndefined();
        });

        it('should parse valid hex colors', () => {
            expect(parseBgColor('#FFFFFF')).toEqual([1, 1, 1]);
            expect(parseBgColor('#000000')).toEqual([0, 0, 0]);
        });
    });

    describe('getLuminance', () => {
        it('should return 0 for black', () => {
            expect(getLuminance('#000000')).toBe(0);
        });

        it('should return ~1 for white', () => {
            expect(getLuminance('#FFFFFF')).toBeCloseTo(1, 2);
        });

        it('should return middle value for gray', () => {
            const lum = getLuminance('#808080');
            expect(lum).toBeGreaterThan(0.4);
            expect(lum).toBeLessThan(0.6);
        });
    });

    describe('isLightColor', () => {
        it('should identify light colors', () => {
            expect(isLightColor('#FFFFFF')).toBe(true);
            expect(isLightColor('#FFFF00')).toBe(true);
        });

        it('should identify dark colors', () => {
            expect(isLightColor('#000000')).toBe(false);
            expect(isLightColor('#0000FF')).toBe(false);
        });
    });
});

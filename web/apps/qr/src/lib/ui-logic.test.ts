import { describe, it, expect } from 'vitest';
import { BRAND_LOGOS, BRAND_ICONS } from './brand-logos';

function decodeSvg(dataUrl: string): string {
    const payload = dataUrl.split(',')[1] || '';
    if (dataUrl.includes(';base64,')) {
        return Buffer.from(payload, 'base64').toString('utf8');
    }
    return decodeURIComponent(payload);
}

describe('UI Logic - Brand Assets', () => {
    it('should have all required brand keys in BRAND_LOGOS', () => {
        const requiredKeys = ['facebook', 'twitter', 'youtube', 'bitcoin', 'appstore', 'playstore', 'wifi'];
        requiredKeys.forEach(key => {
            expect(BRAND_LOGOS).toHaveProperty(key);
            expect(BRAND_LOGOS[key]).toContain('data:image/svg+xml');
        });
    });

    it('should have all required brand keys in BRAND_ICONS', () => {
        const requiredKeys = ['facebook', 'twitter', 'youtube', 'bitcoin', 'appstore', 'playstore', 'wifi'];
        requiredKeys.forEach(key => {
            expect(BRAND_ICONS).toHaveProperty(key);
            expect(BRAND_ICONS[key]).toContain('data:image/svg+xml');
        });
    });

    it('should use a transparent Facebook glyph instead of a baked circular mark', () => {
        const svg = decodeSvg(BRAND_LOGOS.facebook);
        expect(svg).toContain('M18 2h-3');
        expect(svg).toContain('fill="#1877F2"');
        expect(svg).toMatch(/<path[^>]*fill="#1877F2"/);
        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">');
        expect(svg).toContain('shape-rendering="geometricPrecision"');
        expect(svg).not.toContain('color="#1877F2"');
        expect(svg).not.toContain('<g fill');
        expect(svg).not.toContain('fill="#000000"');
        expect(svg).not.toContain('23.691v-7.98');
        expect(svg).not.toContain('<circle');
    });
});

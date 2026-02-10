import { describe, it, expect } from 'vitest';
import { BRAND_LOGOS, BRAND_ICONS } from './brand-logos';

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
});

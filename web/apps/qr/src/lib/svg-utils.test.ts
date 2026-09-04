import { describe, it, expect } from 'vitest';
import { colorizeSvg } from './svg-utils';

describe('colorizeSvg', () => {
    it('should replace fill color in SVG', () => {
        const svg = '<svg fill="white"><path d="..."/></svg>';
        const result = colorizeSvg(svg, 'red');
        expect(result).toContain('fill="red"');
        expect(result).not.toContain('fill="white"');
    });

    it('should handle hex colors', () => {
        const svg = '<svg fill="#ffffff"><path d="..."/></svg>';
        const result = colorizeSvg(svg, '#ff0000');
        expect(result).toContain('fill="#ff0000"');
    });

    it('should handle existing style attributes', () => {
        const svg = '<svg style="fill: white"><path d="..."/></svg>';
        // colorizeSvg only targets fill attributes, not inline styles
        // So style="fill: white" should remain unchanged but fill attr will be added
        const result = colorizeSvg(svg, 'blue');
        // The function adds fill attribute to the SVG element
        expect(result).toMatch(/<svg[^>]*fill="blue"/);
        // Style attribute should be preserved
        expect(result).toContain('style="fill: white"');
    });

    it('should add fill attribute if missing', () => {
        const svg = '<svg><path d="..."/></svg>';
        const result = colorizeSvg(svg, 'blue');
        expect(result).toMatch(/<svg[^>]*fill="blue"/);
    });
});

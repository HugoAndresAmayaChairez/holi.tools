export function colorizeSvg(svg: string, color: string): string {
    const fillRegex = /<svg([^>]*)\s+fill="[^"]*"([^>]*)>/;
    if (fillRegex.test(svg)) {
        return svg.replace(fillRegex, `<svg$1 fill="${color}"$2>`);
    } else {
        return svg.replace('<svg', `<svg fill="${color}"`);
    }
}

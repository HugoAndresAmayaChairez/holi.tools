export interface StyleOption {
    id: string;
    label: string;
    svgInner: string; // Inner HTML of the SVG (viewBox 0 0 20 20 assumed)
}

export const BODY_SHAPES: StyleOption[] = [
    {
        id: 'square',
        label: 'shape.option.square',
        svgInner: '<rect x="2" y="2" width="16" height="16" fill="currentColor"></rect>'
    },
    {
        id: 'rounded',
        label: 'shape.option.rounded',
        svgInner: '<rect x="2" y="2" width="16" height="16" rx="4" fill="currentColor"></rect>'
    },
    {
        id: 'dots',
        label: 'shape.option.dots',
        svgInner: '<circle cx="10" cy="10" r="7" fill="currentColor"></circle>'
    },
    {
        id: 'tiny-dots',
        label: 'shape.option.tiny_dots',
        svgInner: '<circle cx="10" cy="10" r="5" fill="currentColor"></circle>'
    },
    /* Liquid is now an Effect, removed from Shapes list */
    {
        id: 'classy-rounded',
        label: 'shape.option.classy_rounded',
        svgInner: '<rect x="2" y="2" width="16" height="16" rx="2" fill="currentColor"></rect>'
    }
];

export const EYE_FRAME_SHAPES: StyleOption[] = [
    {
        id: 'square',
        label: 'shape.option.square',
        svgInner: '<path d="M2,2 h16 v16 h-16 z M5,5 v10 h10 v-10 h-10 z" fill="currentColor"></path>'
    },
    {
        id: 'rounded',
        label: 'shape.option.rounded',
        svgInner: '<path d="M2,2 h16 v16 h-16 z M5,5 v10 h10 v-10 h-10 z" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"></path>'
    },
    {
        id: 'circle',
        label: 'shape.option.circle',
        svgInner: '<circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="3"></circle>'
    },
    {
        id: 'leaf',
        label: 'shape.option.leaf',
        svgInner: '<path d="M10,2 Q18,2 18,10 Q18,18 10,18 Q2,18 2,10 Q2,2 10,2 z M6,6 v8 h8 v-8 h-8 z" fill="currentColor" fill-rule="evenodd"></path>'
    },
    {
        id: 'cushion',
        label: 'shape.option.cushion',
        svgInner: '<path d="M10,2 Q18,2 18,10 Q18,18 10,18 Q2,18 2,10 Q2,2 10,2 z M6,6 Q7,6 7,7 Q7,8 6,8 Q5,8 5,7 Q5,6 6,6 z" fill="none" stroke="currentColor" stroke-width="3"></path>'
    },
    {
        id: 'double',
        label: 'shape.option.double',
        svgInner: '<rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"></rect><rect x="6" y="6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"></rect>'
    },
    {
        id: 'fancy',
        label: 'shape.option.fancy',
        svgInner: '<path d="M5,2 h10 l3,3 v10 l-3,3 h-10 l-3,-3 v-10 l3,-3 z M7,7 v6 h6 v-6 h-6 z" fill="currentColor" fill-rule="evenodd"></path>'
    },
    {
        id: 'heavy-rounded',
        label: 'shape.option.heavy_rounded',
        svgInner: '<rect x="2" y="2" width="16" height="16" rx="6" fill="none" stroke="currentColor" stroke-width="4"></rect>'
    },
    {
        id: 'dots-square',
        label: 'shape.option.dotted',
        svgInner: '<rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2,2"></rect>'
    },
    {
        id: 'clover-frame',
        label: 'shape.option.clover',
        svgInner: '<path d="M10,2 C15,2 18,5 18,10 C18,15 15,18 10,18 C5,18 2,15 2,10 C2,5 5,2 10,2 z M10,6 C12,6 14,8 14,10 C14,12 12,14 10,14 C8,14 6,12 6,10 C6,8 8,6 10,6 z" fill="currentColor" fill-rule="evenodd"></path>'
    }
];

export const EYE_BALL_SHAPES: StyleOption[] = [
    {
        id: 'square',
        label: 'shape.option.square',
        svgInner: '<rect x="5" y="5" width="10" height="10" fill="currentColor"></rect>'
    },
    {
        id: 'rounded',
        label: 'shape.option.rounded',
        svgInner: '<rect x="5" y="5" width="10" height="10" rx="3" fill="currentColor"></rect>'
    },
    {
        id: 'circle',
        label: 'shape.option.circle',
        svgInner: '<circle cx="10" cy="10" r="5" fill="currentColor"></circle>'
    },
    {
        id: 'diamond',
        label: 'shape.option.diamond',
        svgInner: '<path d="M10,4 L16,10 L10,16 L4,10 Z" fill="currentColor"></path>'
    },
    {
        id: 'star',
        label: 'shape.option.star',
        svgInner: '<path d="M10,2 l2,6 h6 l-5,4 l2,6 l-5,-4 l-5,4 l2,-6 l-5,-4 h6 z" fill="currentColor"></path>'
    },
    {
        id: 'heart',
        label: 'shape.option.heart',
        svgInner: '<path d="M10,17 L4,11 C1,8 1,4 4,4 C6,4 8,6 10,8 C12,6 14,4 16,4 C19,4 19,8 16,11 L10,17 Z" fill="currentColor"></path>'
    },
    {
        id: 'hexagon',
        label: 'shape.option.hexagon',
        svgInner: '<path d="M5,5 L15,5 L19,10 L15,15 L5,15 L1,10 Z" fill="currentColor"></path>'
    },
    {
        id: 'octagon',
        label: 'shape.option.octagon',
        svgInner: '<path d="M6,2 h8 l4,4 v8 l-4,4 h-8 l-4,-4 v-8 z" fill="currentColor"></path>'
    },
    {
        id: 'bars-h',
        label: 'shape.option.bars_h',
        svgInner: '<rect x="4" y="5" width="12" height="2" fill="currentColor"></rect><rect x="4" y="9" width="12" height="2" fill="currentColor"></rect><rect x="4" y="13" width="12" height="2" fill="currentColor"></rect>'
    },
    {
        id: 'bars-v',
        label: 'shape.option.bars_v',
        svgInner: '<rect x="5" y="4" width="2" height="12" fill="currentColor"></rect><rect x="9" y="4" width="2" height="12" fill="currentColor"></rect><rect x="13" y="4" width="2" height="12" fill="currentColor"></rect>'
    },
    {
        id: 'dots-grid',
        label: 'shape.option.grid',
        svgInner: '<circle cx="6" cy="6" r="1.5" fill="currentColor"></circle><circle cx="10" cy="6" r="1.5" fill="currentColor"></circle><circle cx="14" cy="6" r="1.5" fill="currentColor"></circle><circle cx="6" cy="10" r="1.5" fill="currentColor"></circle><circle cx="10" cy="10" r="1.5" fill="currentColor"></circle><circle cx="14" cy="10" r="1.5" fill="currentColor"></circle><circle cx="6" cy="14" r="1.5" fill="currentColor"></circle><circle cx="10" cy="14" r="1.5" fill="currentColor"></circle><circle cx="14" cy="14" r="1.5" fill="currentColor"></circle>'
    },
    {
        id: 'flower',
        label: 'shape.option.flower',
        svgInner: '<circle cx="10" cy="6" r="3" fill="currentColor"></circle><circle cx="14" cy="10" r="3" fill="currentColor"></circle><circle cx="10" cy="14" r="3" fill="currentColor"></circle><circle cx="6" cy="10" r="3" fill="currentColor"></circle><circle cx="10" cy="10" r="2" fill="currentColor"></circle>'
    },
    {
        id: 'clover',
        label: 'shape.option.clover',
        svgInner: '<path d="M10,8 C11,8 12,9 12,10 C12,12 10,14 10,14 C10,14 8,12 8,10 C8,9 9,8 10,8 z M10,5 C11,5 12,6 12,7 C12,8 10,9 10,9 C10,9 8,8 8,7 C8,6 9,5 10,5 z M14,10 C14,8 15,9 16,10 C16,11 15,12 14,12 C13,12 14,11 14,10 z" fill="currentColor"></path>'
    },
    {
        id: 'cushion',
        label: 'shape.option.cushion',
        svgInner: '<path d="M10,4 Q16,4 16,10 Q16,16 10,16 Q4,16 4,10 Q4,4 10,4 Z" fill="currentColor"></path>'
    }
];

export interface PresetConfig {
    id: string;
    label: string;
    config: {
        body: string;
        frame: string;
        ball: string;
        effectLiquid?: boolean;
    };
    icon: string;
}

export const PRESETS: PresetConfig[] = [
    {
        id: 'classic',
        label: 'preset.classic',
        config: { body: 'square', frame: 'square', ball: 'square' },
        icon: '<rect x="4" y="4" width="12" height="12" fill="currentColor"/>'
    },
    {
        id: 'modern',
        label: 'preset.modern',
        config: { body: 'rounded', frame: 'rounded', ball: 'rounded' },
        icon: '<rect x="4" y="4" width="12" height="12" rx="3" fill="currentColor"/>'
    },
    {
        id: 'soft',
        label: 'preset.soft',
        config: { body: 'classy-rounded', frame: 'heavy-rounded', ball: 'circle' },
        icon: '<rect x="4" y="4" width="12" height="12" rx="4" fill="currentColor"/>'
    },
    {
        id: 'dots',
        label: 'preset.dots',
        config: { body: 'dots', frame: 'circle', ball: 'circle' },
        icon: '<circle cx="10" cy="10" r="6" fill="currentColor"/>'
    },
    {
        id: 'liquid',
        label: 'preset.liquid',
        config: { body: 'dots', frame: 'circle', ball: 'circle', effectLiquid: true },
        icon: '<circle cx="6" cy="6" r="4" fill="currentColor"/><circle cx="14" cy="14" r="4" fill="currentColor"/><path d="M6,6 Q10,6 10,10 Q10,14 14,14" fill="none" stroke="currentColor" stroke-width="4"/>'
    },
    {
        id: 'dense',
        label: 'preset.dense',
        config: { body: 'tiny-dots', frame: 'dots-square', ball: 'dots-grid' },
        icon: '<circle cx="8" cy="8" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/>'
    }
];

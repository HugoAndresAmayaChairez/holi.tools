export interface StyleOption {
  id: string;
  label: string;
}

export const BODY_SHAPES: StyleOption[] = [
  {
    id: "square",
    label: "shape.option.square",
  },
  {
    id: "rounded",
    label: "shape.option.rounded",
  },
  {
    id: "dots",
    label: "shape.option.dots",
  },
  {
    id: "tiny-dots",
    label: "shape.option.tiny_dots",
  },
  {
    id: "capsule",
    label: "shape.option.capsule",
  },
  {
    id: "chain",
    label: "shape.option.chain",
  },
  {
    id: "diamond",
    label: "shape.option.diamond",
  },
  {
    id: "water",
    label: "shape.option.water",
  },
  {
    id: "pixel",
    label: "shape.option.pixel",
  },
];

export const EYE_FRAME_SHAPES: StyleOption[] = [
  {
    id: "square",
    label: "shape.option.square",
  },
  {
    id: "rounded",
    label: "shape.option.rounded",
  },
  {
    id: "circle",
    label: "shape.option.circle",
  },
  {
    id: "diamond",
    label: "shape.option.diamond",
  },
  {
    id: "cushion",
    label: "shape.option.cushion",
  },
  {
    id: "leaf",
    label: "shape.option.leaf",
  },
  {
    id: "clover-frame",
    label: "shape.option.clover_frame",
  },
  {
    id: "bevel",
    label: "shape.option.bevel",
  },
  {
    id: "orbit",
    label: "shape.option.orbit",
  },
  {
    id: "flux",
    label: "shape.option.flux",
  },
];

export const EYE_BALL_SHAPES: StyleOption[] = [
  {
    id: "square",
    label: "shape.option.square",
  },
  {
    id: "rounded",
    label: "shape.option.rounded",
  },
  {
    id: "circle",
    label: "shape.option.circle",
  },
  {
    id: "diamond",
    label: "shape.option.diamond",
  },
  {
    id: "star",
    label: "shape.option.star",
  },
  {
    id: "heart",
    label: "shape.option.heart",
  },
  {
    id: "hexagon",
    label: "shape.option.hexagon",
  },
  {
    id: "dots-grid",
    label: "shape.option.grid",
  },
  {
    id: "bars-h",
    label: "shape.option.bars_h",
  },
  {
    id: "bars-v",
    label: "shape.option.bars_v",
  },
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
    id: "classic",
    label: "preset.classic",
    config: { body: "square", frame: "square", ball: "square" },
    icon: '<rect x="4" y="4" width="12" height="12" fill="currentColor"/>',
  },
  {
    id: "soft",
    label: "preset.soft",
    config: { body: "rounded", frame: "cushion", ball: "rounded" },
    icon: '<rect x="4" y="4" width="12" height="12" rx="4" fill="currentColor"/>',
  },
  {
    id: "capsule",
    label: "shape.option.capsule",
    config: { body: "capsule", frame: "rounded", ball: "circle" },
    icon: '<rect x="3" y="8" width="14" height="4" rx="2" fill="currentColor"/><rect x="8" y="3" width="4" height="14" rx="2" fill="currentColor"/>',
  },
  {
    id: "dots",
    label: "preset.dots",
    config: { body: "dots", frame: "circle", ball: "circle" },
    icon: '<circle cx="10" cy="10" r="6" fill="currentColor"/>',
  },
  {
    id: "liquid",
    label: "preset.liquid",
    config: {
      body: "dots",
      frame: "circle",
      ball: "circle",
      effectLiquid: true,
    },
    icon: '<circle cx="6" cy="6" r="4" fill="currentColor"/><circle cx="14" cy="14" r="4" fill="currentColor"/><path d="M6,6 Q10,6 10,10 Q10,14 14,14" fill="none" stroke="currentColor" stroke-width="4"/>',
  },
  {
    id: "signal",
    label: "shape.option.chain",
    config: { body: "chain", frame: "bevel", ball: "dots-grid" },
    icon: '<path d="M5 10h10M10 5v10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="10" r="2" fill="currentColor"/>',
  },
  {
    id: "alive",
    label: "preset.alive",
    config: { body: "water", frame: "orbit", ball: "diamond" },
    icon: '<path d="M6.5,7.5 a3,3 0 0,1 3,-3 h2 a3,3 0 0,1 0,6 h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13.5,12.5 a3,3 0 0,1 -3,3 h-2 a3,3 0 0,1 0,-6 h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  },
];

/// <reference path="../.astro/types.d.ts" />
interface Window {
  refreshImagePanelUI?: () => void;
  setImageMode?: (mode: "bg" | "paper" | "ink" | "logo") => void;
  handleImageUpload?: (event: Event) => Promise<void>;
  removeImage?: () => void;
  updateLogoSize?: (value: number) => void;
  updateLogoBg?: (enabled: boolean) => void;
  updateLogoBgColor?: (value: string) => void;
  setLogoShape?: (shape: string) => void;
  setLogoFit?: (fit: string) => void;
  updateLogoRadius?: (value: number) => void;
  updateLogoPadding?: (value: number) => void;
  updateArtOpacity?: (value: number) => void;
  setArtBlend?: (blend: string) => void;
  setArtFit?: (fit: string) => void;
  updateArtRotation?: (value: number) => void;
  updateArtScale?: (value: number) => void;
  updateArtOffset?: () => void;
  updateColor?: (type: "fg" | "bg", value: string) => void;
  applyColorPreset?: (fg: string, bg: string) => void;
  applyTransparentPreset?: () => void;
  applyGradientPreset?: (
    type: number,
    color1: string,
    color2: string,
    angleDeg?: number
  ) => void;
  updateGradient?: () => void;
  toggleLiquid?: (enabled: boolean) => void;
  updateLiquidParam?: (param: "blur" | "thresh", value: number) => void;
  applyLiquidPreset?: (blur: number, thresh: number) => void;
  toggleNoise?: (enabled: boolean) => void;
  updateNoiseParam?: (param: "amount" | "scale", value: number) => void;
  setBodyShape?: (id: string) => void;
  setEyeFrame?: (id: string) => void;
  setEyeBall?: (id: string) => void;
  updateQR?: () => void;
  getIconSvg?: (name: string, size?: number) => string;
  state?: {
    config: any;
  };
}

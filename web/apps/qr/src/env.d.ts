/// <reference path="../.astro/types.d.ts" />
interface Window {
    refreshImagePanelUI?: () => void;
    setImageMode?: (mode: "logo" | "background") => void;
    handleImageUpload?: (event: Event) => Promise<void>;
    removeImage?: () => void;
    updateLogoSize?: (value: number) => void;
    updateLogoBg?: (enabled: boolean) => void;
    setLogoShape?: (shape: string) => void;
    updateLogoRadius?: (value: number) => void;
    updateLogoPadding?: (value: number) => void;
    updateArtOpacity?: (value: number) => void;
    setArtBlend?: (blend: string) => void;
    setArtFit?: (fit: string) => void;
    updateArtRotation?: (value: number) => void;
    updateArtScale?: (value: number) => void;
    updateArtOffset?: () => void;
    updateColor?: (type: 'fg' | 'bg', value: string) => void;
    applyColorPreset?: (fg: string, bg: string) => void;
    applyTransparentPreset?: () => void;
    updateGradient?: () => void;
    toggleLiquid?: (enabled: boolean) => void;
    updateLiquidParam?: (param: 'blur' | 'goo', value: number) => void;
    toggleNoise?: (enabled: boolean) => void;
    updateNoiseParam?: (param: 'amount' | 'scale', value: number) => void;
    setBodyShape?: (id: string) => void;
    setEyeFrame?: (id: string) => void;
    setEyeBall?: (id: string) => void;
    updateQR?: () => void;
    getIconSvg?: (name: string, size?: number) => string;
    state?: {
        config: any;
    };
}
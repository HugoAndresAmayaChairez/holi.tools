/**
 * Core Types for QR Generator
 * Centralized type definitions for effects, configs, and events
 */

// =============================================================================
// EFFECT CONFIGURATIONS
// =============================================================================

export interface GradientConfig {
    type: number;    // 0=None, 1=Linear, 2=Radial, 3=Conic, 4=Diamond
    color2: string;  // Hex color for second gradient stop
    angle: number;   // Radians for linear/conic rotation
}

export interface NoiseConfig {
    enabled: boolean;
    amount: number;   // 0-100 (UI) or 0-1 (internal)
    scale: number;    // Grain size/frequency
}

export interface LiquidConfig {
    enabled: boolean;
    blur: number;      // 0.1 - 1.0
    threshold: number; // 1 - 15
}

// =============================================================================
// RENDER CONFIGURATION
// =============================================================================

export interface RenderConfig {
    blur: number;
    threshold: number;
    color: [number, number, number];
    gradientColor2: [number, number, number];
    gradientType: number;
    gradientAngle: number;
    noiseAmount: number;
    noiseScale: number;
    backgroundColor: [number, number, number];
    qrSize: number;
    bodyShape: number;
    eyeFrameShape: number;
    eyeBallShape: number;
    logo?: string;
    logoSize?: number;
    logoBgEnabled?: boolean;
    logoBgColor?: [number, number, number];
    logoBgShape?: 'square' | 'circle' | 'rounded';
    logoPadding?: number;
    logoCornerRadius?: number;
    logoRotation?: number;
    logoScale?: number;
    logoOffsetX?: number;
    logoOffsetY?: number;
    // Art / Background
    artImage?: string;
    artOpacity?: number;      // 0.0 - 1.0
    artBlendMode?: string;    // 'normal', 'multiply', 'overlay', 'screen', etc.
    artFit?: 'cover' | 'contain' | 'fill';
    artRotation?: number;     // degrees
    artScale?: number;        // 1.0 = 100%
    artOffsetX?: number;      // -1 to 1
    artOffsetY?: number;      // -1 to 1
}

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

export interface GradientChangeEvent {
    type: number;
    color2: string;
    angle: number;
}

export interface NoiseChangeEvent {
    enabled: boolean;
    amount: number;
    scale: number;
}

export interface EffectChangeEvent {
    liquid: boolean;
    blur: number;
    thresh: number;
}

export interface FilterTweakEvent {
    blur: number;
    thresh: number;
}

export interface ColorChangeEvent {
    type: 'fg' | 'bg';
    value: string;
}

// =============================================================================
// SHAPE TYPES
// =============================================================================

export type BodyShape =
    | 'square' | 'dot' | 'rounded' | 'diamond' | 'star'
    | 'clover' | 'tiny-dot' | 'h-bars' | 'v-bars';

export type EyeFrameShape =
    | 'square' | 'circle' | 'rounded' | 'leaf' | 'shield' | 'diamond';

export type EyeBallShape =
    | 'square' | 'circle' | 'rounded' | 'star' | 'diamond' | 'heart';

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

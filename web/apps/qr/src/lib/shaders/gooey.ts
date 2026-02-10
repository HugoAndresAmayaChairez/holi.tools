export const GOOEY_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uThreshold;
uniform vec3 uColor; // Primary color (or Gradient Color 1)
uniform vec3 uColor2; // Gradient Color 2
uniform int uGradientType; // 0=None, 1=Linear, 2=Radial, 3=Conic, 4=Diamond
uniform float uGradientAngle; // Radians for linear gradient
uniform float uNoiseAmount; // 0-1 noise intensity
uniform float uNoiseScale;  // Noise frequency

const float PI = 3.14159265359;

// Hash function for noise
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

void main() {
    vec4 tex = texture(uTexture, vUv);
    
    // Gooey effect: boost alpha contrast for threshold-based shape blending
    // The multiplier 19.0 is empirically chosen for optimal gooey sharpness:
    // - Lower values (10-15): softer, more blurred edges
    // - Higher values (20-25): sharper, more defined edges
    // - 19.0 provides good balance between liquid feel and edge definition
    float alpha = tex.a * 19.0 - uThreshold;
    alpha = clamp(alpha, 0.0, 1.0);
    
    // If transparent, discard (optimization)
    if (alpha <= 0.01) {
        fragColor = vec4(0.0);
        return;
    }
    
    vec3 finalColor = uColor;
    
    // Gradient Logic
    if (uGradientType > 0) {
        float t = 0.0;
        vec2 centered = vUv - 0.5;
        
        if (uGradientType == 1) { // Linear
            // Rotate UV based on angle
            float s = sin(uGradientAngle);
            float c = cos(uGradientAngle);
            vec2 rotated = vec2(
                centered.x * c - centered.y * s,
                centered.x * s + centered.y * c
            );
            // Map -0.5..0.5 to 0..1
            t = rotated.x + 0.5; 
        } 
        else if (uGradientType == 2) { // Radial
            t = length(centered) * 2.0; // 0 at center, 1 at edge
        } 
        else if (uGradientType == 3) { // Conic (Sweep)
            float angle = atan(centered.y, centered.x); // -PI to PI
            angle += uGradientAngle; // Apply rotation offset
            t = (angle / (2.0 * PI)) + 0.5; // Map to 0-1
        } 
        else if (uGradientType == 4) { // Diamond
            t = (abs(centered.x) + abs(centered.y)) * 1.5; // Manhatten distance
        }
        
        t = clamp(t, 0.0, 1.0);
        finalColor = mix(uColor, uColor2, t);
    }
    
    // Apply Noise Effect
    if (uNoiseAmount > 0.0) {
        float noise = hash21(vUv * uNoiseScale);
        noise = (noise - 0.5) * 2.0; // Map to -1 to 1
        finalColor += noise * uNoiseAmount * 0.5; // More visible grain (was 0.15)
    }
    
    fragColor = vec4(finalColor, alpha);
}`;

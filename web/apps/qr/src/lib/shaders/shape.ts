export const SHAPE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;        // QR matrix (R8) [uQRSize x uQRSize]
uniform sampler2D uBodyMaskAtlas;  // Body atlas (R8) [16*tile x 16*tile]
uniform sampler2D uEyeMask;        // Eye mask tile (R8) [tile x tile], viewBox 0..7

uniform vec4 uColor;
uniform vec4 uColor2; // Gradient Color 2
uniform int uGradientType; // 0=None, 1=Linear, 2=Radial, 3=Conic, 4=Diamond
uniform float uGradientAngle; // Radians
uniform float uNoiseAmount; // 0-1 noise intensity
uniform float uNoiseScale;  // Noise frequency
uniform int uQRSize;

const float PI = 3.14159265359;
const float ATLAS_TILES = 16.0;

float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

bool isInside(ivec2 m) {
    return (m.x >= 0 && m.y >= 0 && m.x < uQRSize && m.y < uQRSize);
}

float sampleMatrix(ivec2 m) {
    if (!isInside(m)) return 0.0;
    vec2 uv = (vec2(m) + 0.5) / float(uQRSize);
    return texture(uTexture, uv).r;
}

float isDarkAt(ivec2 m) {
    return step(0.5, sampleMatrix(m));
}

bool isInEyeRegion(ivec2 m) {
    if (m.x < 7 && m.y < 7) return true;
    if (m.x >= uQRSize - 7 && m.y < 7) return true;
    if (m.x < 7 && m.y >= uQRSize - 7) return true;
    return false;
}

ivec2 eyeOriginFor(ivec2 m) {
    if (m.x < 7 && m.y < 7) return ivec2(0, 0);
    if (m.x >= uQRSize - 7 && m.y < 7) return ivec2(uQRSize - 7, 0);
    return ivec2(0, uQRSize - 7);
}

vec4 applyColoring(float alpha) {
    if (alpha <= 0.001) return vec4(0.0);

    vec4 finalColor = uColor;
    if (uGradientType > 0) {
        float t = 0.0;
        vec2 centered = vUv - 0.5;

        if (uGradientType == 1) { // Linear
            float s = sin(uGradientAngle);
            float c = cos(uGradientAngle);
            vec2 rotated = vec2(
                centered.x * c - centered.y * s,
                centered.x * s + centered.y * c
            );
            t = rotated.x + 0.5;
        } else if (uGradientType == 2) { // Radial
            t = length(centered) * 2.0;
        } else if (uGradientType == 3) { // Conic (Sweep)
            float angle = atan(centered.y, centered.x);
            float sweep = fract((angle + uGradientAngle) / (2.0 * PI) + 0.5);
            t = 1.0 - abs(sweep * 2.0 - 1.0);
        } else if (uGradientType == 4) { // Diamond
            t = (abs(centered.x) + abs(centered.y)) * 1.5;
        }

        t = clamp(t, 0.0, 1.0);
        finalColor = mix(uColor, uColor2, t);
    }

    if (uNoiseAmount > 0.0) {
        float noise = hash21(vUv * uNoiseScale);
        noise = (noise - 0.5) * 2.0;
        finalColor.rgb += noise * uNoiseAmount * 0.5;
    }

    return vec4(finalColor.rgb, alpha * finalColor.a);
}

void main() {
    // Map UV to QR module coordinates with PADDING (Quiet Zone).
    // WebGL's framebuffer origin is bottom-left, but the QR matrix, the body
    // atlas and the eye mask are all top-down (row 0 = top) like the SVG.
    // Flip Y once here so modules, neighbour bits and every rasterized shape
    // keep the exact orientation of the Rust renderer (drops fall down,
    // hearts point down, leaf frames curve the same corners).
    vec2 uvTopDown = vec2(vUv.x, 1.0 - vUv.y);
    float padding = 4.0;
    float totalSize = float(uQRSize) + (padding * 2.0);

    vec2 qrCoord = (uvTopDown * totalSize) - padding;
    ivec2 module = ivec2(floor(qrCoord));

    // Bounds check
    if (module.x < 0 || module.x >= uQRSize || module.y < 0 || module.y >= uQRSize) {
        fragColor = vec4(0.0);
        return;
    }

    // Eyes: sample a single 7x7 mask tile (Rust-generated).
    if (isInEyeRegion(module)) {
        ivec2 origin = eyeOriginFor(module);
        vec2 eyeCoord = qrCoord - vec2(origin); // 0..7 (continuous)
        vec2 uvEye = clamp(eyeCoord / 7.0, 0.0, 1.0);
        float alpha = texture(uEyeMask, uvEye).r;
        fragColor = applyColoring(alpha);
        return;
    }

    // Light modules: transparent
    if (isDarkAt(module) < 0.5) {
        fragColor = vec4(0.0);
        return;
    }

    // Body: sample atlas tile based on an 8-neighbor bitmask (Rust-generated variants).
    float l  = isDarkAt(module + ivec2(-1,  0));
    float r  = isDarkAt(module + ivec2( 1,  0));
    float u  = isDarkAt(module + ivec2( 0, -1));
    float d  = isDarkAt(module + ivec2( 0,  1));
    float lu = isDarkAt(module + ivec2(-1, -1));
    float ru = isDarkAt(module + ivec2( 1, -1));
    float ld = isDarkAt(module + ivec2(-1,  1));
    float rd = isDarkAt(module + ivec2( 1,  1));

    float mask =
        l
      + r  * 2.0
      + u  * 4.0
      + d  * 8.0
      + lu * 16.0
      + ru * 32.0
      + ld * 64.0
      + rd * 128.0;

    float tileX = mod(mask, ATLAS_TILES);
    float tileY = floor(mask / ATLAS_TILES);

    vec2 localUv = fract(qrCoord); // 0..1 within module
    vec2 uvAtlas = (vec2(tileX, tileY) + localUv) / ATLAS_TILES;

    float alpha = texture(uBodyMaskAtlas, uvAtlas).r;
    fragColor = applyColoring(alpha);
}`;

export const MASK_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform int uQRSize;

void main() {
    // Map UV to QR module coordinates with quiet zone padding
    float padding = 4.0;
    float totalSize = float(uQRSize) + (padding * 2.0);

    // Same top-down mapping as the shape shader (row 0 of the matrix = top).
    vec2 qrCoord = (vec2(vUv.x, 1.0 - vUv.y) * totalSize) - padding;
    ivec2 module = ivec2(floor(qrCoord));

    // Outside the QR bounds: no mask (transparent)
    if (module.x < 0 || module.x >= uQRSize || module.y < 0 || module.y >= uQRSize) {
        fragColor = vec4(0.0);
        return;
    }

    // Sample matrix (dark module => alpha 1)
    vec2 sampleUv = (vec2(module) + 0.5) / float(uQRSize);
    float isDark = texture(uTexture, sampleUv).r;

    float a = step(0.5, isDark);
    fragColor = vec4(1.0, 1.0, 1.0, a);
}`;

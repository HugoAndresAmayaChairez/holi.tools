export const BLUR_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uDirection;
uniform float uBlur;
uniform vec2 uResolution;

void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec2 offset = uDirection * texelSize * uBlur;
    
    // 9-tap Gaussian kernel (sigma ~= blur)
    vec4 sum = vec4(0.0);
    sum += texture(uTexture, vUv - offset * 4.0) * 0.0162;
    sum += texture(uTexture, vUv - offset * 3.0) * 0.0540;
    sum += texture(uTexture, vUv - offset * 2.0) * 0.1216;
    sum += texture(uTexture, vUv - offset * 1.0) * 0.1945;
    sum += texture(uTexture, vUv) * 0.2270;
    sum += texture(uTexture, vUv + offset * 1.0) * 0.1945;
    sum += texture(uTexture, vUv + offset * 2.0) * 0.1216;
    sum += texture(uTexture, vUv + offset * 3.0) * 0.0540;
    sum += texture(uTexture, vUv + offset * 4.0) * 0.0162;
    
    fragColor = sum;
}`;

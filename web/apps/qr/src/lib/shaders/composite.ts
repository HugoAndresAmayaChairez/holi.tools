export const COMPOSITE_SHADER = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uQRTexture;
uniform sampler2D uArtTexture;
uniform sampler2D uMaskTexture;
uniform sampler2D uPaperTexture;
uniform sampler2D uInkTexture;
uniform int uQRSize;
uniform int uEyeFrameShape;
uniform float uFinderCornerCutoutEnabled;

// BG base layer (under everything). Alpha=0 means transparent.
uniform vec4 uBaseColor;

// Paper/complement layer (inverse-masked by module mask). Alpha=0 means transparent.
uniform vec4 uPaperColor;
uniform float uPaperBoundsScale;
uniform float uPaperTexEnabled;
uniform float uPaperAspect;
uniform int uPaperFitMode; // 0=Cover, 1=Contain, 2=Fill
uniform float uPaperRotation; // Radians
uniform float uPaperScale;
uniform vec2 uPaperOffset;

// Optional ink texture override (masked by ink alpha)
uniform float uInkTexEnabled;
uniform float uInkAspect;
uniform int uInkFitMode; // 0=Cover, 1=Contain, 2=Fill
uniform float uInkRotation; // Radians
uniform float uInkScale;
uniform vec2 uInkOffset;

// When 0, forces ink layer off (useful for explicit transparent-ink mode).
uniform float uInkEnabled;

// Debug view:
// 0 = final composite
// 1 = mask alpha (white = modules)
// 2 = ink alpha
// 3 = underlay (card+art+complement)
uniform int uDebugMode;

uniform float uOpacity;
uniform float uArtBoundsScale;
uniform int uBlendMode; // 0=Normal, 1=Multiply, 2=Overlay, 3=Screen, 4=Darken
uniform float uArtAspect; // Art Image Aspect Ratio (width / height)
uniform float uContainerAspect; // Output/Canvas Aspect Ratio
uniform int uFitMode; // 0=Cover, 1=Contain, 2=Fill

// Transform uniforms
uniform float uArtRotation; // Radians
uniform float uArtScale;    // 1.0 = 100%
uniform vec2 uArtOffset;    // -1 to 1

// Blend Mode Functions
vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}

vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
    );
}

vec3 blendDarken(vec3 base, vec3 blend) {
    return min(base, blend);
}

// 2D Rotation Matrix
vec2 rotate2D(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(
        uv.x * c - uv.y * s,
        uv.x * s + uv.y * c
    );
}

// Source-over compositing (non-premultiplied)
vec4 over(vec4 under, vec4 overColor) {
    float outA = overColor.a + under.a * (1.0 - overColor.a);
    vec3 outRGB = (overColor.rgb * overColor.a + under.rgb * under.a * (1.0 - overColor.a)) / max(outA, 1e-6);
    return vec4(outRGB, outA);
}

// Apply cover/contain/fill mapping for an image into a container.
vec2 fitUv(vec2 uv, float imgAspect, float containerAspect, int fitMode) {
    if (fitMode == 2) {
        return uv; // Fill
    }

    float rw = 1.0;
    float rh = 1.0;

    if (fitMode == 0) { // Cover
        if (imgAspect > containerAspect) {
            rw = containerAspect / imgAspect;
        } else {
            rh = imgAspect / containerAspect;
        }
    } else { // Contain
        if (imgAspect > containerAspect) {
            rh = imgAspect / containerAspect;
        } else {
            rw = containerAspect / imgAspect;
        }
    }

    return (uv - 0.5) * vec2(1.0 / rw, 1.0 / rh) + 0.5;
}

float roundedBoxAlpha(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    return 1.0 - smoothstep(-0.035, 0.035, d);
}

float eyeOuterAlpha(vec2 eyeCoord) {
    vec2 p = eyeCoord - vec2(3.5);

    if (uEyeFrameShape == 2) { // circle
        float d = length(p) - 3.5;
        return 1.0 - smoothstep(-0.035, 0.035, d);
    }

    if (uEyeFrameShape == 1) { // rounded
        return roundedBoxAlpha(p, vec2(3.5), 1.65);
    }

    if (uEyeFrameShape == 4 || uEyeFrameShape == 9) { // cushion / clover-ish
        float d = length(p) - 3.65;
        return 1.0 - smoothstep(-0.035, 0.035, d);
    }

    if (uEyeFrameShape == 11) { // orbit
        return roundedBoxAlpha(p, vec2(3.32), 2.55);
    }

    if (uEyeFrameShape == 3 || uEyeFrameShape == 10 || uEyeFrameShape == 12) { // diamond / bevel / flux
        float d = max(abs(p.x), abs(p.y)) + 0.42 * min(abs(p.x), abs(p.y)) - 3.5;
        return 1.0 - smoothstep(-0.035, 0.035, d);
    }

    if (uEyeFrameShape == 5) { // leaf
        return roundedBoxAlpha(p - vec2(0.28, 0.28), vec2(3.5), 2.4);
    }

    return 1.0; // square-like frames occupy the full finder box.
}

float finderCornerCutout(vec2 uv) {
    float padding = 4.0;
    float totalSize = float(uQRSize) + (padding * 2.0);
    vec2 qrCoord = (uv * totalSize) - padding;
    ivec2 module = ivec2(floor(qrCoord));

    bool topLeft = module.x >= 0 && module.x < 7 && module.y >= 0 && module.y < 7;
    bool topRight = module.x >= uQRSize - 7 && module.x < uQRSize && module.y >= 0 && module.y < 7;
    bool bottomLeft = module.x >= 0 && module.x < 7 && module.y >= uQRSize - 7 && module.y < uQRSize;
    if (!(topLeft || topRight || bottomLeft)) return 0.0;

    vec2 origin = vec2(0.0);
    if (topRight) origin = vec2(float(uQRSize - 7), 0.0);
    if (bottomLeft) origin = vec2(0.0, float(uQRSize - 7));
    vec2 eyeCoord = qrCoord - origin;

    return 1.0 - eyeOuterAlpha(eyeCoord);
}

float layerBoundsAlpha(vec2 uv, float boundsScale) {
    float padding = 4.0;
    float totalSize = float(uQRSize) + (padding * 2.0);
    vec2 qrCoord = (uv * totalSize) - padding;
    vec2 center = vec2(float(uQRSize) * 0.5);
    vec2 halfSize = vec2(float(uQRSize) * max(boundsScale, 1.0) * 0.5);
    vec2 d = abs(qrCoord - center) - halfSize;
    float outside = max(d.x, d.y);
    return 1.0 - smoothstep(-0.04, 0.04, outside);
}

void main() {
    // 1. Sample QR Ink + Mask
    vec4 inkColor = texture(uQRTexture, vUv);
    float moduleMaskA = texture(uMaskTexture, vUv).a;
    // Keep paper off the actual ink, and also remove paper from the finder
    // square corners that are outside rounded/circular eye silhouettes.
    float eyeCornerCutout = uFinderCornerCutoutEnabled > 0.5 ? finderCornerCutout(vUv) : 0.0;
    float cutoutA = max(inkColor.a, eyeCornerCutout);

    if (uDebugMode == 1) {
        fragColor = vec4(cutoutA, moduleMaskA, 0.0, 1.0);
        return;
    }
    if (uDebugMode == 2) {
        fragColor = vec4(vec3(inkColor.a), 1.0);
        return;
    }

    // 2. Base UV for images
    // FLIP Y: WebGL has Y=0 at bottom, images have Y=0 at top
    vec2 baseUV = vec2(vUv.x, 1.0 - vUv.y);

    // 3. BG image mapping: center -> rotate -> scale -> offset -> uncenter
    vec2 artUV = baseUV - 0.5;                    // Center
    artUV = rotate2D(artUV, uArtRotation);        // Rotate
    artUV = artUV / max(uArtScale, 0.01);         // Scale (inverse for UV)
    artUV = artUV - uArtOffset;                   // Offset
    artUV = artUV + 0.5;                          // Uncenter
    
     artUV = fitUv(artUV, uArtAspect, uContainerAspect, uFitMode);
    
    // Check bounds (for contain mode, discard outside)
    vec4 artColor = vec4(0.0);
    if (artUV.x >= 0.0 && artUV.x <= 1.0 && artUV.y >= 0.0 && artUV.y <= 1.0) {
        artColor = texture(uArtTexture, artUV);
    }

    // Apply Opacity to Art
    artColor.a *= uOpacity;
    float artBoundsA = layerBoundsAlpha(vUv, uArtBoundsScale);
    artColor.a *= artBoundsA;

    // 4. 5-layer stack (logo is rendered in a separate pass):
    // BG base (uBaseColor) -> BG image (uArtTexture) -> Paper (masked by inverse module mask) -> Ink

    vec4 under = uBaseColor;
    under.a *= artBoundsA;
    under = over(under, artColor);

    // Paper/complement:
    vec4 paper = uPaperColor;
    float paperBoundsA = layerBoundsAlpha(vUv, uPaperBoundsScale);
    if (uPaperTexEnabled > 0.5) {
        vec2 paperUV = baseUV - 0.5;
        paperUV = rotate2D(paperUV, uPaperRotation);
        paperUV = paperUV / max(uPaperScale, 0.01);
        paperUV = paperUV - uPaperOffset;
        paperUV = paperUV + 0.5;
        paperUV = fitUv(paperUV, uPaperAspect, uContainerAspect, uPaperFitMode);
        if (paperUV.x >= 0.0 && paperUV.x <= 1.0 && paperUV.y >= 0.0 && paperUV.y <= 1.0) {
            vec4 tex = texture(uPaperTexture, paperUV);
            paper.rgb = tex.rgb * paper.rgb;
            paper.a = tex.a * paper.a;
        } else {
            paper = vec4(0.0);
        }
    }
    paper.a *= paperBoundsA * (1.0 - cutoutA);
    if (paper.a > 0.001) {
        under = over(under, paper);
    }

    if (uDebugMode == 3) {
        fragColor = under;
        return;
    }

    // If ink is disabled, show only the underlay (card/art/complement).
    if (uInkEnabled <= 0.5) {
        fragColor = under;
        return;
    }

    // Optional ink texture override (keeps the gooey alpha from uQRTexture).
    if (uInkTexEnabled > 0.5) {
        vec2 inkUV = baseUV - 0.5;
        inkUV = rotate2D(inkUV, uInkRotation);
        inkUV = inkUV / max(uInkScale, 0.01);
        inkUV = inkUV - uInkOffset;
        inkUV = inkUV + 0.5;
        inkUV = fitUv(inkUV, uInkAspect, uContainerAspect, uInkFitMode);
        if (inkUV.x >= 0.0 && inkUV.x <= 1.0 && inkUV.y >= 0.0 && inkUV.y <= 1.0) {
            vec4 tex = texture(uInkTexture, inkUV);
            inkColor.rgb = tex.rgb;
            inkColor.a *= tex.a;
        }
    }

    // If there's no QR ink at this pixel, show the underlay.
    if (inkColor.a <= 0.001) {
        fragColor = under;
        return;
    }

    // Blend QR ink against the *underlay* to respect the stack.
    vec3 blended = vec3(0.0);
    if (uBlendMode == 1) blended = blendMultiply(under.rgb, inkColor.rgb);
    else if (uBlendMode == 2) blended = blendOverlay(under.rgb, inkColor.rgb);
    else if (uBlendMode == 3) blended = blendScreen(under.rgb, inkColor.rgb);
    else if (uBlendMode == 4) blended = blendDarken(under.rgb, inkColor.rgb);
    else blended = inkColor.rgb; // Normal

    fragColor = over(under, vec4(blended, inkColor.a));
}
`;

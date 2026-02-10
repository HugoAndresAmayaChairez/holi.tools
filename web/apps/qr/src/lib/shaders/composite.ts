export const COMPOSITE_SHADER = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uQRTexture;
uniform sampler2D uArtTexture;

uniform float uOpacity;
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

void main() {
    // 1. Sample QR (Foreground)
    vec4 qrColor = texture(uQRTexture, vUv);

    // 2. Sample Art (Background) with UV Mapping for Cover/Contain
    // FLIP Y: WebGL has Y=0 at bottom, images have Y=0 at top
    vec2 baseUV = vec2(vUv.x, 1.0 - vUv.y);
    
    // Apply transformations: center -> rotate -> scale -> offset -> uncenter
    vec2 artUV = baseUV - 0.5;                    // Center
    artUV = rotate2D(artUV, uArtRotation);        // Rotate
    artUV = artUV / max(uArtScale, 0.01);         // Scale (inverse for UV)
    artUV = artUV - uArtOffset;                   // Offset
    artUV = artUV + 0.5;                          // Uncenter
    
    if (uFitMode == 0 || uFitMode == 1) { // Cover or Contain
        // Calculate scale factor
        float rw = 1.0; // width scale
        float rh = 1.0; // height scale
        
        if (uFitMode == 0) { // Cover
            if (uArtAspect > uContainerAspect) {
               // Image is wider than container -> Crop sides
               rw = uContainerAspect / uArtAspect;
            } else {
               // Image is taller than container -> Crop top/bottom
               rh = uArtAspect / uContainerAspect;
            }
        } else { // Contain
             if (uArtAspect > uContainerAspect) {
               // Image is wider -> Fill width, pad height (letterbox)
               rh = uArtAspect / uContainerAspect;
            } else {
               // Image is taller -> Fill height, pad width
               rw = uContainerAspect / uArtAspect;
            }
        }
        
        // Apply aspect ratio scaling to already transformed UVs
        artUV = (artUV - 0.5) * vec2(1.0/rw, 1.0/rh) + 0.5;
    }
    
    // Check bounds (for contain mode, discard outside)
    vec4 artColor = vec4(0.0);
    if (artUV.x >= 0.0 && artUV.x <= 1.0 && artUV.y >= 0.0 && artUV.y <= 1.0) {
        artColor = texture(uArtTexture, artUV);
    }

    // Apply Opacity to Art
    artColor.a *= uOpacity;
    
    // 3. Blending
    vec3 result = qrColor.rgb;
    float finalAlpha = qrColor.a;

    // We only blend if BOTH pixels exist. 
    // Standard composite: Source Over (QR over Art)
    // But user wants specialized "Blend Mode" for the QR ink over the art.
    
    // Strategy:
    // If QR has alpha, we blend QR color with Art color.
    // Result = Mix(Art, Blend(Art, QR), QR.Alpha)
    
    vec3 blended = vec3(0.0);
    
    if (uBlendMode == 1) blended = blendMultiply(artColor.rgb, qrColor.rgb);
    else if (uBlendMode == 2) blended = blendOverlay(artColor.rgb, qrColor.rgb);
    else if (uBlendMode == 3) blended = blendScreen(artColor.rgb, qrColor.rgb);
    else if (uBlendMode == 4) blended = blendDarken(artColor.rgb, qrColor.rgb);
    else blended = qrColor.rgb; // Normal

    // Composite:
    // Final RGB = Art.rgb * (1 - QR.a) + Blended * QR.a
    // This assumes "Normal" blending for the structure, but "Effect" blending for the overlap.
    
    // Let's simplify: 
    // We start with Art. 
    // We draw QR on top.
    
    vec3 finalRGB = artColor.rgb;
    
    // If we have art...
    if (artColor.a > 0.0) {
       // Apply blend mode where QR is present
       vec3 mixed = mix(artColor.rgb, blended, qrColor.a);
       finalRGB = mixed;
       // Alpha remains Art's alpha (usually 1.0) mixed with QR's... 
       // Actually, we want the result to be opaque if art is opaque.
       finalAlpha = max(artColor.a, qrColor.a); 
    } else {
       // No art here, just show QR
       finalRGB = qrColor.rgb;
       finalAlpha = qrColor.a;
    }

    fragColor = vec4(finalRGB, finalAlpha);
}
`;


export const LOGO_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uLogo;
uniform float uBgEnabled;
uniform vec3 uBgColor;
uniform float uLogoRotation; // Degrees
uniform float uLogoScale;    // 1.0 = 100%
uniform float uLogoOffsetX;  // -1 to 1
uniform float uLogoOffsetY;  // -1 to 1
uniform int uShape;          // 0=Square, 1=Circle, 2=Rounded
uniform float uCornerRadius; // 0.0 to 0.5
uniform float uPadding;      // 0.0 to 0.5

// SDF Function for Rounded Box
float sdRoundedBox(in vec2 p, in vec2 b, in vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x  = (p.y > 0.0) ? r.x  : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

// SDF for Circle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

vec2 rotateUV(vec2 uv, float rotation) {
    float mid = 0.5;
    float cosAngle = cos(radians(rotation));
    float sinAngle = sin(radians(rotation));
    return vec2(
        cosAngle * (uv.x - mid) + sinAngle * (uv.y - mid) + mid,
        cosAngle * (uv.y - mid) - sinAngle * (uv.x - mid) + mid
    );
}

void main() {
    // 1. Setup Coordinates (Centered at 0,0, range -0.5 to 0.5)
    vec2 p = vUv - 0.5;
    
    // 2. Define Shape Distance
    float d = 0.0;
    float halfSize = 0.5; 
    
    if (uShape == 1) { 
        // Circle
        d = sdCircle(p, halfSize);
    } else if (uShape == 2) {
        // Rounded Box (Radius is 0-0.5 normalized)
        d = sdRoundedBox(p, vec2(halfSize), vec4(uCornerRadius));
    } else {
        // Square (Radius 0)
        d = sdRoundedBox(p, vec2(halfSize), vec4(0.0));
    }
    
    // 3. Render Background
    vec4 finalColor = vec4(0.0);
    
    // Soft edge for anti-aliasing
    float aa = 0.005; 
    float bgAlpha = 1.0 - smoothstep(-aa, aa, d);
    
    if (uBgEnabled > 0.5) {
        // Only Draw BG where shape is defined
        finalColor = vec4(uBgColor, bgAlpha);
    } // If disabled, finalColor is transparent
    
    // 4. Transform Texture Coordinates for Logo Image
    
    // Flip Y logic is handled here too?
    // Original: vec2 texUv = vec2(vUv.x, 1.0 - vUv.y);
    // Let's do transforms first, then flip Y? OR Flip then transform?
    // Usually transforms are in 2D space.
    
    // Start with centered UV (-0.5 to 0.5)
    vec2 transUV = vUv; 
    
    // A. Offset (Inverse direction for "moving image")
    transUV.x -= uLogoOffsetX; 
    transUV.y += uLogoOffsetY; // Y is flipped later?
    
    // B. Rotate
    transUV = rotateUV(transUV, uLogoRotation);
    
    // C. Scale (Inverse scale: 2x zoom means showing 0.5 of texture)
    // Scale around center 0.5
    transUV = (transUV - 0.5) / uLogoScale + 0.5;
    
    // D. Flip Y (Image orientation)
    // This flips the final sample coordinate
    vec2 finalTexUV = vec2(transUV.x, 1.0 - transUV.y);
    
    
    // 5. Apply Padding (applied to the Container/Shape space concept)
    // Padding logic: "Shrink image to fit inside padded area"
    // This effectively scales the texture UP relative to the UVs.
    // texUv = (currentUV - padding) / (1 - 2*padding)
    
    float pad = uPadding;
    vec2 paddedUV = (finalTexUV - pad) / (1.0 - 2.0 * pad);
    
    if (paddedUV.x >= 0.0 && paddedUV.x <= 1.0 && paddedUV.y >= 0.0 && paddedUV.y <= 1.0) {
        vec4 texColor = texture(uLogo, paddedUV);
        
        // Mask texture by shape alpha
        texColor.a *= bgAlpha; 
        
        // Blend texture over background
        // Normal Blend: Src + Dst * (1 - SrcA)
        finalColor = vec4(mix(finalColor.rgb, texColor.rgb, texColor.a), max(finalColor.a, texColor.a));
    }
    
    // Knockout Logic Support:
    // If background is DISABLED (transparent), but we want to "Clear" the QR code behind...
    // We need to output something that can wipe the destination.
    // In standard blending (SRC_ALPHA, ONE_MINUS_SRC_ALPHA), a transparent pixel (0,0,0,0) does NOTHING to destination.
    // To clear, we need to output alpha, but tell GL to use it to erase.
    // That's done via blend equation in host code.
    // BUT we also want to draw the logo opaque on top.
    
    // If we want "Hole Punch", we essentially want the Shape's alpha to determine the hole.
    // We will handle specific blending modes in the Renderer. 
    // The shader just outputs the composited Logo+Background.
    // If BgEnabled is false, finalColor has 0 alpha in background areas.
    // If we want a hole, we need non-zero alpha there?
    // Actually, if we use a separate "Hole Punch" pass, we draw just the shape.
    // This shader handles Color/Texture pass.
    
    fragColor = finalColor;
}`;

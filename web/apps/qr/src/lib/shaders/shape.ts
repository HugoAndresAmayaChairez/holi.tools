export const SHAPE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec3 uColor;
uniform vec3 uColor2; // Gradient Color 2
uniform int uGradientType; // 0=None, 1=Linear, 2=Radial, 3=Conic, 4=Diamond
uniform float uGradientAngle; // Radians
uniform float uNoiseAmount; // 0-1 noise intensity
uniform float uNoiseScale;  // Noise frequency
uniform int uQRSize;
uniform int uBodyShape;      // 0=square, 1=dot, 2=rounded, 3=diamond, 4=star, 5=clover, 6=tiny-dot, 7=h-bars
uniform int uEyeFrameShape;  // 0=square, 1=circle, 2=rounded, 3=leaf, 4=shield, 5=diamond
uniform int uEyeBallShape;   // 0=square, 1=circle, 2=rounded, 3=leaf, 4=shield, 5=diamond

const float PI = 3.14159265359;

// Hash function for noise
float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

// SDF primitives
float sdSquare(vec2 p, float size) {
    vec2 d = abs(p) - vec2(size);
    return max(d.x, d.y);
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdRoundedSquare(vec2 p, float size, float r) {
    vec2 d = abs(p) - vec2(size - r);
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float sdDiamond(vec2 p, float size) {
    p = abs(p);
    return (p.x + p.y - size) * 0.707;
}

float sdStar(vec2 p, float r, int n, float m) {
    float an = 3.141593 / float(n);
    float en = 3.141593 / m;
    vec2 acs = vec2(cos(an), sin(an));
    vec2 ecs = vec2(cos(en), sin(en));
    float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
    p = length(p) * vec2(cos(bn), abs(sin(bn)));
    p -= r * acs;
    p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
    return length(p) * sign(p.x);
}

// Detect finder pattern regions (eyes)
bool isEyeRegion(ivec2 m, int size) {
    // Top-left (0,0 to 6,6)
    if (m.x < 7 && m.y < 7) return true;
    // Top-right
    if (m.x >= size - 7 && m.y < 7) return true;
    // Bottom-left  
    if (m.x < 7 && m.y >= size - 7) return true;
    return false;
}

// Get eye component: 0=not eye, 1=frame outer, 2=frame inner, 3=ball
int getEyeComponent(ivec2 m, int size) {
    ivec2 local;
    if (m.x < 7 && m.y < 7) local = m;
    else if (m.x >= size - 7 && m.y < 7) local = ivec2(m.x - (size - 7), m.y);
    else if (m.x < 7 && m.y >= size - 7) local = ivec2(m.x, m.y - (size - 7));
    else return 0;
    
    // Ball: 2,2 to 4,4
    if (local.x >= 2 && local.x <= 4 && local.y >= 2 && local.y <= 4) return 3;
    // Frame inner (white ring): 1,1 to 5,5 excluding ball
    if (local.x >= 1 && local.x <= 5 && local.y >= 1 && local.y <= 5) return 2;
    // Frame outer: 0,0 to 6,6 excluding inner
    return 1;
}

// Render shape based on ID
float renderShape(vec2 p, int shapeId, float size) {
    if (shapeId == 0) return sdSquare(p, size * 0.5);           // Square
    if (shapeId == 1) return sdCircle(p, size * 0.45);           // Dot/Circle
    if (shapeId == 2) return sdRoundedSquare(p, size * 0.5, size * 0.15); // Rounded
    if (shapeId == 3) return sdDiamond(p, size * 0.5);           // Diamond
    if (shapeId == 4) return sdStar(p, size * 0.5, 4, 2.5);      // Star (4-point)
    if (shapeId == 5) return sdCircle(p, size * 0.35);           // Clover (smaller dots)
    if (shapeId == 6) return sdCircle(p, size * 0.25);           // Tiny-dots
    if (shapeId == 7) return sdSquare(p, vec2(size * 0.5, size * 0.3).x); // H-bars approx
    return sdSquare(p, size * 0.5);
}

void main() {
    // Map UV to QR module coordinates with PADDING (Quiet Zone)
    // Standard QR padding is 4 modules. WASM likely uses this.
    // Map UV (0.0 - 1.0) to (-4.0 to size + 4.0)
    float padding = 4.0;
    float totalSize = float(uQRSize) + (padding * 2.0);
    
    vec2 qrCoord = (vUv * totalSize) - padding;
    ivec2 module = ivec2(floor(qrCoord));
    vec2 localPos = fract(qrCoord) - 0.5; // -0.5 to 0.5 within module
    
    // Bounds check
    if (module.x < 0 || module.x >= uQRSize || module.y < 0 || module.y >= uQRSize) {
        fragColor = vec4(0.0);
        return;
    }
    
    // Sample matrix (is this module dark?)
    vec2 sampleUv = (vec2(module) + 0.5) / float(uQRSize);
    float isDark = texture(uTexture, sampleUv).r;
    
    // DEBUG: Visualize matrix sampling
    // fragColor = vec4(1.0, 0.0, 0.0, isDark * 0.5); return;
    
    if (isDark < 0.5) {
        fragColor = vec4(0.0);
        return;
    }
    
    // Determine which shape to use
    int eyeComp = getEyeComponent(module, uQRSize);
    float sdf;
    
    if (eyeComp == 3) {
        // Eye ball
        sdf = renderShape(localPos, uEyeBallShape, 1.0);
    } else if (eyeComp == 1) {
        // Eye frame
        sdf = renderShape(localPos, uEyeFrameShape, 1.0);
    } else if (eyeComp == 2) {
        // Eye frame inner (should be white/empty)
        fragColor = vec4(0.0);
        return;
    } else {
        // Body module
        sdf = renderShape(localPos, uBodyShape, 1.0);
    }
    
    // Sharp threshold - no antialiasing to prevent gaps between adjacent modules
    // SDF < 0 = inside shape (opaque), SDF >= 0 = outside (transparent)
    float alpha = step(sdf, 0.0);
    
    // Gradient Logic (same as GOOEY_SHADER)
    vec3 finalColor = uColor;
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
        } 
        else if (uGradientType == 2) { // Radial
            t = length(centered) * 2.0;
        } 
        else if (uGradientType == 3) { // Conic (Sweep)
            float angle = atan(centered.y, centered.x); // -PI to PI
            angle += uGradientAngle; // Apply rotation offset
            t = (angle / (2.0 * PI)) + 0.5; // Map to 0-1
        } 
        else if (uGradientType == 4) { // Diamond
            t = (abs(centered.x) + abs(centered.y)) * 1.5;
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


// Vertex Shader

struct Uniforms {
    view_proj: mat4x4<f32>,
    time: vec4<f32>, 
}
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

struct InstanceInput {
    @location(2) instance_pos: vec2<f32>, 
    @location(3) instance_scale: f32,
    @location(4) instance_color: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) world_pos: vec3<f32>,
};

@vertex
fn vs_main(
    model: VertexInput,
    instance: InstanceInput,
) -> VertexOutput {
    var out: VertexOutput;
    
    // Scale the quad based on instance data (liquid effect can modulate this)
    let scaled_pos = model.position * instance.instance_scale;
    
    // Translate to instance grid position
    // Presuming grid is XZ or XY. Let's use XY for 2D.
    // model.position is typically centered at 0,0.
    
    let world_pos = vec3<f32>(
        scaled_pos.x + instance.instance_pos.x,
        scaled_pos.y + instance.instance_pos.y,
        scaled_pos.z // Z usually 0 or used for depth toggling
    );

    out.world_pos = world_pos;
    
    // Transform
    out.clip_position = u.view_proj * vec4<f32>(world_pos, 1.0);
    
    // Pass color and UV
    out.color = vec4<f32>(instance.instance_color, 1.0);
    out.uv = model.uv;
    
    return out;
}

// Fragment Shader

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Soft Particle / Metaball look
    // UV is 0..1. Center is 0.5, 0.5
    let center = vec2<f32>(0.5, 0.5);
    let dist = distance(in.uv, center);
    
    // Smooth glow: 1.0 at center, fades to 0.0 at radius 0.5
    // Power function controls sharpness
    let glow = 1.0 - smoothstep(0.0, 0.5, dist);
    let alpha = pow(glow, 2.0); // Make it fall off faster for "blob" look

    if (alpha < 0.01) {
        discard;
    }
    
    // Dynamic Color modification
    // Use instance color but boost brightness at center for "hot" look
    let final_color = in.color.rgb * (1.0 + alpha * 1.5);
    
    return vec4<f32>(final_color, alpha * in.color.a);
}

//! Shader and pipeline configuration

use crate::mesh::Vertex;

/// WGSL shader for animated wave plane
pub const SHADER: &str = r#"
struct Uniforms {
    view_proj: mat4x4<f32>,
    time: vec4<f32>, // .x = time
}
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(model: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    
    let t = u.time.x;
    var pos = model.position;
    
    // Wave deformation
    let dist = length(pos.xz);
    let y = sin(dist * 5.0 - t * 2.0) * 0.5 + sin(pos.x * 3.0 + t) * 0.2;
    pos.y = y;

    // Transform using pre-calculated matrix
    out.clip_position = u.view_proj * vec4<f32>(pos, 1.0);
    
    // Height-based color
    let color_high = vec3<f32>(0.2, 0.8, 1.0); // Cyan
    let color_low = vec3<f32>(0.8, 0.1, 0.5);  // Magenta
    let mix_factor = clamp((y + 0.5), 0.0, 1.0);
    
    out.color = vec4<f32>(mix(color_low, color_high, mix_factor), 1.0);
    
    // Grid visual
    let grid = step(0.9, fract(model.uv.x * 20.0)) + step(0.9, fract(model.uv.y * 20.0));
    out.color += vec4<f32>(vec3<f32>(grid * 0.3), 0.0);

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    return in.color;
}
"#;

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Uniforms {
    pub view_proj: [[f32; 4]; 4],
    pub time: [f32; 4],
}

/// Create the render pipeline
pub fn create_pipeline(
    device: &wgpu::Device,
    bind_group_layout: &wgpu::BindGroupLayout,
    format: wgpu::TextureFormat,
) -> wgpu::RenderPipeline {
    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some("Shader"),
        // use compile-time generic loading or runtime
        // macro standard in wgpu environment
        source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
    });

    let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: Some("Pipeline Layout"),
        bind_group_layouts: &[bind_group_layout],
        push_constant_ranges: &[],
    });

    device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
        label: Some("Render Pipeline"),
        layout: Some(&pipeline_layout),
        vertex: wgpu::VertexState {
            module: &shader,
            entry_point: Some("vs_main"), // Updated for wgpu 23
            buffers: &[
                crate::mesh::Vertex::desc(),
                crate::mesh::Instance::desc(),
            ],
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        },
        fragment: Some(wgpu::FragmentState {
            module: &shader,
            entry_point: Some("fs_main"), // Updated for wgpu 23
            targets: &[Some(wgpu::ColorTargetState {
                format,
                blend: Some(wgpu::BlendState::ALPHA_BLENDING), // Enable alpha
                write_mask: wgpu::ColorWrites::ALL,
            })],
            compilation_options: wgpu::PipelineCompilationOptions::default(),
        }),
        primitive: wgpu::PrimitiveState {
            topology: wgpu::PrimitiveTopology::TriangleList,
            strip_index_format: None,
            front_face: wgpu::FrontFace::Ccw,
            cull_mode: None, // No cull for particles usually, or Back
            polygon_mode: wgpu::PolygonMode::Fill,
            unclipped_depth: false,
            conservative: false,
        },
        depth_stencil: Some(wgpu::DepthStencilState {
            format: wgpu::TextureFormat::Depth32Float,
            depth_write_enabled: false, // Particles don't write depth (usually)
            depth_compare: wgpu::CompareFunction::Less,
            stencil: wgpu::StencilState::default(),
            bias: wgpu::DepthBiasState::default(),
        }),
        multisample: wgpu::MultisampleState::default(),
        multiview: None,
        cache: None, // NEW in wgpu 22
    })
}

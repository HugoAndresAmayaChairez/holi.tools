//! Renderer state management

use wasm_bindgen::prelude::*;
use web_sys::{HtmlCanvasElement, Window};

use crate::math::generate_view_projection;
use crate::mesh::{create_quad_mesh, Instance};
use crate::pipeline::{create_pipeline, Uniforms};
use wgpu::util::DeviceExt;

pub struct State {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    render_pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    instance_buffer: wgpu::Buffer,
    uniform_buffer: wgpu::Buffer,
    bind_group: wgpu::BindGroup,
    depth_texture: wgpu::Texture,
    depth_view: wgpu::TextureView,
    num_indices: u32,
    num_instances: u32,
    start: f64,
}

impl State {
    pub async fn new(canvas: &HtmlCanvasElement) -> Result<Self, JsValue> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        // Create surface from canvas
        let surface = instance
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas.clone()))
            .map_err(|e| JsValue::from_str(&format!("create_surface failed: {e:?}")))?;

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| JsValue::from_str("No suitable GPU adapter"))?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Device"),
                    required_features: wgpu::Features::empty(),
                    // WebGL2 Defaults for compatibility, but respecting wgpu 23.0 restrictions if any
                    // wgpu::Limits::downlevel_webgl2_defaults() is ideal for broad support.
                    required_limits: wgpu::Limits::downlevel_webgl2_defaults().using_resolution(adapter.limits()),
                    memory_hints: wgpu::MemoryHints::Performance,
                },
                None,
            )
            .await
            .map_err(|e| JsValue::from_str(&format!("request_device failed: {e:?}")))?;

        let (vertex_buffer, index_buffer, num_indices) = create_quad_mesh(&device);
        
        // Initial Instance Buffer (Empty)
        // Capacity for 10k instances
        let instance_data = vec![Instance { position: [0.0,0.0], scale: 0.0, color: [0.0,0.0,0.0] }; 10000];
        let instance_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Instance Buffer"),
            contents: bytemuck::cast_slice(&instance_data),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        });
        let num_instances = 0;

        let uniform_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Uniform Buffer"),
            size: std::mem::size_of::<Uniforms>() as wgpu::BufferAddress,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Bind Group Layout"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX | wgpu::ShaderStages::FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Bind Group"),
            layout: &bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniform_buffer.as_entire_binding(),
            }],
        });

        let caps = surface.get_capabilities(&adapter);
        let swapchain_format = caps.formats[0];

        let width = canvas.width().max(1);
        let height = canvas.height().max(1);

        let depth_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Depth Texture"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        let depth_view = depth_texture.create_view(&wgpu::TextureViewDescriptor::default());

        let render_pipeline = create_pipeline(&device, &bind_group_layout, swapchain_format);

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: swapchain_format,
            width,
            height,
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        Ok(Self {
            surface,
            device,
            queue,
            config,
            render_pipeline,
            vertex_buffer,
            index_buffer,
            instance_buffer,
            uniform_buffer,
            bind_group,
            depth_texture,
            depth_view,
            num_indices,
            num_instances,
            start: js_sys::Date::now(),
        })
    }

    pub fn update_instances(&mut self, data: &[f32]) {
        // data layout: [x, y, scale, r, g, b] per instance
        let instances: &[Instance] = bytemuck::cast_slice(data);
        self.num_instances = instances.len() as u32;

        if self.num_instances > 0 {
             let bytes: &[u8] = bytemuck::cast_slice(instances);
             // Ensure we don't overflow buffer (10k capacity)
             let max_bytes = 10000 * std::mem::size_of::<Instance>();
             let write_len = bytes.len().min(max_bytes);
             self.queue.write_buffer(&self.instance_buffer, 0, &bytes[..write_len]);
        }
    }

    pub fn start_time(&self) -> f64 {
        self.start
    }

    pub fn resize_if_needed(&mut self, window: &Window, canvas: &HtmlCanvasElement) {
        let pixel_ratio = window.device_pixel_ratio().min(2.0);
        let limits = self.device.limits();
        let max_dim = limits.max_texture_dimension_2d;

        let width = ((window.inner_width().unwrap().as_f64().unwrap() * pixel_ratio) as u32).min(max_dim).max(1);
        let height = ((window.inner_height().unwrap().as_f64().unwrap() * pixel_ratio) as u32).min(max_dim).max(1);

        if canvas.width() != width || canvas.height() != height {
            canvas.set_width(width);
            canvas.set_height(height);
        }

        if self.config.width == width && self.config.height == height {
            return;
        }

        self.config.width = width;
        self.config.height = height;
        self.surface.configure(&self.device, &self.config);

        self.depth_texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Depth Texture"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        self.depth_view = self.depth_texture.create_view(&wgpu::TextureViewDescriptor::default());
    }

    pub fn render(&mut self, time_s: f32) {
        let view_proj = generate_view_projection(self.config.width as f32, self.config.height as f32, time_s * 0.5);

        let uniforms = Uniforms {
            view_proj,
            time: [time_s, 0.0, 0.0, 0.0],
        };
        self.queue.write_buffer(&self.uniform_buffer, 0, bytemuck::cast_slice(&[uniforms]));

        let frame = match self.surface.get_current_texture() {
            Ok(frame) => frame,
            Err(_) => return,
        };
        let view = frame.texture.create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Render Encoder"),
        });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0,
                            a: 0.0, // Transparent clear
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &self.depth_view,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                occlusion_query_set: None,
                timestamp_writes: None,
            });

            render_pass.set_pipeline(&self.render_pipeline);
            render_pass.set_bind_group(0, &self.bind_group, &[]);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
            render_pass.set_vertex_buffer(1, self.instance_buffer.slice(..));
            render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);
            render_pass.draw_indexed(0..self.num_indices, 0, 0..self.num_instances);
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        frame.present();
    }
}

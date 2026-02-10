//! Ultra-light WebGL2 QR Renderer
//! Target: < 15KB WASM
//!
//! Uses raw web-sys bindings to WebGL2 for minimal overhead.

use wasm_bindgen::prelude::*;
use web_sys::{WebGl2RenderingContext, WebGlProgram, WebGlShader, HtmlCanvasElement};

// Vertex Shader (GLSL ES 3.0)
const VS_SRC: &str = r#"#version 300 es
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec3 a_color;
layout(location = 2) in float a_scale;

out vec3 v_color;
out vec2 v_uv;

uniform vec2 u_resolution;

void main() {
    // Each vertex is a corner of a quad centered at a_pos
    // Quad vertices: 0=(-1,-1), 1=(1,-1), 2=(-1,1), 3=(1,1)
    float size = a_scale * 8.0; // Base size in pixels
    vec2 corner = vec2(
        float(gl_VertexID & 1) * 2.0 - 1.0,
        float((gl_VertexID >> 1) & 1) * 2.0 - 1.0
    );
    
    vec2 pos = a_pos + corner * size;
    
    // Normalize to clip space (-1 to 1)
    vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
    clip.y = -clip.y; // Flip Y for canvas coords
    
    gl_Position = vec4(clip, 0.0, 1.0);
    v_color = a_color;
    v_uv = corner * 0.5 + 0.5;
}
"#;

// Fragment Shader (Solid Square)
const FS_SRC: &str = r#"#version 300 es
precision mediump float;

in vec3 v_color;
in vec2 v_uv;
out vec4 fragColor;

void main() {
    // v_uv goes from 0 to 1 across the quad
    // For a solid square, just fill it completely
    fragColor = vec4(v_color, 1.0);
}
"#;

static mut GL: Option<WebGl2RenderingContext> = None;
static mut PROGRAM: Option<WebGlProgram> = None;
static mut CANVAS_W: f32 = 300.0;
static mut CANVAS_H: f32 = 300.0;

#[wasm_bindgen]
pub fn init(canvas_id: &str) -> Result<(), JsValue> {
    let window = web_sys::window().ok_or("no window")?;
    let document = window.document().ok_or("no document")?;
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or("canvas not found")?
        .dyn_into::<HtmlCanvasElement>()?;

    let gl = canvas
        .get_context("webgl2")?
        .ok_or("webgl2 not supported")?
        .dyn_into::<WebGl2RenderingContext>()?;

    // Compile shaders
    let vs = compile_shader(&gl, WebGl2RenderingContext::VERTEX_SHADER, VS_SRC)?;
    let fs = compile_shader(&gl, WebGl2RenderingContext::FRAGMENT_SHADER, FS_SRC)?;
    let program = link_program(&gl, &vs, &fs)?;
    
    gl.use_program(Some(&program));
    
    // Enable blending
    gl.enable(WebGl2RenderingContext::BLEND);
    gl.blend_func(
        WebGl2RenderingContext::SRC_ALPHA,
        WebGl2RenderingContext::ONE_MINUS_SRC_ALPHA,
    );

    unsafe {
        CANVAS_W = canvas.width() as f32;
        CANVAS_H = canvas.height() as f32;
        GL = Some(gl);
        PROGRAM = Some(program);
    }

    Ok(())
}

/// Render QR modules as glowing particles
/// `data`: Flat array of [x, y, r, g, b, scale] per module
#[wasm_bindgen]
pub fn render(data: &[f32]) {
    unsafe {
        let gl = match &GL {
            Some(g) => g,
            None => return,
        };
        let program = match &PROGRAM {
            Some(p) => p,
            None => return,
        };

        // Clear
        gl.clear_color(0.0, 0.0, 0.0, 0.0);
        gl.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);

        if data.is_empty() {
            return;
        }

        // Set resolution uniform
        let u_res = gl.get_uniform_location(program, "u_resolution");
        gl.uniform2f(u_res.as_ref(), CANVAS_W, CANVAS_H);

        // Create VAO
        let vao = gl.create_vertex_array().unwrap();
        gl.bind_vertex_array(Some(&vao));

        // Create instance buffer
        let buffer = gl.create_buffer().unwrap();
        gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&buffer));
        
        // Upload data
        gl.buffer_data_with_array_buffer_view(
            WebGl2RenderingContext::ARRAY_BUFFER,
            &js_sys::Float32Array::from(data),
            WebGl2RenderingContext::STATIC_DRAW,
        );

        // Stride: 6 floats per instance (x, y, r, g, b, scale)
        let stride = 6 * 4;
        
        // a_pos (location 0): vec2
        gl.enable_vertex_attrib_array(0);
        gl.vertex_attrib_pointer_with_i32(0, 2, WebGl2RenderingContext::FLOAT, false, stride, 0);
        gl.vertex_attrib_divisor(0, 1);

        // a_color (location 1): vec3
        gl.enable_vertex_attrib_array(1);
        gl.vertex_attrib_pointer_with_i32(1, 3, WebGl2RenderingContext::FLOAT, false, stride, 8);
        gl.vertex_attrib_divisor(1, 1);

        // a_scale (location 2): float
        gl.enable_vertex_attrib_array(2);
        gl.vertex_attrib_pointer_with_i32(2, 1, WebGl2RenderingContext::FLOAT, false, stride, 20);
        gl.vertex_attrib_divisor(2, 1);

        // Draw instanced quads (4 vertices per quad, N instances)
        let num_instances = (data.len() / 6) as i32;
        gl.draw_arrays_instanced(
            WebGl2RenderingContext::TRIANGLE_STRIP,
            0,
            4,
            num_instances,
        );

        // Cleanup
        gl.delete_buffer(Some(&buffer));
        gl.delete_vertex_array(Some(&vao));
    }
}

fn compile_shader(
    gl: &WebGl2RenderingContext,
    shader_type: u32,
    source: &str,
) -> Result<WebGlShader, String> {
    let shader = gl.create_shader(shader_type).ok_or("create shader failed")?;
    gl.shader_source(&shader, source);
    gl.compile_shader(&shader);
    
    if gl.get_shader_parameter(&shader, WebGl2RenderingContext::COMPILE_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        Ok(shader)
    } else {
        Err(gl.get_shader_info_log(&shader).unwrap_or_default())
    }
}

fn link_program(
    gl: &WebGl2RenderingContext,
    vs: &WebGlShader,
    fs: &WebGlShader,
) -> Result<WebGlProgram, String> {
    let program = gl.create_program().ok_or("create program failed")?;
    gl.attach_shader(&program, vs);
    gl.attach_shader(&program, fs);
    gl.link_program(&program);
    
    if gl.get_program_parameter(&program, WebGl2RenderingContext::LINK_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        Ok(program)
    } else {
        Err(gl.get_program_info_log(&program).unwrap_or_default())
    }
}

//! Math utilities for 3D rendering

/// Subtract two 3D vectors
pub fn sub(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

/// Cross product of two 3D vectors
pub fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// Normalize a 3D vector
pub fn normalize(v: [f32; 3]) -> [f32; 3] {
    let len = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    if len == 0.0 { 
        [0.0; 3] 
    } else { 
        [v[0] / len, v[1] / len, v[2] / len] 
    }
}

/// Dot product of two 3D vectors
pub fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/// Multiply two 4x4 matrices
pub fn multiply_matrices(a: [[f32; 4]; 4], b: [[f32; 4]; 4]) -> [[f32; 4]; 4] {
    let mut out = [[0.0; 4]; 4];
    for i in 0..4 {
        for j in 0..4 {
            out[i][j] = a[0][j] * b[i][0] + a[1][j] * b[i][1] + a[2][j] * b[i][2] + a[3][j] * b[i][3];
        }
    }
    out
}

/// Generate a combined view-projection matrix for static top-down camera
pub fn generate_view_projection(width: f32, height: f32, _time: f32) -> [[f32; 4]; 4] {
    let aspect = width / height;
    
    // ORTHOGRAPHIC PROJECTION (Better for 2D readability)
    // We want to see roughly -20 to +20 range?
    // Let's assume QR is ~30x30.
    // Zoom factor:
    let zoom = 30.0; 
    let left = -zoom * aspect;
    let right = zoom * aspect;
    let bottom = -zoom;
    let top = zoom;
    let near = 0.1;
    let far = 100.0;

    let r_l = right - left;
    let t_b = top - bottom;
    let f_n = far - near;

    let proj = [
        [2.0 / r_l, 0.0, 0.0, 0.0],
        [0.0, 2.0 / t_b, 0.0, 0.0],
        [0.0, 0.0, -1.0 / f_n, 0.0], // WGPU depth [0, 1]
        [-(right + left) / r_l, -(top + bottom) / t_b, -near / f_n, 1.0],
    ];

    // Ortho is simple, no view matrix needed if we align world to camera
    // But let's keep a basic view transform just in case we want to pan
    // Identity View (Camera at 0,0, looking -Z?) 
    // Wait, our particles are on XZ plane (y=0).
    // So we need to look from +Y down, or rotate the particles.
    // Let's Rotate View: look from +Y down.
    
    // View matrix (static front view)
    // Particles are on XY plane. We look from +Z.
    
    // Ortho is already set up.
    // If we use Identity View, we look down -Z. 
    // Eye at 0,0,0 looking -Z.
    // So if particles are at Z=0, and Near=0.1, they might be clipped?
    // We need to move camera BACK on +Z.
    
    // LookAt(eye=[0, 0, 50], center=[0, 0, 0], up=[0, 1, 0])
    let view = [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0], // Y is Up
        [0.0, 0.0, 1.0, 0.0], // Z is Z
        [0.0, 0.0, -50.0, 1.0], // Translate World relative to camera (Move camera to +50 => world moves -50)
    ];

    multiply_matrices(proj, view)
}

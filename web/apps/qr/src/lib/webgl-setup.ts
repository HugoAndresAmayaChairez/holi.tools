/**
 * webgl-setup.ts — WebGL boilerplate helpers
 *
 * Extracted from WebGLLiquidRenderer to keep the renderer focused
 * on the render pipeline.  These functions create shader programs,
 * textures, and framebuffers.
 */

/**
 * Compile + link a shader program from GLSL source strings.
 */
export function createProgram(
    gl: WebGL2RenderingContext,
    vsSource: string,
    fsSource: string
): WebGLProgram | null {
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
        return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
        return null;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

/**
 * Create a 2D texture of the given size.
 *
 * @param isRGBA  true → RGBA8 with LINEAR filtering (for color data);
 *                false → R8 with NEAREST filtering (for QR matrix data).
 */
export function createTexture(
    gl: WebGL2RenderingContext,
    size: number,
    isRGBA: boolean
): WebGLTexture | null {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    if (isRGBA) {
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA8,
            size, size, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.R8,
            size, size, 0,
            gl.RED, gl.UNSIGNED_BYTE, null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

/**
 * Create a framebuffer and attach the given texture as COLOR_ATTACHMENT0.
 */
export function createFBO(
    gl: WebGL2RenderingContext,
    texture: WebGLTexture
): WebGLFramebuffer {
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
}

/**
 * Load an image from a URL/data-URI into a WebGL texture.
 * Reuses an existing texture object if provided.
 *
 * @param onLoad  Optional callback invoked with the loaded HTMLImageElement
 *                (useful for capturing aspect ratio).
 */
export function loadTexture(
    gl: WebGL2RenderingContext,
    url: string | null,
    texture: WebGLTexture | null,
    onLoad?: (img: HTMLImageElement) => void
): Promise<WebGLTexture | null> {
    if (!url) {
        if (texture) gl.deleteTexture(texture);
        return Promise.resolve(null);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve) => {
        img.onload = () => {
            const tex = texture || gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            onLoad?.(img);
            resolve(tex);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

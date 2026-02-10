/**
 * GIF Handler Module
 * Parses animated GIFs and exports animated GIFs
 * Uses gifuct-js for decoding and gif.js for encoding
 */

import { parseGIF, decompressFrames } from 'gifuct-js';

// =============================================================================
// TYPES
// =============================================================================

export interface GifFrame {
    imageData: ImageData;
    delay: number;  // milliseconds
    width: number;
    height: number;
}

export interface ParsedGif {
    frames: GifFrame[];
    width: number;
    height: number;
    totalDuration: number;
}

// =============================================================================
// GIF DETECTION
// =============================================================================

/**
 * Check if a file is a GIF based on MIME type or extension
 */
export function isGifFile(file: File): boolean {
    return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

/**
 * Check if ArrayBuffer contains GIF magic bytes
 */
export function isGifBuffer(buffer: ArrayBuffer): boolean {
    const bytes = new Uint8Array(buffer.slice(0, 6));
    // GIF87a or GIF89a
    return (
        bytes[0] === 0x47 && // G
        bytes[1] === 0x49 && // I
        bytes[2] === 0x46 && // F
        bytes[3] === 0x38 && // 8
        (bytes[4] === 0x37 || bytes[4] === 0x39) && // 7 or 9
        bytes[5] === 0x61 // a
    );
}

// =============================================================================
// GIF PARSING
// =============================================================================

/**
 * Parse a GIF file and extract all frames
 */
export async function parseGifFile(file: File): Promise<ParsedGif> {
    const buffer = await file.arrayBuffer();
    return parseGifBuffer(buffer);
}

/**
 * Parse GIF from ArrayBuffer
 */
export function parseGifBuffer(buffer: ArrayBuffer): ParsedGif {
    const gif = parseGIF(buffer);
    const rawFrames = decompressFrames(gif, true);

    if (!rawFrames.length) {
        throw new Error('No frames found in GIF');
    }

    const frames: GifFrame[] = [];
    let totalDuration = 0;

    // Create a canvas to composite frames (GIF frames can be partial)
    const gifWidth = gif.lsd.width;
    const gifHeight = gif.lsd.height;
    const canvas = document.createElement('canvas');
    canvas.width = gifWidth;
    canvas.height = gifHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get 2D canvas context for GIF processing');
    }

    // Previous frame data for disposal
    let previousImageData: ImageData | null = null;

    for (const frame of rawFrames) {
        const delay = (frame.delay || 10) * 10; // Convert centiseconds to ms
        totalDuration += delay;

        // Handle disposal method from previous frame
        if (previousImageData && frame.disposalType === 2) {
            // Restore to background (clear area)
            ctx.clearRect(0, 0, gifWidth, gifHeight);
        } else if (previousImageData && frame.disposalType === 3) {
            // Restore to previous
            ctx.putImageData(previousImageData, 0, 0);
        }

        // Save current state if needed for next frame
        if (frame.disposalType === 3) {
            previousImageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
        }

        // Create ImageData from frame patch
        const patchData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frame.dims.width,
            frame.dims.height
        );

        // Draw frame patch at correct position
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(patchData, 0, 0);

        ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

        // Capture full frame
        const fullFrameData = ctx.getImageData(0, 0, gifWidth, gifHeight);

        frames.push({
            imageData: fullFrameData,
            delay,
            width: gifWidth,
            height: gifHeight
        });
    }

    return {
        frames,
        width: gifWidth,
        height: gifHeight,
        totalDuration
    };
}

// =============================================================================
// GIF ANIMATION CONTROLLER
// =============================================================================

export class GifAnimator {
    private frames: GifFrame[] = [];
    private currentFrameIndex = 0;
    private animationId: number | null = null;
    private lastFrameTime = 0;
    private onFrameChange: ((frame: GifFrame) => void) | null = null;
    private isPlaying = false;

    constructor() { }

    /**
     * Load frames from parsed GIF
     */
    loadFrames(parsedGif: ParsedGif): void {
        this.frames = parsedGif.frames;
        this.currentFrameIndex = 0;
        this.lastFrameTime = 0;
    }

    /**
     * Set callback for frame changes
     */
    onFrame(callback: (frame: GifFrame) => void): void {
        this.onFrameChange = callback;
    }

    /**
     * Start animation loop
     */
    play(): void {
        if (this.isPlaying || this.frames.length === 0) return;
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    /**
     * Stop animation
     */
    stop(): void {
        this.isPlaying = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Get current frame
     */
    getCurrentFrame(): GifFrame | null {
        return this.frames[this.currentFrameIndex] || null;
    }

    /**
     * Get all frames (for export)
     */
    getFrames(): GifFrame[] {
        return this.frames;
    }

    /**
     * Clear all frames
     */
    clear(): void {
        this.stop();
        this.frames = [];
        this.currentFrameIndex = 0;
    }

    private animate = (): void => {
        if (!this.isPlaying) return;

        const now = performance.now();
        const currentFrame = this.frames[this.currentFrameIndex];

        if (now - this.lastFrameTime >= currentFrame.delay) {
            // Advance to next frame
            this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
            this.lastFrameTime = now;

            // Notify listener
            if (this.onFrameChange) {
                this.onFrameChange(this.frames[this.currentFrameIndex]);
            }
        }

        this.animationId = requestAnimationFrame(this.animate);
    };
}

// =============================================================================
// GIF EXPORT
// =============================================================================

/**
 * Export frames as animated GIF
 * Uses gif.js library
 */
export async function exportAnimatedGif(
    captureFrame: (frameIndex: number) => Promise<HTMLCanvasElement>,
    frameCount: number,
    frameDelays: number[],
    width: number,
    height: number
): Promise<Blob> {
    // Dynamic import of gif.js (it's a worker-based library)
    const GIF = (await import('gif.js')).default;

    return new Promise((resolve, reject) => {
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width,
            height,
            workerScript: '/gif.worker.js' // Need to copy this to public
        });

        gif.on('finished', (blob: Blob) => {
            resolve(blob);
        });

        gif.on('error', (err: Error) => {
            reject(err);
        });

        // Capture each frame
        (async () => {
            for (let i = 0; i < frameCount; i++) {
                const canvas = await captureFrame(i);
                gif.addFrame(canvas, { delay: frameDelays[i], copy: true });
            }
            gif.render();
        })();
    });
}

// Singleton instance
export const gifAnimator = new GifAnimator();

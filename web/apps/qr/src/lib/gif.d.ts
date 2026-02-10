declare module 'gif.js' {
    interface GIFOptions {
        workers?: number;
        quality?: number;
        width?: number;
        height?: number;
        workerScript?: string;
        background?: string;
        transparent?: number | null;
        dither?: boolean | string;
        debug?: boolean;
    }

    interface FrameOptions {
        delay?: number;
        copy?: boolean;
        dispose?: number;
    }

    class GIF {
        constructor(options?: GIFOptions);
        addFrame(
            image: CanvasImageSource | CanvasRenderingContext2D | ImageData,
            options?: FrameOptions
        ): void;
        on(event: 'finished', callback: (blob: Blob) => void): void;
        on(event: 'progress', callback: (p: number) => void): void;
        on(event: 'error', callback: (err: Error) => void): void;
        render(): void;
        abort(): void;
    }

    export default GIF;
}

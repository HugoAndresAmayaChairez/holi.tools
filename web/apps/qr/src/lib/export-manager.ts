import { downloadBlob } from './qr-engine';

/**
 * ExportManager - Handles downloading QR codes in various formats
 * (SVG, PNG, PDF)
 */
export class ExportManager {

    constructor() { }

    /**
     * Download QR as real vector SVG
     */
    public async downloadSVG() {
        const svgString = await (window as any).qrController?.getSVGForExport?.();

        if (!svgString || typeof svgString !== 'string' || svgString.length === 0) {
            console.error('ExportManager: Failed to generate vector SVG');
            return;
        }

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `qr-code-${Date.now()}.svg`);
    }

    /**
     * Download QR as PNG (Direct WebGL snapshot)
     */
    public async downloadPNG() {
        // @ts-ignore
        const blob = await window.qrController?.getHighResSnapshot(2048);
        if (!blob) {
            console.error("ExportManager: Failed to capture WebGL snapshot");
            return;
        }
        downloadBlob(blob, `qr-code-${Date.now()}.png`);
    }

    /**
     * Download QR as JPEG (raster) derived from the WebGL snapshot.
     * JPEG doesn't support alpha; defaults to a white background.
     */
    public async downloadJPEG() {
        // @ts-ignore
        const pngBlob = await window.qrController?.getHighResSnapshot(2048);
        if (!pngBlob) {
            console.error('ExportManager: Failed to capture WebGL snapshot');
            return;
        }

        const bg = (window as any).state?.config?.bg;
        const backgroundColor = (typeof bg === 'string' && bg.length > 0 && bg !== 'transparent') ? bg : '#ffffff';

        const jpegBlob = await this.convertImageBlob(pngBlob, 'image/jpeg', 0.92, backgroundColor);
        downloadBlob(jpegBlob, `qr-code-${Date.now()}.jpg`);
    }

    // PDF Export Removed as per user request to save bundle size

    /**
     * Handle download button click (Format selection)
     */
    public handleDownloadAction(format: 'svg' | 'png' | 'pdf' | 'jpeg' | 'jpg' | 'webp') {
        switch (format) {
            case 'svg':
                this.downloadSVG();
                break;
            case 'png':
                this.downloadPNG();
                break;
            case 'jpg':
            case 'jpeg':
                this.downloadJPEG();
                break;
            default:
                this.downloadPNG();
                break;
        }
    }

    private async convertImageBlob(
        blob: Blob,
        mimeType: 'image/jpeg' | 'image/webp',
        quality: number,
        backgroundColor: string
    ): Promise<Blob> {
        const img = await this.loadImageFromBlob(blob);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        // Fill background because JPEG/WebP may not preserve alpha as expected.
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (out) => (out ? resolve(out) : reject(new Error('Failed to create output blob'))),
                mimeType,
                quality
            );
        });
    }

    private async loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
        const url = URL.createObjectURL(blob);
        try {
            return await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Failed to load image blob'));
                img.src = url;
            });
        } finally {
            URL.revokeObjectURL(url);
        }
    }
}

export const exportManager = new ExportManager();

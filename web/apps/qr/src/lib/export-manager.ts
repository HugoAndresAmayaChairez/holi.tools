import { downloadBlob } from './qr-engine';
import { toastDownloadResult } from './ui/toast';
import { applyFrameToPng, applyFrameToSvg } from './workspace/frame';

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
            toastDownloadResult('SVG', false);
            return;
        }

        const blob = new Blob([applyFrameToSvg(svgString)], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `qr-code-${Date.now()}.svg`);
        toastDownloadResult('SVG', true);
    }

    /**
     * Download QR as PNG (Direct WebGL snapshot)
     */
    public async downloadPNG(size: number = 2048) {
        // @ts-ignore
        const snapshot = await window.qrController?.getHighResSnapshot(size);
        if (!snapshot) {
            console.error("ExportManager: Failed to capture WebGL snapshot");
            toastDownloadResult(`PNG ${size}px`, false);
            return;
        }
        const blob = await applyFrameToPng(snapshot);
        downloadBlob(blob, `qr-code-${Date.now()}-${size}px.png`);
        toastDownloadResult(`PNG ${size}px`, true);
    }

    /**
     * Download QR as JPEG (raster) derived from the WebGL snapshot.
     * JPEG doesn't support alpha; defaults to a white background.
     */
    public async downloadJPEG(size: number = 2048) {
        // @ts-ignore
        const pngBlob = await window.qrController?.getHighResSnapshot(size).then((b: Blob | null) => (b ? applyFrameToPng(b) : b));
        if (!pngBlob) {
            console.error('ExportManager: Failed to capture WebGL snapshot');
            toastDownloadResult(`JPG ${size}px`, false);
            return;
        }

        const bg = (window as any).state?.config?.bg;
        const backgroundColor = (typeof bg === 'string' && bg.length > 0 && bg !== 'transparent') ? bg : '#ffffff';

        const { blob: jpegBlob } = await this.rasterizeImageBlob(pngBlob, 'image/jpeg', 0.92, backgroundColor);
        downloadBlob(jpegBlob, `qr-code-${Date.now()}-${size}px.jpg`);
        toastDownloadResult(`JPG ${size}px`, true);
    }

    /**
     * Download QR as PDF. Uses the same WebGL snapshot path as PNG so the
     * visible styling, layers, logo, and effects are preserved.
     */
    public async downloadPDF(size: number = 2048) {
        // @ts-ignore
        const pngBlob = await window.qrController?.getHighResSnapshot(size).then((b: Blob | null) => (b ? applyFrameToPng(b) : b));
        if (!pngBlob) {
            console.error('ExportManager: Failed to capture WebGL snapshot');
            toastDownloadResult(`PDF ${size}px`, false);
            return;
        }

        const bg = (window as any).state?.config?.bg;
        const backgroundColor = (typeof bg === 'string' && bg.length > 0 && bg !== 'transparent') ? bg : '#ffffff';
        const image = await this.rasterizeImageBlob(pngBlob, 'image/jpeg', 0.94, backgroundColor);
        const pdfBlob = await this.createPdfFromJpeg(image.blob, image.width, image.height);

        downloadBlob(pdfBlob, `qr-code-${Date.now()}-${size}px.pdf`);
        toastDownloadResult(`PDF ${size}px`, true);
    }

    public async downloadWEBP(size: number = 2048) {
        // @ts-ignore
        const pngBlob = await window.qrController?.getHighResSnapshot(size).then((b: Blob | null) => (b ? applyFrameToPng(b) : b));
        if (!pngBlob) {
            console.error('ExportManager: Failed to capture WebGL snapshot');
            toastDownloadResult(`WEBP ${size}px`, false);
            return;
        }

        const bg = (window as any).state?.config?.bg;
        const backgroundColor = (typeof bg === 'string' && bg.length > 0 && bg !== 'transparent') ? bg : '#ffffff';
        const { blob } = await this.rasterizeImageBlob(pngBlob, 'image/webp', 0.92, backgroundColor);
        downloadBlob(blob, `qr-code-${Date.now()}-${size}px.webp`);
        toastDownloadResult(`WEBP ${size}px`, true);
    }

    /**
     * Handle download button click (Format selection)
     */
    public handleDownloadAction(
        format: 'svg' | 'png' | 'pdf' | 'jpeg' | 'jpg' | 'webp',
        size?: number
    ) {
        const safeSize = (typeof size === 'number' && Number.isFinite(size) && size > 0)
            ? Math.round(size)
            : 2048;
        switch (format) {
            case 'svg':
                return this.downloadSVG();
            case 'png':
                return this.downloadPNG(safeSize);
            case 'jpg':
            case 'jpeg':
                return this.downloadJPEG(safeSize);
            case 'pdf':
                return this.downloadPDF(safeSize);
            case 'webp':
                return this.downloadWEBP(safeSize);
            default:
                return this.downloadPNG(safeSize);
        }
    }

    private async rasterizeImageBlob(
        blob: Blob,
        mimeType: 'image/jpeg' | 'image/webp',
        quality: number,
        backgroundColor: string
    ): Promise<{ blob: Blob; width: number; height: number }> {
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

        const outBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (out) => (out ? resolve(out) : reject(new Error('Failed to create output blob'))),
                mimeType,
                quality
            );
        });
        return { blob: outBlob, width: canvas.width, height: canvas.height };
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

    private async createPdfFromJpeg(jpegBlob: Blob, imageWidth: number, imageHeight: number): Promise<Blob> {
        const imageBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const pageW = 612;
        const pageH = 612;
        const margin = 36;
        const scale = Math.min((pageW - margin * 2) / imageWidth, (pageH - margin * 2) / imageHeight);
        const drawW = imageWidth * scale;
        const drawH = imageHeight * scale;
        const drawX = (pageW - drawW) / 2;
        const drawY = (pageH - drawH) / 2;
        const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
        const content = `q\n${fmt(drawW)} 0 0 ${fmt(drawH)} ${fmt(drawX)} ${fmt(drawY)} cm\n/Im1 Do\nQ\n`;

        const objects: Array<string | Uint8Array> = [
            '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
            `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
            `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
            `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
            `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.byteLength} >>\nstream\n`,
            imageBytes,
            '\nendstream\nendobj\n'
        ];

        const encoder = new TextEncoder();
        const chunks: Uint8Array[] = [];
        const offsets: number[] = [];
        let position = 0;
        const push = (chunk: string | Uint8Array) => {
            const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
            chunks.push(bytes);
            position += bytes.byteLength;
        };

        push('%PDF-1.4\n');
        for (let i = 0; i < objects.length; i++) {
            if (i === 0 || i === 1 || i === 2 || i === 3 || i === 4) {
                offsets.push(position);
            }
            push(objects[i]);
        }

        const xrefOffset = position;
        const xrefRows = ['0000000000 65535 f '].concat(
            offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
        );
        push(`xref\n0 6\n${xrefRows.join('\n')}\n`);
        push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

        return new Blob(chunks, { type: 'application/pdf' });
    }
}

export const exportManager = new ExportManager();

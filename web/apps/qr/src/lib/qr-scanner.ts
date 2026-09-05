/**
 * QR Scanner Module
 * Handles image upload, drag & drop, paste and local decoding for the "Scan"
 * content type. All copy lives in the Astro template (translated per locale):
 * this module only swaps states and restores the server-rendered markup.
 */

import { decodeQRImage } from './qr-engine';
import { getIconSvg } from './icons';
import { toastCopyResult } from './ui/toast';

type ScanState = 'idle' | 'loading' | 'error' | 'result';

class QRScanner {
    private dropZone: HTMLElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private resultContainer: HTMLElement | null = null;
    private resultContent: HTMLElement | null = null;
    private uploadArea: HTMLElement | null = null;
    /** Pristine, localized drop-zone markup rendered by ContentForms.astro. */
    private idleMarkup: string | null = null;
    private lastDecodedContent: string = '';
    private abortController: AbortController | null = null;

    constructor() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    private init() {
        this.dropZone = document.getElementById('scan-drop-zone');
        this.fileInput = document.getElementById('scan-file-input') as HTMLInputElement | null;
        this.resultContainer = document.getElementById('scan-result');
        this.resultContent = document.getElementById('scan-result-content');
        this.uploadArea = this.dropZone?.querySelector('.scan-upload-content') as HTMLElement | null;

        if (!this.dropZone || !this.fileInput) {
            // Scan template not in DOM; activate() retries when the type changes.
            return;
        }

        // Keep the translated idle state so reset() can put it back verbatim.
        const state = (this.dropZone.dataset.scanState || 'idle') as ScanState;
        if (this.idleMarkup === null && this.uploadArea && state === 'idle') {
            this.idleMarkup = this.uploadArea.innerHTML;
        }

        this.bindEvents();
    }

    /** Localized copy comes from data-l-* attributes on the drop zone. */
    private label(key: string, fallback: string): string {
        return this.dropZone?.getAttribute('data-l-' + key)?.trim() || fallback;
    }

    private setState(state: ScanState) {
        if (this.dropZone) this.dropZone.dataset.scanState = state;
    }

    private bindEvents() {
        if (!this.dropZone || !this.fileInput) return;

        this.abortController?.abort();
        this.abortController = new AbortController();
        const signal = this.abortController.signal;
        const openPicker = () => this.fileInput?.click();

        // Click or keyboard to upload. The hidden input lives inside the drop
        // zone, so ignore the synthetic click that bubbles back from it.
        this.dropZone.addEventListener('click', (e) => {
            if (e.target === this.fileInput) return;
            openPicker();
        }, { signal });
        this.dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
            }
        }, { signal });

        this.fileInput.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files[0]) this.processFile(files[0]);
        }, { signal });

        // Drag & drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone?.classList.add('dragover');
        }, { signal });
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone?.classList.remove('dragover');
        }, { signal });
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone?.classList.remove('dragover');
            const files = e.dataTransfer?.files;
            if (files && files[0]) this.processFile(files[0]);
        }, { signal });

        // Paste from clipboard while the scan template is active.
        document.addEventListener('paste', (e) => {
            const scanTemplate = document.getElementById('template-scan');
            if (!scanTemplate?.classList.contains('active')) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        this.processFile(file);
                        break;
                    }
                }
            }
        }, { signal });

        document.getElementById('scan-copy-btn')?.addEventListener('click', () => this.copyResult(), { signal });
        document.getElementById('scan-open-btn')?.addEventListener('click', () => this.openResult(), { signal });
        document.getElementById('scan-reset-btn')?.addEventListener('click', () => this.reset(), { signal });
    }

    private async processFile(file: File) {
        // Some mobile pickers report an empty MIME type; let the decoder try those.
        if (file.type && !file.type.startsWith('image/')) {
            this.showError(this.label('not-image', 'Please choose an image file.'));
            return;
        }

        this.showLoading();

        try {
            // Decode from pixels (bounded to 1024px for speed/consistency).
            const imageData = await this.fileToImageData(file, 1024);

            // Native BarcodeDetector first (most robust with camera photos),
            // then the Rust/WASM decoder. Everything runs in this browser.
            const decoded = await decodeQRImage(imageData);

            if (!decoded) {
                this.showError(this.label('error', 'No QR code found in that image.'));
                return;
            }

            this.lastDecodedContent = decoded;
            this.showResult(decoded, URL.createObjectURL(file));
        } catch (error) {
            console.warn('QR scan failed:', error);
            this.showError(this.label('error', 'No QR code found in that image.'));
        }
    }

    private async fileToImageData(file: File, maxSize: number): Promise<ImageData> {
        // Prefer createImageBitmap when available (faster, avoids <img> decode races).
        if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(file);
            const { width, height } = this.constrainSize(bitmap.width, bitmap.height, maxSize);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close?.();
            return ctx.getImageData(0, 0, width, height);
        }

        // Fallback: <img> decode path.
        const url = URL.createObjectURL(file);
        try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = url;
            });

            const { width, height } = this.constrainSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxSize);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            ctx.drawImage(img, 0, 0, width, height);
            return ctx.getImageData(0, 0, width, height);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    private constrainSize(width: number, height: number, maxSize: number): { width: number; height: number } {
        if (!width || !height) return { width: maxSize, height: maxSize };
        const scale = Math.min(1, maxSize / Math.max(width, height));
        return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
    }

    /** Render a transient state (loading/error) with the app's own icons. */
    private renderStatus(icon: string, primary: string, secondary: string) {
        if (!this.uploadArea) return;
        this.uploadArea.replaceChildren();

        const iconEl = document.createElement('span');
        iconEl.className = 'scan-icon icon';
        iconEl.innerHTML = getIconSvg(icon, 22) || '';

        const text = document.createElement('span');
        text.className = 'scan-text';
        text.textContent = primary;

        const hint = document.createElement('span');
        hint.className = 'scan-hint';
        hint.textContent = secondary;

        this.uploadArea.append(iconEl, text, hint);
    }

    private showLoading() {
        this.setState('loading');
        this.renderStatus(
            'qr_code_scanner',
            this.label('analyzing', 'Reading the image…'),
            this.label('analyzing-hint', 'Looking for a QR code')
        );
    }

    private showError(message: string) {
        this.setState('error');
        if (this.dropZone) this.dropZone.style.display = 'flex';
        if (this.resultContainer) this.resultContainer.style.display = 'none';
        if (this.fileInput) this.fileInput.value = '';
        this.renderStatus('error', message, this.label('retry', 'Choose or drop another image to try again.'));
    }

    private showResult(content: string, previewUrl?: string) {
        this.setState('result');
        if (this.resultContent) {
            this.resultContent.textContent = content;
        }

        const previewContainer = document.getElementById('scan-preview-container');
        const previewImg = document.getElementById('scan-preview-img') as HTMLImageElement | null;

        if (previewContainer && previewImg) {
            if (previewImg.src && previewImg.src.startsWith('blob:')) {
                URL.revokeObjectURL(previewImg.src);
            }
            if (previewUrl) {
                previewImg.src = previewUrl;
                previewContainer.style.display = 'flex';
            } else {
                previewImg.removeAttribute('src');
                previewContainer.style.display = 'none';
            }
        }

        // Hide upload area, show result
        if (this.dropZone) this.dropZone.style.display = 'none';
        if (this.resultContainer) this.resultContainer.style.display = 'block';
        if (this.fileInput) this.fileInput.value = '';

        this.initActionIcons();

        // Only offer "open" for URL-like payloads.
        const openBtn = document.getElementById('scan-open-btn');
        if (openBtn) {
            openBtn.style.display = this.isUrl(content) ? 'flex' : 'none';
        }
    }

    private reset() {
        this.lastDecodedContent = '';
        this.setState('idle');

        const previewContainer = document.getElementById('scan-preview-container');
        const previewImg = document.getElementById('scan-preview-img') as HTMLImageElement | null;
        if (previewContainer && previewImg) {
            if (previewImg.src && previewImg.src.startsWith('blob:')) {
                URL.revokeObjectURL(previewImg.src);
            }
            previewImg.removeAttribute('src');
            previewContainer.style.display = 'none';
        }

        if (this.fileInput) this.fileInput.value = '';
        if (this.dropZone) this.dropZone.style.display = 'flex';
        if (this.resultContainer) this.resultContainer.style.display = 'none';

        // Put the translated idle markup back and make sure its icon is an SVG
        // (the boot icon pass may have run before or after the capture).
        if (this.uploadArea && this.idleMarkup !== null) {
            this.uploadArea.innerHTML = this.idleMarkup;
            this.uploadArea.querySelectorAll<HTMLElement>('.icon').forEach((el) => {
                const name = el.textContent?.trim();
                if (name && !el.querySelector('svg') && /^[a-z_]+$/.test(name)) {
                    el.innerHTML = getIconSvg(name, 22) || name;
                }
            });
        }
    }

    private copyResult() {
        if (!this.lastDecodedContent) return;
        navigator.clipboard.writeText(this.lastDecodedContent)
            .then(() => toastCopyResult(true))
            .catch(() => toastCopyResult(false));
    }

    private openResult() {
        if (!this.lastDecodedContent || !this.isUrl(this.lastDecodedContent)) return;

        let url = this.lastDecodedContent.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        window.open(url, '_blank', 'noopener');
    }

    private isUrl(str: string): boolean {
        // Basic URL detection
        return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(str.trim());
    }

    private initActionIcons() {
        const icons = [
            { id: 'scan-copy-btn', icon: 'content_copy' },
            { id: 'scan-open-btn', icon: 'open_in_new' },
            { id: 'scan-reset-btn', icon: 'refresh' },
        ];

        icons.forEach(({ id, icon }) => {
            const iconEl = document.getElementById(id)?.querySelector('.icon');
            if (iconEl && !iconEl.querySelector('svg')) {
                const svg = getIconSvg(icon, 18);
                if (svg) iconEl.innerHTML = svg;
            }
        });
    }

    /**
     * Cleanup event listeners when the scan template is deactivated.
     */
    public deactivate() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * (Re)initialize when the scan template becomes active.
     */
    public activate() {
        this.deactivate();
        this.init();
        this.reset();
    }
}

// Singleton
export const qrScanner = new QRScanner();

// Expose for type switcher
(window as any).qrScanner = qrScanner;

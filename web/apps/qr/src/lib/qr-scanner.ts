/**
 * QR Scanner Module
 * Handles image upload, drag & drop, and WASM-based QR decoding
 */

import { decodeQRImage } from './qr-engine';
import { getIconSvg } from './icons';

class QRScanner {
    private dropZone: HTMLElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private resultContainer: HTMLElement | null = null;
    private resultContent: HTMLElement | null = null;
    private uploadArea: HTMLElement | null = null;
    private lastDecodedContent: string = '';
    private abortController: AbortController | null = null;

    constructor() {
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    private init() {
        this.dropZone = document.getElementById('scan-drop-zone');
        this.fileInput = document.getElementById('scan-file-input') as HTMLInputElement;
        this.resultContainer = document.getElementById('scan-result');
        this.resultContent = document.getElementById('scan-result-content');
        this.uploadArea = this.dropZone?.querySelector('.scan-upload-content') as HTMLElement;

        if (!this.dropZone || !this.fileInput) {
            // Scan template not in DOM yet, will be initialized when type changes
            return;
        }

        this.bindEvents();
    }

    private bindEvents() {
        if (!this.dropZone || !this.fileInput) return;

        // Create new AbortController for this binding session
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Click to upload
        this.dropZone.addEventListener('click', () => {
            this.fileInput?.click();
        }, { signal });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files[0]) {
                this.processFile(files[0]);
            }
        }, { signal });

        // Drag & Drop
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
            if (files && files[0]) {
                this.processFile(files[0]);
            }
        }, { signal });

        // Paste from clipboard (global but cleaned up when deactivated)
        document.addEventListener('paste', (e) => {
            // Only handle paste when scan template is active
            const scanTemplate = document.getElementById('template-scan');
            if (!scanTemplate?.classList.contains('active')) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        this.processFile(file);
                        break;
                    }
                }
            }
        }, { signal });

        // Action buttons
        document.getElementById('scan-copy-btn')?.addEventListener('click', () => {
            this.copyResult();
        }, { signal });

        document.getElementById('scan-open-btn')?.addEventListener('click', () => {
            this.openResult();
        }, { signal });

        document.getElementById('scan-reset-btn')?.addEventListener('click', () => {
            this.reset();
        }, { signal });
    }

    private async processFile(file: File) {
        if (!file.type.startsWith('image/')) {
            this.showError('Please upload an image file');
            return;
        }

        // Show loading state
        this.showLoading();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const imageData = new Uint8Array(arrayBuffer);

            // Decode using WASM
            const decoded = decodeQRImage(imageData);
            this.lastDecodedContent = decoded;
            this.showResult(decoded);

        } catch (error: any) {
            console.error('QR Scan failed:', error);
            this.showError('Could not decode QR code. Make sure the image contains a valid QR code.');
        }
    }

    private showLoading() {
        if (this.uploadArea) {
            this.uploadArea.innerHTML = `
                <div class="scan-loading">
                    <span class="scan-spinner">🔍</span>
                    <span class="scan-text-primary">Analyzing image...</span>
                    <span class="scan-text-secondary">Looking for QR patterns</span>
                </div>
            `;
        }
    }

    private showResult(content: string) {
        if (this.resultContent) {
            this.resultContent.textContent = content;
        }

        // Hide upload area, show result
        if (this.dropZone) {
            this.dropZone.style.display = 'none';
        }
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }

        // Update icons in action buttons
        this.initActionIcons();

        // Check if content is a URL to enable open button
        const openBtn = document.getElementById('scan-open-btn');
        if (openBtn) {
            const isUrl = this.isUrl(content);
            openBtn.style.display = isUrl ? 'flex' : 'none';
        }
    }

    private showError(message: string) {
        if (this.uploadArea) {
            this.uploadArea.innerHTML = `
                <div class="scan-error">
                    <span class="scan-icon-error">⚠️</span>
                    <span class="scan-text-primary">${message}</span>
                    <span class="scan-text-secondary">Click or drop another image to try again</span>
                </div>
            `;
        }
    }

    private reset() {
        this.lastDecodedContent = '';

        // Reset file input
        if (this.fileInput) {
            this.fileInput.value = '';
        }

        // Show upload area, hide result
        if (this.dropZone) {
            this.dropZone.style.display = 'flex';
        }
        if (this.resultContainer) {
            this.resultContainer.style.display = 'none';
        }

        // Reset upload area content with improved UX
        if (this.uploadArea) {
            this.uploadArea.innerHTML = `
                <div class="scan-icon-container">
                    <span class="scan-icon">📸</span>
                </div>
                <span class="scan-text-primary">Scan a QR Code</span>
                <span class="scan-text-secondary">
                    Drop an image here, click to browse, or paste (Ctrl+V)
                </span>
                <span class="scan-formats">Supports: PNG, JPG, GIF, WebP</span>
            `;
        }
    }

    private copyResult() {
        if (!this.lastDecodedContent) return;

        navigator.clipboard.writeText(this.lastDecodedContent).then(() => {
            // Visual feedback
            const btn = document.getElementById('scan-copy-btn');
            if (btn) {
                const originalTitle = btn.title;
                btn.title = 'Copied!';
                setTimeout(() => {
                    btn.title = originalTitle;
                }, 1500);
            }
        });
    }

    private openResult() {
        if (!this.lastDecodedContent || !this.isUrl(this.lastDecodedContent)) return;

        let url = this.lastDecodedContent;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');
    }

    private isUrl(str: string): boolean {
        try {
            // Basic URL detection
            return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(str);
        } catch {
            return false;
        }
    }

    private initActionIcons() {
        // Initialize icons in action buttons
        const icons = [
            { id: 'scan-copy-btn', icon: 'content_copy' },
            { id: 'scan-open-btn', icon: 'open_in_new' },
            { id: 'scan-reset-btn', icon: 'refresh' },
        ];

        icons.forEach(({ id, icon }) => {
            const btn = document.getElementById(id);
            const iconEl = btn?.querySelector('.icon');
            if (iconEl) {
                const svg = getIconSvg(icon, 18);
                if (svg) iconEl.innerHTML = svg;
            }
        });
    }

    /**
     * Cleanup event listeners when scan template is deactivated
     */
    public deactivate() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            console.log('QRScanner: Deactivated, event listeners removed');
        }
    }

    /**
     * Reinitialize when scan template becomes active
     */
    public activate() {
        this.deactivate(); // Cleanup any existing listeners first
        this.init();
        this.reset();
    }
}

// Singleton
export const qrScanner = new QRScanner();

// Expose for type switcher
(window as any).qrScanner = qrScanner;

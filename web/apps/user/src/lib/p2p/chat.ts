/**
 * P2P Chat Protocol & Management
 * Handles text messages and chunked file streaming
 */

import * as fsdb from '../db/fs';
import { getActiveHandle } from '../workspace';
import { debugLog, debugWarn, redact } from '../debug';
import initWasmP2p, {
    decode_chat_text_payload_v1,
    decode_file_chunk_v1,
    decode_file_end_id_v1,
    decode_file_offer_v1,
    decode_frame_type_v1,
    encode_chat_text_v1,
    encode_file_chunk_v1,
    encode_file_end_v1,
    encode_file_offer_v1,
    decode_file_accept_id_v1,
    decode_file_reject_v1,
    encode_file_accept_v1,
    encode_file_reject_v1,
    decrypt_envelope_v1,
    encrypt_envelope_v1,
} from '@holi/wasm-p2p';

export type ChatMessage =
    | { type: 'text'; id: string; senderId: string; content: string; timestamp: number }
    | { type: 'file-start'; id: string; senderId: string; filename: string; mimeType: string; size: number; timestamp: number }
    | { type: 'file-chunk'; id: string; chunkIndex: number; data: ArrayBuffer }
    | { type: 'file-end'; id: string };

export type ChatEvent =
    | { type: 'message'; message: ChatMessage }
    | { type: 'file_progress'; fileId: string; progress: number }
    | { type: 'file_received'; fileId: string; filename: string; blob: Blob }
    | { type: 'encryption_error'; message: string }
    | { type: 'disconnected' };

export type IncomingFileOffer = {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
};

export type IncomingFileDecision =
    | 'accept'
    | 'reject'
    | { decision: 'reject'; reason: string };

export type ChatManagerOptions = {
    maxAutoAcceptBytes?: number;
    onIncomingFileOffer?: (offer: IncomingFileOffer) => Promise<IncomingFileDecision>;
    /**
     * Optional session key (32 bytes). If set, all protocol frames are sent as EncryptedEnvelope (0x50).
     * Key negotiation (PAKE/handshake) is intentionally out of scope here.
     */
    sessionKeyBytes?: Uint8Array;
};

type EventHandler = (event: ChatEvent) => void;

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

// Heartbeat frames (not part of wasm protocol; simple lightweight app-level control messages).
// These never surface to UI as chat messages.
const HEARTBEAT_PING = 0x01;
const HEARTBEAT_PONG = 0x02;

export class ChatManager {
    private channel: RTCDataChannel;
    private projectId: string;
    private options: Required<Pick<ChatManagerOptions, 'maxAutoAcceptBytes'>> &
        Pick<ChatManagerOptions, 'onIncomingFileOffer'>;
    private sessionKeyBytes: Uint8Array | null = null;
    private listeners: EventHandler[] = [];

    private reportedEncryptionIssue = false;

    private heartbeatTimer: number | null = null;
    private lastPongAt = 0;

    private wasmReady: Promise<void> | null = null;

    private pendingOutgoingFileAccept = new Map<
        string,
        { resolve: () => void; reject: (reason: unknown) => void }
    >();

    // File assembly buffers
    private incomingFiles = new Map<string, {
        metadata: { filename: string; mimeType: string; size: number };
        receivedBytes: number;
        chunks: ArrayBuffer[];
    }>();

    constructor(channel: RTCDataChannel, projectId: string, options?: ChatManagerOptions) {
        this.channel = channel;
        this.projectId = projectId;
        this.options = {
            maxAutoAcceptBytes: options?.maxAutoAcceptBytes ?? 50 * 1024 * 1024,
            onIncomingFileOffer: options?.onIncomingFileOffer,
        };

        if (options?.sessionKeyBytes) {
            if (options.sessionKeyBytes.length !== 32) {
                throw new Error('sessionKeyBytes must be 32 bytes');
            }
            // Copy into an owned buffer (avoid accidental mutation by caller).
            this.sessionKeyBytes = new Uint8Array(options.sessionKeyBytes);
        }
        this.setupChannel();
    }

    close() {
        this.stopHeartbeat();
        try {
            // Detach handlers to avoid late events firing into a disposed instance.
            this.channel.onmessage = null;
            this.channel.onclose = null;
        } catch {
            // ignore
        }
        try {
            this.channel.close();
        } catch {
            // ignore
        }
    }

    private async maybeEncrypt(frameBytes: Uint8Array): Promise<Uint8Array> {
        if (!this.sessionKeyBytes) return frameBytes;
        await this.ensureWasmReady();
        const wrapped = await encrypt_envelope_v1(this.sessionKeyBytes, frameBytes);
        return new Uint8Array(wrapped);
    }

    private async maybeDecrypt(frameBytes: Uint8Array): Promise<Uint8Array> {
        // If we don't have a session key, we can't decrypt envelopes.
        if (!this.sessionKeyBytes) return frameBytes;
        await this.ensureWasmReady();
        const frameType = await decode_frame_type_v1(frameBytes);
        // 0x50 = EncryptedEnvelope
        if (frameType !== 0x50) {
            // If encryption is enabled, ignore plaintext frames to avoid confusing mixed-mode sessions.
            this.reportEncryptionIssueOnce(
                'Encryption mismatch: expected encrypted frames, but received plaintext. Check that both sides set the same session password.'
            );
            throw new Error('ENCRYPTION_MISMATCH_PLAINTEXT');
        }

        try {
            const inner = await decrypt_envelope_v1(this.sessionKeyBytes, frameBytes);
            return new Uint8Array(inner);
        } catch (e) {
            this.reportEncryptionIssueOnce(
                'Failed to decrypt an incoming message. This usually means the session password does not match on both sides.'
            );
            throw e;
        }
    }

    private reportEncryptionIssueOnce(message: string) {
        if (this.reportedEncryptionIssue) return;
        this.reportedEncryptionIssue = true;
        this.emit({ type: 'encryption_error', message });
    }

    private async sendFrame(frameBytes: Uint8Array) {
        const bytes = await this.maybeEncrypt(frameBytes);
        this.channel.send(bytes as any);
    }

    private async sendHeartbeat(kind: number) {
        const payload = new Uint8Array(1 + 8);
        payload[0] = kind;
        const now = BigInt(Date.now());
        for (let i = 0; i < 8; i++) {
            payload[1 + i] = Number((now >> BigInt(8 * (7 - i))) & BigInt(0xff));
        }
        await this.sendFrame(payload);
    }

    startHeartbeat(opts?: { intervalMs?: number; timeoutMs?: number }) {
        const intervalMs = opts?.intervalMs ?? 5_000;
        const timeoutMs = opts?.timeoutMs ?? 20_000;

        this.stopHeartbeat();
        this.lastPongAt = Date.now();

        this.heartbeatTimer = window.setInterval(() => {
            // If the channel isn't open, a disconnect event should already happen.
            if (this.channel.readyState !== 'open') return;

            // Detect silent breakages.
            if (Date.now() - this.lastPongAt > timeoutMs) {
                try {
                    this.channel.close();
                } catch {
                    // ignore
                }
                this.emit({ type: 'disconnected' });
                return;
            }

            void this.sendHeartbeat(HEARTBEAT_PING).catch(() => {
                // If sending fails, close and let reconnect logic restart.
                try {
                    this.channel.close();
                } catch {
                    // ignore
                }
                this.emit({ type: 'disconnected' });
            });
        }, intervalMs);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer !== null) {
            window.clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private ensureWasmReady() {
        if (!this.wasmReady) {
            this.wasmReady = initWasmP2p();
        }
        return this.wasmReady;
    }

    private async handleHeartbeat(bytes: Uint8Array) {
        const type = bytes[0];
        if (type === HEARTBEAT_PING) {
            this.lastPongAt = Date.now();
            await this.sendHeartbeat(HEARTBEAT_PONG);
        } else if (type === HEARTBEAT_PONG) {
            this.lastPongAt = Date.now();
        }
    }

    private setupChannel() {
        this.channel.binaryType = 'arraybuffer';
        this.channel.onmessage = async (event) => {
            let bytes: Uint8Array;
            if (event.data instanceof ArrayBuffer) {
                bytes = new Uint8Array(event.data);
            } else if (event.data instanceof Blob) {
                bytes = new Uint8Array(await event.data.arrayBuffer());
            } else {
                console.warn('[Chat] Unknown message data type:', typeof event.data);
                return;
            }

            try {
                // Heartbeat check (Plaintext)
                // If we are unencrypted, heartbeats are raw bytes [0x01/0x02, ...timestamp]
                if (!this.sessionKeyBytes && bytes.length === 9 && (bytes[0] === 0x01 || bytes[0] === 0x02)) {
                    this.handleHeartbeat(bytes);
                    return;
                }

                await this.ensureWasmReady();

                // If we are not configured for encryption but peer sends encrypted envelopes, tell the UI clearly.
                if (!this.sessionKeyBytes) {
                    // Safety check: verify magic header manually to avoid "BadMagic" throwing obscurely
                    if (bytes.length < 2 || bytes[0] !== 72 || bytes[1] !== 79) { // 'H', 'O'
                        // Ignore garbage or unknown protocols
                        return;
                    }
                    const t = await decode_frame_type_v1(bytes);
                    if (t === 0x50) {
                        this.reportEncryptionIssueOnce(
                            'Received encrypted data but no session password is set. Enable Encryption and ensure both sides use the same password.'
                        );
                        return;
                    }
                }

                const decodedBytes = await this.maybeDecrypt(bytes);
                const frameType = await decode_frame_type_v1(decodedBytes);


                // 0x10 = ChatText (Binary Wire Format v1)
                if (frameType === 0x10) {
                    const content = await decode_chat_text_payload_v1(decodedBytes);
                    const msg: ChatMessage = {
                        type: 'text',
                        id: crypto.randomUUID(),
                        senderId: 'peer',
                        content,
                        timestamp: Date.now(),
                    };
                    await this.handleIncoming(msg);
                    return;
                }

                // 0x20 = FileOffer
                if (frameType === 0x20) {
                    const offer = (await decode_file_offer_v1(decodedBytes)) as any;

                    const incomingOffer: IncomingFileOffer = {
                        id: String(offer.id),
                        filename: String(offer.filename),
                        mimeType: String(offer.mimeType),
                        size: Number(offer.size),
                    };

                    let decision: IncomingFileDecision;
                    if (this.options.onIncomingFileOffer) {
                        decision = await this.options.onIncomingFileOffer(incomingOffer);
                    } else {
                        decision =
                            incomingOffer.size <= this.options.maxAutoAcceptBytes
                                ? 'accept'
                                : { decision: 'reject', reason: 'File too large' };
                    }

                    const rejectReason =
                        decision === 'reject'
                            ? 'rejected'
                            : typeof decision === 'object' && decision.decision === 'reject'
                                ? decision.reason
                                : null;

                    if (rejectReason) {
                        const rejectBytes = encode_file_reject_v1(incomingOffer.id, rejectReason);
                        await this.sendFrame(new Uint8Array(rejectBytes));
                        this.emit({
                            type: 'message',
                            message: {
                                type: 'text',
                                id: crypto.randomUUID(),
                                senderId: 'system',
                                content: `Rejected ${incomingOffer.filename}: ${rejectReason}`,
                                timestamp: Date.now(),
                            },
                        });
                        return;
                    }

                    const acceptBytes = encode_file_accept_v1(incomingOffer.id);
                    await this.sendFrame(new Uint8Array(acceptBytes));

                    const msg: ChatMessage = {
                        type: 'file-start',
                        id: incomingOffer.id,
                        senderId: 'peer',
                        filename: incomingOffer.filename,
                        mimeType: incomingOffer.mimeType,
                        size: incomingOffer.size,
                        timestamp: Date.now(),
                    };
                    await this.handleIncoming(msg);
                    return;
                }

                // 0x21 = FileAccept
                if (frameType === 0x21) {
                    const id = await decode_file_accept_id_v1(decodedBytes);
                    const pending = this.pendingOutgoingFileAccept.get(id);
                    if (pending) {
                        pending.resolve();
                        this.pendingOutgoingFileAccept.delete(id);
                    }
                    return;
                }

                // 0x22 = FileReject
                if (frameType === 0x22) {
                    const rej = (await decode_file_reject_v1(decodedBytes)) as any;
                    const id = String(rej.id);
                    const pending = this.pendingOutgoingFileAccept.get(id);
                    if (pending) {
                        pending.reject(new Error(String(rej.reason || 'rejected')));
                        this.pendingOutgoingFileAccept.delete(id);
                    }
                    return;
                }

                // 0x23 = FileChunk
                if (frameType === 0x23) {
                    const chunk = (await decode_file_chunk_v1(decodedBytes)) as any;
                    const data = chunk.data as Uint8Array;
                    const chunkBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

                    const msg: ChatMessage = {
                        type: 'file-chunk',
                        id: String(chunk.id),
                        chunkIndex: Number(chunk.chunkIndex),
                        data: chunkBuf,
                    };
                    await this.handleIncoming(msg);
                    return;
                }

                // 0x24 = FileEnd
                if (frameType === 0x24) {
                    const id = await decode_file_end_id_v1(decodedBytes);
                    const msg: ChatMessage = { type: 'file-end', id };
                    await this.handleIncoming(msg);
                    return;
                }

                console.warn('[Chat] Unhandled binary frame type:', frameType);
            } catch (e) {
                // Avoid spamming errors during encryption mismatch; the UI already gets a clear message.
                if (!this.reportedEncryptionIssue) {
                    console.error('[Chat] Failed to decode binary frame:', e);
                }
            }
        };

        // Handle disconnect
        this.channel.onclose = () => {
            debugLog('[Chat] Data channel closed');
            this.stopHeartbeat();
            this.emit({ type: 'disconnected' });
        };
    }

    get isConnected(): boolean {
        return this.channel.readyState === 'open';
    }

    private async handleIncoming(msg: ChatMessage) {
        switch (msg.type) {
            case 'text':
                this.emit({ type: 'message', message: msg });
                break;

            case 'file-start':
                debugLog('[Chat] Receiving file', { size: msg.size });
                this.incomingFiles.set(msg.id, {
                    metadata: { filename: msg.filename, mimeType: msg.mimeType, size: msg.size },
                    receivedBytes: 0,
                    chunks: []
                });
                // Notify UI a file is starting
                this.emit({ type: 'message', message: { ...msg, type: 'file-start', content: `Receiving ${msg.filename}...` } as any });
                break;

            case 'file-chunk': {
                const fileCtx = this.incomingFiles.get(msg.id);
                if (!fileCtx) {
                    debugWarn('[Chat] Chunk for unknown file', { fileId: redact(msg.id) });
                    return;
                }

                fileCtx.chunks.push(msg.data);
                fileCtx.receivedBytes += msg.data.byteLength;

                const progress = fileCtx.receivedBytes / fileCtx.metadata.size;
                if (msg.chunkIndex % 25 === 0) {
                    debugLog('[Chat] Receiving progress', { pct: Math.round(progress * 100) });
                }
                this.emit({ type: 'file_progress', fileId: msg.id, progress });
                break;
            }

            case 'file-end': {
                debugLog('[Chat] File transfer complete', { fileId: redact(msg.id) });
                const completedFile = this.incomingFiles.get(msg.id);
                if (completedFile) {
                    // Reassemble Blob
                    const blob = new Blob(completedFile.chunks, { type: completedFile.metadata.mimeType });
                    debugLog('[Chat] Reassembled blob', { bytes: blob.size });

                    // Save to Local Folder
                    try {
                        if (getActiveHandle()) {
                            await fsdb.saveProjectFile(this.projectId, blob, `chat/${completedFile.metadata.filename}`);
                            debugLog('[Chat] File saved to local folder');
                        } else {
                            console.warn(`[Chat] No active workspace - file NOT saved to disk!`);
                        }
                    } catch (e) {
                        console.error(`[Chat] Failed to save file:`, e);
                    }

                    this.emit({
                        type: 'file_received',
                        fileId: msg.id,
                        filename: completedFile.metadata.filename,
                        blob
                    });

                    this.incomingFiles.delete(msg.id);
                } else {
                    debugWarn('[Chat] file-end with no context', { fileId: redact(msg.id) });
                }
                break;
            }
        }
    }

    // === Sending ===

    sendText(content: string) {
        if (!this.isConnected) {
            console.warn('[Chat] Cannot send - channel is not open!');
            throw new Error('Connection lost. Please reconnect.');
        }

        const msg: ChatMessage = {
            type: 'text',
            id: crypto.randomUUID(),
            senderId: 'me',
            content,
            timestamp: Date.now()
        };

        // Binary fast-path for chat text.
        // Note: this is intentionally minimal for MVP1; richer metadata moves into the protocol layer.
        void this.ensureWasmReady().then(() => {
            const frameBytes = encode_chat_text_v1(content);
            void this.sendFrame(new Uint8Array(frameBytes));
        });

        return msg;
    }

    private async waitForBufferedAmountBelow(targetBytes: number) {
        if (this.channel.bufferedAmount <= targetBytes) return;

        // Event-based backpressure: avoid busy-waiting.
        this.channel.bufferedAmountLowThreshold = targetBytes;
        await new Promise<void>((resolve) => {
            const handler = () => resolve();
            // RTCDataChannel is an EventTarget in browsers; TS types are inconsistent.
            (this.channel as any).addEventListener('bufferedamountlow', handler, { once: true });
        });
    }

    async sendFile(file: File) {
        if (!this.isConnected) {
            console.warn('[Chat] Cannot send file - channel is not open!');
            throw new Error('Connection lost. Please reconnect.');
        }

        const id = crypto.randomUUID();

        await this.ensureWasmReady();

        // 1. Send Offer (binary)
        // WASM expects u64 for file size, so we must pass a BigInt.
        const offerBytes = encode_file_offer_v1(id, file.name, file.type || 'application/octet-stream', BigInt(file.size));
        await this.sendFrame(new Uint8Array(offerBytes));

        const accepted = new Promise<void>((resolve, reject) => {
            this.pendingOutgoingFileAccept.set(id, { resolve, reject });
        });

        // Wait for receiver to accept/reject before streaming chunks.
        const ACCEPT_TIMEOUT_MS = 10_000;
        await Promise.race([
            accepted,
            new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('File offer timed out')), ACCEPT_TIMEOUT_MS)
            ),
        ]).finally(() => {
            this.pendingOutgoingFileAccept.delete(id);
        });

        const startMsg: ChatMessage = {
            type: 'file-start',
            id,
            senderId: 'me',
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            timestamp: Date.now()
        };

        // 2. Stream Chunks
        const buffer = await file.arrayBuffer();
        let offset = 0;
        let chunkIndex = 0;

        while (offset < buffer.byteLength) {
            const chunk = buffer.slice(offset, offset + CHUNK_SIZE);

            await this.waitForBufferedAmountBelow(256 * 1024);

            const chunkBytes = encode_file_chunk_v1(id, chunkIndex++, new Uint8Array(chunk));
            await this.sendFrame(new Uint8Array(chunkBytes));

            if (chunkIndex % 25 === 0) debugLog('[Chat] Sent chunks', { sent: chunkIndex });

            offset += CHUNK_SIZE;

            // Yield to main thread
            await new Promise(r => setTimeout(r, 0));
        }

        // 3. Send End (binary)
        await this.waitForBufferedAmountBelow(256 * 1024);
        const endBytes = encode_file_end_v1(id);
        await this.sendFrame(new Uint8Array(endBytes));
        debugLog('[Chat] Finished sending file', { chunks: chunkIndex });

        return startMsg;
    }

    // === Listeners ===
    on(handler: EventHandler) {
        this.listeners.push(handler);
        return () => this.listeners = this.listeners.filter(h => h !== handler);
    }

    private emit(event: ChatEvent) {
        this.listeners.forEach(h => h(event));
    }

}

/**
 * DmManager - Manages the lifecycle of a DM connection with a friend.
 * Handles connection, reconnection, and chat events.
 */

import { connectFriendDmChannel, type FriendDmConfig } from './p2p';
import { ChatManager, type ChatEvent } from '../p2p/chat';
import { dmKeyBytes } from './dm';
import { debugLog, debugWarn, redact } from '../debug';

export type DmState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type DmEvent =
    | { type: 'status_change'; state: DmState; message?: string }
    | { type: 'chat_event'; event: ChatEvent };

type DmEventHandler = (event: DmEvent) => void;

export class DmManager {
    private dm: FriendDmConfig;
    private isInitiator: boolean;
    private listeners: DmEventHandler[] = [];

    public chatManager: ChatManager | null = null;
    public state: DmState = 'idle';

    // Reconnection
    private reconnectTimer: number | null = null;
    private reconnectAttempt = 0;
    private reconnectToken = 0;
    private maxReconnectAttempts = 10;

    // Chat cleanup
    private chatUnsub: (() => void) | null = null;

    constructor(opts: {
        dm: FriendDmConfig;
        isInitiator: boolean;
    }) {
        this.dm = opts.dm;
        this.isInitiator = opts.isInitiator;
    }

    public on(handler: DmEventHandler): () => void {
        this.listeners.push(handler);
        return () => {
            this.listeners = this.listeners.filter(h => h !== handler);
        };
    }

    private emit(event: DmEvent) {
        if (event.type === 'status_change') {
            this.state = event.state;
        }
        this.listeners.forEach(h => h(event));
    }

    public destroy() {
        this.clearReconnectTimer();
        this.teardownChat();
    }

    private teardownChat() {
        debugLog('[DmManager] Tearing down chat...');
        if (this.chatUnsub) {
            try { this.chatUnsub(); } catch { }
            this.chatUnsub = null;
        }
        if (this.chatManager) {
            try { this.chatManager.close(); } catch { }
            this.chatManager = null;
        }
    }

    // === Public Actions ===

    public sendText(text: string) {
        if (!this.chatManager) {
            debugWarn('[DmManager] Cannot send - not connected');
            return;
        }
        this.chatManager.sendText(text);
    }

    /**
     * Start the connection flow. Will auto-retry on failure.
     */
    public async start() {
        debugLog('[DmManager] start() called. isInitiator:', this.isInitiator);
        this.reconnectAttempt = 0;
        await this.connect();
    }

    public retry() {
        debugLog('[DmManager] Manual retry requested');
        this.reconnectAttempt = 0;
        this.scheduleReconnect('Manual retry...', { immediate: true });
    }

    // === Connection Logic ===

    private connectAbortController: AbortController | null = null;

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private async connect() {
        // Abort previous attempt if any
        if (this.connectAbortController) {
            this.connectAbortController.abort();
        }
        this.connectAbortController = new AbortController();
        const signal = this.connectAbortController.signal;

        this.emit({ type: 'status_change', state: 'connecting', message: 'Connecting to friend...' });

        const token = ++this.reconnectToken;

        try {
            debugLog('[DmManager] Attempting connection...');
            const channel = await connectFriendDmChannel({
                dm: this.dm,
                isInitiator: this.isInitiator,
                timeoutMs: 90_000,
                abortSignal: signal,
            });

            if (token !== this.reconnectToken || signal.aborted) {
                debugLog('[DmManager] Stale/Aborted connection attempt, discarding');
                channel.close();
                return;
            }

            debugLog('[DmManager] Connected! Channel:', redact(channel.label));
            await this.initChat(channel);
        } catch (e) {
            if (token !== this.reconnectToken || signal.aborted) return;
            // ... error handling remains same
            const msg = (e as Error).message || String(e);
            debugWarn('[DmManager] Connection failed:', msg);

            if (this.reconnectAttempt < this.maxReconnectAttempts) {
                this.scheduleReconnect(`Connection failed: ${msg}`);
            } else {
                this.emit({ type: 'status_change', state: 'error', message: `Failed after ${this.maxReconnectAttempts} attempts` });
            }
        } finally {
            this.connectAbortController = null;
        }
    }

    private scheduleReconnect(reason: string, opts?: { immediate?: boolean }) {
        this.clearReconnectTimer();

        this.reconnectAttempt++;
        const state: DmState = this.reconnectAttempt > 1 ? 'reconnecting' : 'connecting';
        this.emit({ type: 'status_change', state, message: reason });

        debugLog('[DmManager] Scheduling reconnect attempt', this.reconnectAttempt);

        const base = Math.min(30_000, 2_000 * Math.pow(1.5, this.reconnectAttempt));
        const jitter = Math.floor(Math.random() * 1000);
        const delay = opts?.immediate ? 0 : (base + jitter);

        this.reconnectTimer = window.setTimeout(() => {
            void this.connect();
        }, delay);
    }

    // === Chat Init ===

    private async initChat(channel: RTCDataChannel) {
        this.teardownChat();
        debugLog('[DmManager] Initializing Chat on channel:', redact(channel.label));

        const sessionKeyBytes = dmKeyBytes(this.dm.keyB64Url);

        this.chatManager = new ChatManager(channel, `dm:${this.dm.sessionId}`, {
            sessionKeyBytes,
        });

        // Heartbeat for connection monitoring
        try {
            this.chatManager.startHeartbeat({ intervalMs: 5_000, timeoutMs: 20_000 });
        } catch { }

        this.chatUnsub = this.chatManager.on((e) => {
            if (e.type === 'disconnected') {
                this.handleDisconnect();
            }
            this.emit({ type: 'chat_event', event: e });
        });

        this.emit({ type: 'status_change', state: 'connected', message: 'Connected!' });
        this.reconnectAttempt = 0;
    }

    private handleDisconnect() {
        debugLog('[DmManager] handleDisconnect() called');
        this.teardownChat();

        if (this.reconnectAttempt < this.maxReconnectAttempts) {
            this.scheduleReconnect('Disconnected. Reconnecting...', { immediate: true });
        } else {
            this.emit({ type: 'status_change', state: 'error', message: 'Connection lost' });
        }
    }
}

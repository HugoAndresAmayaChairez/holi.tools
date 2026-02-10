import { joinTrysteroRoom } from "../p2p/trystero-client";
import type { FriendDmConfig } from "./p2p"; // Reuse existing config type
import { debugLog, debugWarn, redact } from "../debug";

export type DmState = 'idle' | 'connecting' | 'connected' | 'error';

export type DmEvent =
    | { type: 'status_change'; state: DmState; message?: string }
    | { type: 'message'; message: any } // Trystero message
    | { type: 'file_progress'; fileId: string; progress: number; fileName: string }
    | { type: 'file_received'; fileId: string; fileName: string; blob: Blob };

type DmEventHandler = (event: DmEvent) => void;
type ActionSender = (...args: unknown[]) => unknown;

function bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: string | Uint8Array): Promise<string> {
    const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    const hash = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(new Uint8Array(hash));
}

export class TrysteroDmManager {
    private dm: FriendDmConfig;
    private room: any = null; // Trystero Room
    private listeners: DmEventHandler[] = [];

    // Action wrappers (Typed Send functions)
    private sendChatAction: ActionSender | null = null;
    private sendFileAction: ActionSender | null = null;

    public state: DmState = 'idle';

    constructor(dm: FriendDmConfig) {
        this.dm = dm;
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

    public async start() {
        this.emit({ type: 'status_change', state: 'connecting', message: 'Connecting to Trystero...' });

        try {
            // Shared secret comes from ECDH (dm.keyB64Url)
            const sharedSecret = this.dm.keyB64Url; // Base64URL string of 32 bytes

            // Room ID (Topic) = SHA256(Secret + "topic")
            const roomId = await sha256(sharedSecret + "-topic");

            // Connect
            debugLog('[TrysteroDM] Joining room');

            this.room = joinTrysteroRoom(
                { appId: 'holi-dm' }, // Namespace
                roomId
            );

            // Setup Actions
            const [sendChat, getChat] = this.room.makeAction('chat');
            const [sendFile, getFile, onFileProgress] = this.room.makeAction('file');

            this.sendChatAction = sendChat;
            this.sendFileAction = sendFile;

            // Listeners
            getChat((data: any, peerId: string) => {
                // Important: The peer sent "senderId: me" (relative to them).
                // We must overwrite it with their PeerID so the UI knows it's not a local echo.
                this.emit({ type: 'message', message: { ...data, senderId: peerId } });
            });

            getFile((blob: Blob, peerId: string, metadata: any) => {
                const fileId = Math.random().toString(36).slice(2);
                this.emit({
                    type: 'file_received',
                    fileId,
                    fileName: metadata?.name || 'downloaded_file',
                    blob
                });
            });

            onFileProgress((progress: number, peerId: string, metadata: any) => {
                // progress is 0-1
                const fileId = 'current'; // Trystero handles one stream per action channel usually?
                this.emit({
                    type: 'file_progress',
                    fileId,
                    progress,
                    fileName: metadata?.name || 'unknown'
                });
            });

            this.room.onPeerJoin((peerId: string) => {
                debugLog('[TrysteroDM] Peer joined:', redact(peerId));
                this.emit({ type: 'status_change', state: 'connected', message: 'Friend connected' });
            });

            this.room.onPeerLeave((peerId: string) => {
                debugLog('[TrysteroDM] Peer left:', redact(peerId));
                // In 1-on-1, if peer leaves, we go back to connecting
                this.emit({ type: 'status_change', state: 'connecting', message: 'Friend disconnected' });
            });

        } catch (e) {
            debugWarn('[TrysteroDM] Error:', e);
            this.emit({ type: 'status_change', state: 'error', message: String(e) });
        }
    }

    public sendText(text: string) {
        if (this.sendChatAction) {
            const msg = {
                type: 'text',
                id: Math.random().toString(36).slice(2),
                senderId: 'me',
                content: text,
                timestamp: Date.now()
            };
            this.sendChatAction(msg);
            // Echo locally
            this.emit({ type: 'message', message: msg });
        }
    }

    public sendFile(file: File) {
        if (this.sendFileAction) {
            // Trystero sends metadata automatically? 
            // makeAction('file') handles Blobs. Metadata is usually passed as 3rd arg or separate?
            // Trystero signature: send(data, targetPeer?, metadata?)
            this.sendFileAction(file, null, { name: file.name, type: file.type, size: file.size });

            // Create local dummy message for UI
            const msg = {
                type: 'file-start',
                id: Math.random().toString(36).slice(2),
                senderId: 'me',
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                timestamp: Date.now()
            };
            this.emit({ type: 'message', message: msg });
        }
    }

    public destroy() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
}

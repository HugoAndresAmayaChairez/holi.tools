import { joinTrysteroRoom } from "./trystero-client";
import { debugLog, redact } from "../debug";

type ActionSender = (...args: unknown[]) => unknown;

export interface VaultEvents {
    onMessage?: (msg: any) => void;
    onFileReceived?: (fileId: string, meta: any, blob: Blob) => void;
    onFileProgress?: (progress: number, meta: any) => void;
    onPeerJoin?: (peerId: string) => void;
    onPeerLeave?: (peerId: string) => void;
    onSync?: (data: Uint8Array, peerId: string) => void;
    onMetadata?: (meta: { name: string, description?: string }) => void;
    onMetadataRequest?: (peerId: string) => void;
    onIdentity?: (identity: { alias: string, avatar: string | null }, peerId: string) => void;
    onStateChange?: (state: 'connecting' | 'connected' | 'disconnected') => void;

    onManifest?: (manifest: any, peerId: string) => void;
    onFileRequest?: (paths: string[], peerId: string) => void;
}

async function sha256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export class TrysteroVaultManager {
    private room: any;
    private listeners: VaultEvents = {};
    private projectId: string;
    private secretKey: string | null = null;

    // Actions
    private sendChatAction: ActionSender | null = null;
    private sendFileAction: ActionSender | null = null;
    private sendMetadataAction: ActionSender | null = null;
    private requestMetadataAction: ActionSender | null = null;
    private sendIdentityAction: ActionSender | null = null;
    private sendSyncAction: ActionSender | null = null;

    private sendManifestAction: ActionSender | null = null;
    private requestFilesAction: ActionSender | null = null;

    private peers: Set<string> = new Set();

    constructor(projectId: string) {
        this.projectId = projectId;
    }

    public setListeners(listeners: VaultEvents) {
        this.listeners = listeners;
    }

    public getPeerCount(): number {
        return this.peers.size;
    }

    public async join(secretKey: string) {
        if (this.room) return;
        this.secretKey = secretKey;
        this.listeners.onStateChange?.('connecting');

        const derivedRoomId = await sha256(`vault-${this.projectId}-${secretKey}`);
        debugLog('[Vault] Joining room');

        this.room = joinTrysteroRoom({ appId: 'holi-vault' }, derivedRoomId);

        // Immediately set connected as we are "online" in the room
        this.listeners.onStateChange?.('connected');

        // === Actions ===
        const [sendChat, getChat] = this.room.makeAction('chat');
        const [sendFile, getFile, onFileProgress] = this.room.makeAction('file');
        const [sendMeta, getMeta] = this.room.makeAction('metadata');
        const [reqMeta, getReqMeta] = this.room.makeAction('req-meta');
        const [sendIdentity, getIdentity] = this.room.makeAction('identity');
        const [sendSync, getSync] = this.room.makeAction('sync');
        const [sendManifest, getManifest] = this.room.makeAction('manifest');
        const [reqFiles, getReqFiles] = this.room.makeAction('req-files');

        this.sendChatAction = sendChat;
        this.sendFileAction = sendFile;
        this.sendMetadataAction = sendMeta;
        this.requestMetadataAction = reqMeta;
        this.sendIdentityAction = sendIdentity;
        this.sendSyncAction = sendSync;
        this.sendManifestAction = sendManifest;
        this.requestFilesAction = reqFiles;

        // === Event Wiring ===
        this.room.onPeerJoin((peerId: string) => {
            debugLog('[Vault] Peer Joined:', redact(peerId));
            this.peers.add(peerId);
            this.listeners.onPeerJoin?.(peerId);
        });

        this.room.onPeerLeave((peerId: string) => {
            debugLog('[Vault] Peer Left:', redact(peerId));
            this.peers.delete(peerId);
            this.listeners.onPeerLeave?.(peerId);
        });

        getChat((data: any, peerId: string) => {
            this.listeners.onMessage?.({ ...data, senderId: peerId });
        });

        getSync((data: Uint8Array, peerId: string) => {
            this.listeners.onSync?.(data, peerId);
        });

        getFile((a: any, b: any, c: any) => {
            // Trystero action callback signatures vary a bit by strategy.
            // Normalize by detecting the blob-like payload, peerId, and metadata.
            const args = [a, b, c];

            const meta = args.find(
                (x) => x && typeof x === 'object' && !(x instanceof Blob) && 'name' in x && 'size' in x
            ) as any | undefined;

            let blob: Blob | null = null;
            const blobArg = args.find((x) => x instanceof Blob) as Blob | undefined;
            if (blobArg) {
                blob = blobArg;
            } else {
                const ab = args.find((x) => x instanceof ArrayBuffer) as ArrayBuffer | undefined;
                const u8 = args.find((x) => x instanceof Uint8Array) as Uint8Array | undefined;
                if (ab) blob = new Blob([ab]);
                else if (u8) blob = new Blob([u8]);
            }

            if (!blob) {
                debugLog('[Vault] Received file payload in unknown format');
                return;
            }

            const fileId = Math.random().toString(36).slice(2);
            const safeMeta = meta || { name: 'file', size: blob.size, type: blob.type };
            this.listeners.onFileReceived?.(fileId, safeMeta, blob);
        });

        onFileProgress((progress: number, _peerId: string, meta: any) => {
            this.listeners.onFileProgress?.(progress, meta);
        });

        getMeta((data: any, _peerId: string) => {
            this.listeners.onMetadata?.(data);
        });

        getReqMeta((data: any, peerId: string) => {
            this.listeners.onMetadataRequest?.(peerId);
        });

        getIdentity((data: any, peerId: string) => {
            this.listeners.onIdentity?.(data, peerId);
        });

        getManifest((data: any, peerId: string) => {
            this.listeners.onManifest?.(data, peerId);
        });

        getReqFiles((data: any, peerId: string) => {
            const paths = (data && typeof data === 'object' && Array.isArray((data as any).paths))
                ? ((data as any).paths as any[]).filter((p) => typeof p === 'string')
                : [];
            this.listeners.onFileRequest?.(paths as string[], peerId);
        });
    }

    public sendText(text: string) {
        if (!this.sendChatAction) return;
        const msg = {
            id: crypto.randomUUID(),
            type: 'text',
            content: text,
            senderId: 'me',
            timestamp: Date.now()
        };
        this.sendChatAction(msg);
        this.listeners.onMessage?.(msg);
    }

    public sendFile(file: File, metaNameOverride?: string, targetPeerId?: string) {
        if (!this.sendFileAction) return;
        const metaName = (typeof metaNameOverride === 'string' && metaNameOverride.trim())
            ? metaNameOverride.trim()
            : file.name;

        this.sendFileAction(file, targetPeerId ?? null, { name: metaName, type: file.type, size: file.size });
        // Emit a normal text message locally so the UI doesn't have to handle a special schema.
        this.listeners.onMessage?.({
            id: crypto.randomUUID(),
            type: 'text',
            content: `Sending ${metaName}...`,
            senderId: 'me',
            timestamp: Date.now(),
        });
    }

    public sendManifest(manifest: any, targetPeerId?: string) {
        if (!this.sendManifestAction) return;
        this.sendManifestAction(manifest, targetPeerId ?? null);
    }

    public requestFiles(paths: string[], targetPeerId?: string) {
        if (!this.requestFilesAction) return;
        this.requestFilesAction({ paths }, targetPeerId ?? null);
    }

    public sendMetadata(name: string, description?: string) {
        if (!this.sendMetadataAction) return;
        this.sendMetadataAction({ name, description });
    }

    public requestMetadata() {
        if (!this.requestMetadataAction) return;
        this.requestMetadataAction({});
    }

    public sendIdentity(alias: string, avatar: string | null) {
        if (!this.sendIdentityAction) return;
        this.sendIdentityAction({ alias, avatar });
    }

    public sendSync(data: Uint8Array) {
        if (!this.sendSyncAction) return;
        this.sendSyncAction(data);
    }

    public leave() {
        if (this.room) {
            this.room.leave();
            this.room = null;
            this.listeners.onStateChange?.('disconnected');
        }
    }
}

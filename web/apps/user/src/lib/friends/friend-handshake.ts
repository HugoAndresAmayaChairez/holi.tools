/**
 * Friend Handshake via Trystero WebRTC Rooms
 * 
 * Replaces unreliable Nostr signaling with direct P2P exchange.
 */
import { joinTrysteroRoom } from '../p2p/trystero-client';
import type { FriendDmConfig } from './dm';
import { bytesToBase64Url } from '../utils/base64';
import { debugLog, redact } from '../debug';

const FRIEND_ROOM_PREFIX = 'holi-fr-';
const APP_ID = 'holi-friend-handshake-v1';

export type ContactInfo = {
    pubkey: string;
    name: string;
    /** Shared DM config. Host provides it; joiner receives it. */
    dm?: FriendDmConfig;
};

type FriendRoom = {
    leave: () => void;
};

type FriendHello = {
    pubkey: string;
    name: string;
};

type FriendDecision =
    | { accepted: true; host: FriendHello; dm: FriendDmConfig }
    | { accepted: false; host: FriendHello; reason?: string };

function normalizePubkey(pk: unknown): string {
    if (typeof pk !== 'string') return '';
    return pk.trim().toLowerCase();
}

function isValidPubkey(pk: string): boolean {
    return /^[0-9a-f]{64}$/.test(pk);
}

function normalizeName(name: unknown): string {
    if (typeof name !== 'string') return '';
    return name.trim().slice(0, 64);
}

/**
 * Generate a unique friend code (Trystero room ID).
 */
export function generateFriendCode(): string {
    // IMPORTANT: this code is effectively a short-lived capability.
    // Use high entropy to avoid brute-force discovery.
    const idBytes = new Uint8Array(16);
    crypto.getRandomValues(idBytes);
    const id = bytesToBase64Url(idBytes);
    return `${FRIEND_ROOM_PREFIX}${id}`;
}

/**
 * Check if a string looks like a Friend Code (room ID).
 */
export function isFriendCode(code: string): boolean {
    return code.startsWith(FRIEND_ROOM_PREFIX);
}

/**
 * Host a friend handshake room.
 * Waits for a peer to join, exchanges contact info, then calls onPeerJoined.
 */
export function hostFriendRoom(
    roomId: string,
    myInfo: ContactInfo,
    onPeerRequest: (peerInfo: ContactInfo) => Promise<boolean> | boolean,
    onError?: (err: Error) => void
): FriendRoom {
    debugLog('[FriendHandshake] Hosting room');

    if (!myInfo.dm?.sessionId || !myInfo.dm?.keyB64Url) {
        const err = new Error('Host must provide a DM config (myInfo.dm)');
        onError?.(err);
        throw err;
    }

    const room = joinTrysteroRoom({ appId: APP_ID }, roomId);

    const hostHello: FriendHello = {
        pubkey: normalizePubkey(myInfo.pubkey),
        name: normalizeName(myInfo.name) || 'Friend',
    };

    // Action 1: hello (identity exchange, no secrets)
    const [sendHello, onHello] = room.makeAction<FriendHello>('hello');

    // Action 2: decision (host acceptance + dm config)
    const [sendDecision] = room.makeAction<FriendDecision>('decision');

    // When a peer joins, send our info
    room.onPeerJoin((peerId) => {
        debugLog('[FriendHandshake] Peer joined:', redact(peerId));
        // Send non-secret identity to that peer only (avoid broadcasting contact data)
        sendHello(hostHello, peerId);
    });

    room.onPeerLeave((peerId) => {
        debugLog('[FriendHandshake] Peer left:', redact(peerId));
    });

    const handledPeerIds = new Set<string>();

    // When we receive peer's hello, ask the host UI to accept/reject explicitly.
    onHello(async (data, peerId) => {
        if (handledPeerIds.has(peerId)) return;

        const peerPubkey = normalizePubkey((data as any)?.pubkey);
        const peerName = normalizeName((data as any)?.name);

        debugLog('[FriendHandshake] Received peer hello', {
            peerId: redact(peerId),
            pubkeyPrefix: peerPubkey ? peerPubkey.slice(0, 8) : 'unknown',
            hasName: Boolean(peerName),
        });

        // Ignore invalid pubkeys and self-echoes (defensive).
        if (!isValidPubkey(peerPubkey) || peerPubkey === hostHello.pubkey) return;

        try {
            handledPeerIds.add(peerId);

            const accepted = await onPeerRequest({
                pubkey: peerPubkey,
                name: peerName || peerPubkey.slice(0, 8),
            });

            if (!accepted) {
                await sendDecision({ accepted: false, host: hostHello, reason: 'rejected' }, peerId);
                return;
            }

            // Host DM config is authoritative (prevents split-brain rooms).
            await sendDecision({ accepted: true, host: hostHello, dm: myInfo.dm }, peerId);

            // This Friend Code is intended to be single-use; stop hosting after an accept.
            room.leave();
        } catch (err) {
            onError?.(err as Error);
        }
    });

    return {
        leave: () => {
            debugLog('[FriendHandshake] Leaving room');
            room.leave();
        }
    };
}

/**
 * Join a friend's handshake room.
 * Returns a Promise that resolves with the host's ContactInfo.
 */
export function joinFriendRoom(
    roomId: string,
    myInfo: ContactInfo,
    timeoutMs: number = 30000
): Promise<ContactInfo> {
    debugLog('[FriendHandshake] Joining room');

    return new Promise((resolve, reject) => {
        const room = joinTrysteroRoom({ appId: APP_ID }, roomId);
        let resolved = false;

        const timer = window.setTimeout(() => {
            if (!resolved) {
                resolved = true;
                room.leave();
                reject(new Error('Friend handshake timed out. Make sure they have the code copied and are waiting.'));
            }
        }, timeoutMs);

        const joinerHello: FriendHello = {
            pubkey: normalizePubkey(myInfo.pubkey),
            name: normalizeName(myInfo.name) || 'Friend',
        };

        // hello: identity exchange
        const [sendHello, onHello] = room.makeAction<FriendHello>('hello');

        // decision: accept/reject + dm config
        const [, onDecision] = room.makeAction<FriendDecision>('decision');

        // Track host hello (for display), but do not resolve until accepted + dm config arrives.
        let lastHostHello: FriendHello | null = null;
        onHello((data, peerId) => {
            debugLog('[FriendHandshake] Received host hello', {
                peerId: redact(peerId),
                pubkeyPrefix: typeof (data as any)?.pubkey === 'string' ? String((data as any).pubkey).slice(0, 8) : 'unknown',
                hasName: Boolean((data as any)?.name),
            });

            const hostPubkey = normalizePubkey((data as any)?.pubkey);
            const hostName = normalizeName((data as any)?.name) || (hostPubkey ? hostPubkey.slice(0, 8) : 'Friend');
            // Ignore invalid pubkeys and self-echoes (defensive).
            if (!isValidPubkey(hostPubkey) || hostPubkey === joinerHello.pubkey) return;
            lastHostHello = { pubkey: hostPubkey, name: hostName };
        });

        onDecision((data, peerId) => {
            if (resolved) return;

            debugLog('[FriendHandshake] Received host decision', {
                peerId: redact(peerId),
                accepted: Boolean((data as any)?.accepted),
            });

            const d = data as any;
            if (!d || typeof d !== 'object') return;

            const accepted = d.accepted === true;
            const host = (d.host && typeof d.host === 'object') ? d.host : lastHostHello;
            const hostPubkey = normalizePubkey(host?.pubkey);
            const hostName = normalizeName(host?.name) || (hostPubkey ? hostPubkey.slice(0, 8) : 'Friend');

            if (!isValidPubkey(hostPubkey)) {
                resolved = true;
                window.clearTimeout(timer);
                room.leave();
                reject(new Error('Invalid host identity'));
                return;
            }

            if (!accepted) {
                resolved = true;
                window.clearTimeout(timer);
                room.leave();
                reject(new Error(typeof d.reason === 'string' && d.reason ? d.reason : 'Friend request rejected'));
                return;
            }

            const dm = d.dm as FriendDmConfig | undefined;
            if (!dm?.sessionId || !dm?.keyB64Url) {
                resolved = true;
                window.clearTimeout(timer);
                room.leave();
                reject(new Error('Friend handshake missing DM config from host. Ask them to re-generate a new Friend Code.'));
                return;
            }

            resolved = true;
            window.clearTimeout(timer);
            room.leave();
            resolve({ pubkey: hostPubkey, name: hostName, dm });
        });

        // Send our hello immediately (broadcast) so the host receives it even if onPeerJoin
        // does not fire for already-present peers.
        sendHello(joinerHello);

        // Also send it when we detect a peer join (best-effort).
        room.onPeerJoin((peerId) => {
            debugLog('[FriendHandshake] Connected to peer:', redact(peerId));
            sendHello(joinerHello, peerId);
        });
    });
}

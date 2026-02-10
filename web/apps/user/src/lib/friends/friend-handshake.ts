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
    onPeerJoined: (peerInfo: ContactInfo) => void,
    onError?: (err: Error) => void
): FriendRoom {
    debugLog('[FriendHandshake] Hosting room');

    if (!myInfo.dm?.sessionId || !myInfo.dm?.keyB64Url) {
        const err = new Error('Host must provide a DM config (myInfo.dm)');
        onError?.(err);
        throw err;
    }

    const room = joinTrysteroRoom({ appId: APP_ID }, roomId);

    // Create action for exchanging contact info
    const [sendInfo, onPeerInfo] = room.makeAction<ContactInfo>('contact-info');

    // When we receive peer's info
    onPeerInfo((data, peerId) => {
        debugLog('[FriendHandshake] Received peer info', {
            peerId: redact(peerId),
            pubkeyPrefix: typeof data?.pubkey === 'string' ? data.pubkey.slice(0, 8) : 'unknown',
            hasName: typeof data?.name === 'string' && data.name.length > 0,
            hasDm: Boolean((data as any)?.dm),
        });
        // Critical: both sides must store/use the SAME DM config.
        // The host is the authority for DM config; ignore any dm sent by the joiner.
        onPeerJoined({
            pubkey: data.pubkey,
            name: data.name,
            dm: myInfo.dm,
        });
    });

    // When a peer joins, send our info
    room.onPeerJoin((peerId) => {
        debugLog('[FriendHandshake] Peer joined:', redact(peerId));
        // Send to that peer only (avoid broadcasting contact data)
        sendInfo(myInfo, peerId);
    });

    room.onPeerLeave((peerId) => {
        debugLog('[FriendHandshake] Peer left:', redact(peerId));
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

        // Create action for exchanging contact info
        const [sendInfo, onPeerInfo] = room.makeAction<ContactInfo>('contact-info');

        // When we receive host's info
        onPeerInfo((data, peerId) => {
            if (resolved) return;
            debugLog('[FriendHandshake] Received host info', {
                peerId: redact(peerId),
                pubkeyPrefix: typeof data?.pubkey === 'string' ? data.pubkey.slice(0, 8) : 'unknown',
                hasName: typeof data?.name === 'string' && data.name.length > 0,
                hasDm: Boolean((data as any)?.dm),
            });

            if (!data?.dm?.sessionId || !data?.dm?.keyB64Url) {
                resolved = true;
                window.clearTimeout(timer);
                room.leave();
                reject(new Error('Friend handshake missing DM config from host. Ask them to re-generate a new Friend Code.'));
                return;
            }

            resolved = true;
            window.clearTimeout(timer);
            room.leave();
            resolve(data);
        });

        // When we connect to the host, send our info
        room.onPeerJoin((peerId) => {
            debugLog('[FriendHandshake] Connected to host:', redact(peerId));
            // Joiner should NOT generate its own DM config.
            // Send only identity info; host provides dm.
            sendInfo({ pubkey: myInfo.pubkey, name: myInfo.name }, peerId);
        });
    });
}

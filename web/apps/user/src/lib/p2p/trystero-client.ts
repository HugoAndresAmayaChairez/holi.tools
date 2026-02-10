import { joinRoom } from 'trystero/nostr';

// Standard public relays for the ecosystem
import { NOSTR_RELAYS, ICE_SERVERS } from '../config';


export interface TrysteroConfig {
    appId: string;
}

function getTrysteroRelays(): string[] {
    // Keep this logic local to avoid importing the heavier nostr pool code.
    const raw = (import.meta as any).env?.PUBLIC_HOLI_NOSTR_RELAYS as string | undefined;
    if (raw) {
        const list = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        if (list.length) return list;
    }
    return NOSTR_RELAYS;
}

/**
 * Global Trystero factory.
 * Handles the strategy injection (Nostr) and default relays.
 */
export function joinTrysteroRoom(config: TrysteroConfig, roomId: string) {
    return joinRoom({
        ...config,
        relayUrls: getTrysteroRelays(),
        rtcConfig: { iceServers: ICE_SERVERS }
    }, roomId);
}

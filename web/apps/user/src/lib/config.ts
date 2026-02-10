/**
 * Config Manager
 * Uses localStorage for fast, synchronous UI state persistence
 * 
 * Use cases:
 * - Window positions
 * - Panel visibility states
 * - User preferences (theme, language)
 * - Tool settings
 */

const PREFIX = 'holi:';

/**
 * Get a config value (synchronous, instant)
 */
export function get<T>(key: string, defaultValue: T): T {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return defaultValue;
        return JSON.parse(raw) as T;
    } catch {
        return defaultValue;
    }
}

/**
 * Set a config value (synchronous, instant)
 */
export function set<T>(key: string, value: T): void {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.warn('Failed to save config:', key, e);
    }
}

/**
 * Remove a config value
 */
export function remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
}

/**
 * Get all config keys
 */
export function keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX)) {
            result.push(key.slice(PREFIX.length));
        }
    }
    return result;
}

/**
 * Clear all Holi config
 */
export function clear(): void {
    for (const key of keys()) {
        remove(key);
    }
}

// === Typed Helpers for Common Use Cases ===

export interface WindowPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function getWindowPosition(windowId: string): WindowPosition | null {
    return get<WindowPosition | null>(`window:${windowId}`, null);
}

export function setWindowPosition(windowId: string, pos: WindowPosition): void {
    set(`window:${windowId}`, pos);
}

export function getPanelVisible(panelId: string, defaultVisible = true): boolean {
    return get(`panel:${panelId}:visible`, defaultVisible);
}


export function setPanelVisible(panelId: string, visible: boolean): void {
    set(`panel:${panelId}:visible`, visible);
}

// === P2P Configuration ===

export const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Extra public STUN to improve odds across networks.
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
];

export const NOSTR_RELAYS = [
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://relay.primal.net',
    // Note: some public relays will block ("spam not permitted") or be unreachable on certain networks.
    // Use PUBLIC_HOLI_NOSTR_RELAYS to override when needed.
];


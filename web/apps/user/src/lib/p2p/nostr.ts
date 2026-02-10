import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { getActiveHandle } from '../workspace';
import { debugLog, debugWarn, redact } from '../debug';

export type NostrSignalType =
    | 'offer'
    | 'answer'
    | 'join'
    | 'admit'
    | 'friend_request'
    | 'friend_accept'
    | 'dm_offer'
    | 'dm_answer';

import { NOSTR_RELAYS } from '../config';

// Ephemeral kind (NIP-16). We use tags to filter by session.
const HOLI_SIGNAL_KIND = 21000;
// Regular/Stored kind for Friend Requests so they can be retrieved later
const HOLI_PERSISTENT_KIND = 6666;



const pool = new SimplePool({ enablePing: true, enableReconnect: true });

let cachedKeys: { sk: Uint8Array; pk: string } | null = null;

const HOLI_DIR = '.holi';
const NOSTR_KEYS_FILE = 'nostr-keys.json';
const LOCALSTORAGE_SK = 'holi.nostr.sk.hex';

type NostrKeysFileV1 = {
    version: 1;
    skHex: string;
};

function bytesToHex(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, '0');
    return out;
}

function hexToBytes(hex: string): Uint8Array {
    const clean = hex.trim().toLowerCase();
    if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) throw new Error('Invalid hex');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

async function readJsonFile(handle: FileSystemFileHandle): Promise<unknown> {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    return JSON.parse(text);
}

async function writeJsonFile(handle: FileSystemFileHandle, value: unknown): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(value, null, 2));
    await writable.close();
}

async function loadOrCreateVaultKeys(): Promise<{ sk: Uint8Array; pk: string } | null> {
    const root = getActiveHandle();
    if (!root) return null;

    const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
    const file = await holiDir.getFileHandle(NOSTR_KEYS_FILE, { create: true });

    try {
        const raw = await readJsonFile(file);
        const v = raw as any;
        if (v && v.version === 1 && typeof v.skHex === 'string') {
            const sk = hexToBytes(v.skHex);
            if (sk.length === 32) {
                const pk = getPublicKey(sk);
                return { sk, pk };
            }
        }
    } catch {
        // ignore and re-create
    }

    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const payload: NostrKeysFileV1 = { version: 1, skHex: bytesToHex(sk) };
    await writeJsonFile(file, payload);
    return { sk, pk };
}

async function loadOrCreateKeys(): Promise<{ sk: Uint8Array; pk: string }> {
    // 1) Prefer vault-scoped keys if a vault is active (shared across browsers opening same folder).
    // Important: do this even if we previously cached localStorage keys, so identity becomes stable
    // once a vault is opened.
    if (getActiveHandle()) {
        const vaultKeys = await loadOrCreateVaultKeys();
        if (vaultKeys) {
            cachedKeys = vaultKeys;
            return cachedKeys;
        }
    }

    if (cachedKeys) return cachedKeys;

    // 2) Fallback: origin-scoped localStorage (stable across tabs in the same browser profile).
    try {
        const fromLs = window.localStorage.getItem(LOCALSTORAGE_SK);
        if (fromLs) {
            const sk = hexToBytes(fromLs);
            if (sk.length === 32) {
                const pk = getPublicKey(sk);
                cachedKeys = { sk, pk };
                return cachedKeys;
            }
        }
    } catch {
        // ignore
    }

    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    cachedKeys = { sk, pk };
    try {
        window.localStorage.setItem(LOCALSTORAGE_SK, bytesToHex(sk));
    } catch {
        // ignore
    }
    return cachedKeys;
}

export async function getNostrPublicKey(): Promise<string> {
    return (await loadOrCreateKeys()).pk;
}

export function getNostrRelays(): string[] {
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

export async function publishSignal(opts: {
    sessionId: string;
    type: NostrSignalType;
    content: string;
    requestId?: string;
}): Promise<string> {
    const { sk } = await loadOrCreateKeys();
    const relays = getNostrRelays();

    const event = finalizeEvent(
        {
            kind: HOLI_SIGNAL_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'holi-signal'],
                ['s', opts.sessionId],
                ['m', opts.type],
                ...(opts.requestId ? [['r', opts.requestId] as [string, string]] : []),
            ],
            content: opts.content,
        },
        sk,
    );

    // Publish to multiple relays; succeed as soon as one accepts.
    await Promise.any(pool.publish(relays, event));

    return event.id;
}

export async function waitForSignal(opts: {
    sessionId: string;
    type: NostrSignalType;
    requestId?: string;
    since?: number;
    timeoutMs?: number;
}): Promise<{ content: string; eventId: string }> {
    const relays = getNostrRelays();
    const timeoutMs = opts.timeoutMs ?? 30_000;

    const filter: any = {
        kinds: [HOLI_SIGNAL_KIND],
        '#t': ['holi-signal'],
        '#s': [opts.sessionId],
        '#m': [opts.type],
        ...(opts.requestId ? { '#r': [opts.requestId] } : {}),
        limit: 1,
    };
    if (opts.since) filter.since = opts.since;

    return await new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            try {
                sub?.close?.();
            } catch {
                // ignore
            }
            reject(new Error('Nostr signaling timed out'));
        }, timeoutMs);

        const sub = pool.subscribe(
            relays,
            filter,
            {
                onevent(ev: any) {
                    window.clearTimeout(timer);
                    try {
                        sub.close?.();
                    } catch {
                        // ignore
                    }
                    resolve({ content: ev.content as string, eventId: ev.id as string });
                },
            },
        );
    });
}

export async function publishPubkeySignal(opts: {
    targetPubkey: string;
    type: NostrSignalType;
    content: string;
    persistent?: boolean;
}): Promise<string> {
    const { sk } = await loadOrCreateKeys();
    const relays = getNostrRelays();

    const kind = opts.persistent ? HOLI_PERSISTENT_KIND : HOLI_SIGNAL_KIND;

    const event = finalizeEvent(
        {
            kind,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'holi-signal'],
                ['p', opts.targetPubkey],
                ['m', opts.type],
            ],
            content: opts.content,
        },
        sk,
    );

    // Avoid logging full events: can include sensitive payloads (even if encrypted).
    debugLog('[NOSTR] Publishing signal', {
        kind,
        type: opts.type,
        targetPubkeyPrefix: redact(opts.targetPubkey, 8),
        contentBytes: opts.content.length,
    });
    await Promise.any(pool.publish(relays, event));
    debugLog('[NOSTR] Signal published');
    return event.id;
}

export function subscribePubkeySignals(opts: {
    myPubkey: string;
    type?: NostrSignalType;
    since?: number;
    onEvent: (evt: { content: string; sender: string; eventId: string }) => void;
}) {
    // OPTIMIZATION: Filter ONLY by #p (and kind/since).
    // Many relays do not verify/index custom tags like #m or #t for every event.
    // We will retrieve all messages for this user and filter them client-side.
    const relays = getNostrRelays();
    const filter: any = {
        kinds: [HOLI_SIGNAL_KIND, HOLI_PERSISTENT_KIND],
        '#p': [opts.myPubkey],
        since: opts.since || Math.floor(Date.now() / 1000),
    };

    // We DO NOT filter by '#m' or '#t' at the relay level anymore to ensure delivery.
    // Client-side filtering below:

    // Avoid logging filters verbatim (contains pubkeys, timing metadata).
    debugLog('[NOSTR] Subscribing for pubkey signals');

    return pool.subscribeMany(relays, [filter] as any, {
        onevent(e) {
            // Avoid logging raw events; they may contain sensitive payloads.
            debugLog('[NOSTR] Received event', { idPrefix: redact(String(e?.id || ''), 8) });
            try {
                // Client-side Filter: Check tag 't' == 'holi-signal'
                const tTag = e.tags.find(t => t[0] === 't')?.[1];
                if (tTag !== 'holi-signal') return;

                // Client-side Filter: Check type if requested
                if (opts.type) {
                    const mTag = e.tags.find(t => t[0] === 'm')?.[1];
                    if (mTag !== opts.type) return;
                }

                // Verify 'p' tag match explicitly just in case
                const pTag = e.tags.find(t => t[0] === 'p')?.[1];
                if (pTag !== opts.myPubkey) {
                    debugWarn('[NOSTR] Event p-tag mismatch');
                }

                opts.onEvent({
                    content: e.content,
                    sender: e.pubkey,
                    eventId: e.id,
                });
            } catch (err) {
                debugWarn('Error handling pubkey signal:', err);
            }
        },
        oneose() {
            debugLog('[NOSTR] EOSE received');
        }
    });
}

export function subscribeSignals(opts: {
    sessionId: string;
    type: NostrSignalType;
    since?: number;
    onEvent: (event: { content: string; eventId: string; pubkey: string }) => void;
}): { close: () => void } {
    const relays = getNostrRelays();
    const filter: any = {
        kinds: [HOLI_SIGNAL_KIND],
        '#t': ['holi-signal'],
        '#s': [opts.sessionId],
        '#m': [opts.type],
    };
    if (opts.since) filter.since = opts.since;

    const sub = pool.subscribe(relays, filter, {
        onevent(ev: any) {
            opts.onEvent({ content: ev.content as string, eventId: ev.id as string, pubkey: ev.pubkey as string });
        },
    });

    return {
        close: () => {
            try {
                sub.close?.();
            } catch {
                // ignore
            }
        },
    };
}

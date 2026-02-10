import initWasmP2p, { decrypt_envelope_v1, encrypt_envelope_v1 } from '@holi/wasm-p2p';

import { publishSignal, subscribeSignals } from '../p2p/nostr';
import { debugWarn } from '../debug';

let wasmReady: Promise<void> | null = null;
async function ensureWasmReady(): Promise<void> {
  if (!wasmReady) wasmReady = initWasmP2p().then(() => undefined);
  await wasmReady;
}

function randomBytes(len: number): Uint8Array {
  const out = new Uint8Array(len);
  crypto.getRandomValues(out);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function encryptForInvite(secretKey32: Uint8Array, plaintext: Uint8Array): Promise<string> {
  await ensureWasmReady();
  const envelopeBytes = encrypt_envelope_v1(secretKey32, plaintext);
  return bytesToBase64Url(new Uint8Array(envelopeBytes));
}

async function decryptFromInvite(secretKey32: Uint8Array, b64url: string): Promise<Uint8Array> {
  await ensureWasmReady();
  const envelopeBytes = base64UrlToBytes(b64url);
  const plaintextBytes = decrypt_envelope_v1(secretKey32, envelopeBytes);
  return new Uint8Array(plaintextBytes);
}

const FRIEND_HASH_PREFIX = 'nf=';

export function makeFriendInviteUrl(sessionId: string, secretKey32: Uint8Array): string {
  const secret = bytesToBase64Url(secretKey32);
  return `${window.location.origin}/friend#${FRIEND_HASH_PREFIX}${sessionId}.${secret}`;
}

export function parseFriendInviteHash(hash: string): { sessionId: string; secretKey32: Uint8Array } | null {
  if (!hash.startsWith(FRIEND_HASH_PREFIX)) return null;
  const rest = hash.slice(FRIEND_HASH_PREFIX.length);
  const [sessionId, secretB64] = rest.split('.', 2);
  if (!sessionId || !secretB64) return null;
  const key = base64UrlToBytes(secretB64);
  if (key.length !== 32) return null;
  return { sessionId, secretKey32: key };
}

export async function createFriendInvite(): Promise<{ url: string; sessionId: string; secretKey32: Uint8Array }> {
  const sessionId = bytesToBase64Url(randomBytes(16));
  const secretKey32 = randomBytes(32);
  return { url: makeFriendInviteUrl(sessionId, secretKey32), sessionId, secretKey32 };
}

export type IncomingFriendRequest = {
  requestId: string;
  pubkey: string;
  name: string;
  createdAt: number;
};

export function subscribeFriendRequests(opts: {
  sessionId: string;
  secretKey32: Uint8Array;
  onRequest: (req: IncomingFriendRequest) => void;
}): { close: () => void } {
  const seen = new Set<string>();
  const sub = subscribeSignals({
    sessionId: opts.sessionId,
    type: 'friend_request',
    since: Math.floor(Date.now() / 1000) - 60,
    onEvent: async ({ content, eventId, pubkey }) => {
      if (seen.has(eventId)) return;
      seen.add(eventId);

      try {
        const plain = await decryptFromInvite(opts.secretKey32, content);
        const json = JSON.parse(new TextDecoder().decode(plain)) as any;
        const name = typeof json?.name === 'string' ? json.name : 'Anonymous';
        const createdAt = typeof json?.ts === 'number' ? json.ts : Date.now();
        opts.onRequest({ requestId: eventId, pubkey, name, createdAt });
      } catch (e) {
        debugWarn('[Friends] Failed to decrypt/parse friend request', e);
      }
    },
  });

  return sub;
}

export async function sendFriendRequestAndWaitAccept(opts: {
  sessionId: string;
  secretKey32: Uint8Array;
  name: string;
  timeoutMs?: number;
}): Promise<{ inviterPubkey: string; inviterName: string; dm?: { sessionId: string; keyB64Url: string } }> {
  // Guard against a race where the inviter responds (publishes friend_accept)
  // before we start our subscription.
  const sinceSec = Math.floor(Date.now() / 1000) - 60;

  const payload = {
    t: 'friend_request' as const,
    name: opts.name,
    ts: Date.now(),
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await encryptForInvite(opts.secretKey32, plaintext);
  const requestId = await publishSignal({ sessionId: opts.sessionId, type: 'friend_request', content: encrypted });

  // Do NOT rely on relays indexing the '#r' tag (requestId). Some relays may ignore it.
  // Instead, subscribe to all friend_accept events for this session and decrypt+match `rid`.
  const acceptEncrypted = await new Promise<string>((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? 5 * 60_000;
    let done = false;

    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      try {
        sub.close();
      } catch {
        // ignore
      }
      reject(new Error('Timed out waiting for friend accept'));
    }, timeoutMs);

    const sub = subscribeSignals({
      sessionId: opts.sessionId,
      type: 'friend_accept',
      since: sinceSec,
      onEvent: async ({ content }) => {
        if (done) return;
        try {
          const plain = await decryptFromInvite(opts.secretKey32, content);
          const json = JSON.parse(new TextDecoder().decode(plain)) as any;
          const rid = typeof json?.rid === 'string' ? json.rid : '';
          if (rid !== requestId) return;

          done = true;
          window.clearTimeout(timer);
          try {
            sub.close();
          } catch {
            // ignore
          }
          resolve(content);
        } catch {
          // ignore non-decryptable events
        }
      },
    });
  });

  const acceptPlain = await decryptFromInvite(opts.secretKey32, acceptEncrypted);
  const acceptJson = JSON.parse(new TextDecoder().decode(acceptPlain)) as any;

  const inviterPubkey = typeof acceptJson?.inviterPubkey === 'string' ? acceptJson.inviterPubkey : '';
  const inviterName = typeof acceptJson?.inviterName === 'string' ? acceptJson.inviterName : 'Friend';

  const dm = (() => {
    const d = acceptJson?.dm;
    if (!d || typeof d !== 'object') return undefined;
    const sessionId = typeof d.sessionId === 'string' ? d.sessionId : '';
    const keyB64Url = typeof d.keyB64Url === 'string' ? d.keyB64Url : '';
    if (!sessionId || !keyB64Url) return undefined;
    return { sessionId, keyB64Url };
  })();

  if (!/^[0-9a-f]{64}$/i.test(inviterPubkey)) {
    throw new Error('Invalid accept payload (missing inviter pubkey)');
  }

  return { inviterPubkey: inviterPubkey.toLowerCase(), inviterName, dm };
}

export async function acceptFriendRequest(opts: {
  sessionId: string;
  secretKey32: Uint8Array;
  requestId: string;
  inviterPubkey: string;
  inviterName: string;
  dm?: { sessionId: string; keyB64Url: string };
}): Promise<void> {
  const payload = {
    t: 'friend_accept' as const,
    ok: true,
    rid: opts.requestId,
    ts: Date.now(),
    inviterPubkey: opts.inviterPubkey,
    inviterName: opts.inviterName,
    ...(opts.dm ? { dm: opts.dm } : {}),
  };
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await encryptForInvite(opts.secretKey32, plaintext);

  await publishSignal({
    sessionId: opts.sessionId,
    type: 'friend_accept',
    requestId: opts.requestId,
    content: encrypted,
  });
}

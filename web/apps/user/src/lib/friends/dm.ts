import { getActiveHandle } from '../workspace';

export type FriendDmConfig = {
  sessionId: string;
  keyB64Url: string;
};

export type FriendDmMessage = {
  id: string;
  ts: number;
  from: 'me' | 'peer';
  text: string;
  peerPubkey?: string;
};

type DmFileV1 = {
  version: 1;
  messages: FriendDmMessage[];
};

let wasmReady: Promise<void> | null = null;
async function ensureWasmReady(): Promise<void> {
  // kept for potential future use
  if (!wasmReady) wasmReady = Promise.resolve();
  await wasmReady;
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

export function generateDmConfig(): FriendDmConfig {
  const sessionIdBytes = new Uint8Array(16);
  crypto.getRandomValues(sessionIdBytes);
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  return {
    sessionId: bytesToBase64Url(sessionIdBytes),
    keyB64Url: bytesToBase64Url(keyBytes),
  };
}

export function dmKeyBytes(keyB64Url: string): Uint8Array {
  void ensureWasmReady();
  const key = base64UrlToBytes(keyB64Url);
  if (key.length !== 32) throw new Error('Invalid DM key');
  return key;
}

const HOLI_DIR = '.holi';
const DM_DIR = 'dm';

async function readJsonFile(handle: FileSystemFileHandle): Promise<unknown> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function writeJsonFile(handle: FileSystemFileHandle, value: unknown) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(value, null, 2));
  await writable.close();
}

async function ensureDmFile(root: FileSystemDirectoryHandle, sessionId: string) {
  const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
  const dmDir = await holiDir.getDirectoryHandle(DM_DIR, { create: true });
  const file = await dmDir.getFileHandle(`${sessionId}.json`, { create: true });
  return file;
}

export async function listDmMessages(sessionId: string): Promise<FriendDmMessage[]> {
  const root = getActiveHandle();
  if (!root) throw new Error('No active workspace');
  const file = await ensureDmFile(root, sessionId);
  try {
    const raw = await readJsonFile(file);
    const v = raw as any;
    if (!v || typeof v !== 'object' || !Array.isArray(v.messages)) {
      const empty: DmFileV1 = { version: 1, messages: [] };
      await writeJsonFile(file, empty);
      return [];
    }
    const msgs = v.messages
      .filter((m: any) => m && typeof m.id === 'string' && typeof m.text === 'string')
      .map((m: any) => ({
        id: m.id,
        ts: typeof m.ts === 'number' ? m.ts : Date.now(),
        from: m.from === 'peer' ? 'peer' : 'me',
        text: m.text,
        peerPubkey: typeof m.peerPubkey === 'string' ? m.peerPubkey : undefined,
      })) as FriendDmMessage[];
    msgs.sort((a, b) => a.ts - b.ts);
    return msgs;
  } catch {
    const empty: DmFileV1 = { version: 1, messages: [] };
    await writeJsonFile(file, empty);
    return [];
  }
}

export async function saveDmMessage(sessionId: string, message: FriendDmMessage): Promise<void> {
  const root = getActiveHandle();
  if (!root) throw new Error('No active workspace');
  const file = await ensureDmFile(root, sessionId);
  const raw = await readJsonFile(file);
  const v = raw as any;
  const data: DmFileV1 =
    v && typeof v === 'object' && Array.isArray(v.messages)
      ? { version: 1, messages: v.messages as FriendDmMessage[] }
      : { version: 1, messages: [] };

  // Dedupe by id.
  if (!data.messages.some((m) => m.id === message.id)) {
    data.messages.push(message);
    data.messages.sort((a, b) => a.ts - b.ts);
    await writeJsonFile(file, data);
  }
}

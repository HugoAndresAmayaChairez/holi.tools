/**
 * Identity Manager
 *
 * Canonical identity is stored inside the user's vault folder under `.holi/identity.json`
 * so it can be shared across sessions (and later across apps/origins that open the same folder).
 *
 * Fallback: if no vault is open, we return null (guest mode).
 */

import initWasmCrypto, { IdentityKey } from "@holi/wasm-crypto";
import { getActiveHandle } from "../workspace";

export interface Identity {
  /** Public identity key (64 hex chars). */
  id: string;
  alias: string | null;
  avatar: Blob | null;
  createdAt: number;
}

const HOLI_DIR = ".holi";
const IDENTITY_FILE = "identity.json";

type IdentityFileV1 = {
  version: 1;
  keyJson: string;
  alias: string | null;
  createdAt: number;
  avatarFile?: string | null;
};

let wasmReady: Promise<void> | null = null;
async function ensureWasmReady(): Promise<void> {
  if (!wasmReady) wasmReady = initWasmCrypto().then(() => undefined);
  await wasmReady;
}

async function readJsonFile(handle: FileSystemFileHandle): Promise<unknown> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function writeJsonFile(
  handle: FileSystemFileHandle,
  value: unknown
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(value, null, 2));
  await writable.close();
}

function extFromMime(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  return "bin";
}

async function readAvatar(
  root: FileSystemDirectoryHandle,
  avatarFile?: string | null
): Promise<Blob | null> {
  if (!avatarFile) return null;
  try {
    const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
    const fileHandle = await holiDir.getFileHandle(avatarFile);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}

async function loadOrCreateIdentityFile(
  root: FileSystemDirectoryHandle,
  opts?: { defaultAlias?: string }
): Promise<{ key: IdentityKey; data: IdentityFileV1 }> {
  await ensureWasmReady();

  const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
  const fileHandle = await holiDir.getFileHandle(IDENTITY_FILE, {
    create: true,
  });

  const raw = await readJsonFile(fileHandle);
  if (raw && typeof raw === "object") {
    const v = raw as any;
    if (v.version === 1 && typeof v.keyJson === "string") {
      try {
        const key = IdentityKey.from_json(v.keyJson);
        const alias = typeof v.alias === "string" ? v.alias : null;
        const createdAt =
          typeof v.createdAt === "number" ? v.createdAt : Date.now();
        const avatarFile =
          typeof v.avatarFile === "string" && v.avatarFile.trim()
            ? v.avatarFile
            : null;
        return {
          key,
          data: {
            version: 1,
            keyJson: v.keyJson,
            alias,
            createdAt,
            avatarFile,
          },
        };
      } catch {
        // fall through to re-create
      }
    }
  }

  const key = new IdentityKey();
  const data: IdentityFileV1 = {
    version: 1,
    keyJson: key.to_json(),
    alias: opts?.defaultAlias || root.name || "User",
    createdAt: Date.now(),
    avatarFile: null,
  };
  await writeJsonFile(fileHandle, data);
  return { key, data };
}

/**
 * Gets the primary identity (vault-scoped). Returns null if no vault is open.
 */
export async function getPrimaryIdentity(): Promise<Identity | null> {
  const root = getActiveHandle();
  if (!root) return null;

  const { key, data } = await loadOrCreateIdentityFile(root);
  const avatar = await readAvatar(root, data.avatarFile);

  return {
    id: key.public_key_hex(),
    alias: data.alias,
    avatar,
    createdAt: data.createdAt,
  };
}

/**
 * Ensures an identity exists for the active vault.
 */
export async function ensurePrimaryIdentity(opts?: {
  defaultAlias?: string;
}): Promise<Identity> {
  const root = getActiveHandle();
  if (!root) throw new Error("No active workspace");

  const { key, data } = await loadOrCreateIdentityFile(root, {
    defaultAlias: opts?.defaultAlias,
  });
  const avatar = await readAvatar(root, data.avatarFile);

  return {
    id: key.public_key_hex(),
    alias: data.alias,
    avatar,
    createdAt: data.createdAt,
  };
}

/**
 * Creates a new identity for the active vault (overwrites `.holi/identity.json`).
 */
export async function createIdentity(
  alias?: string,
  avatar: Blob | null = null
): Promise<Identity> {
  const root = getActiveHandle();
  if (!root) throw new Error("No active workspace");

  await ensureWasmReady();
  const key = new IdentityKey();
  const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });

  let avatarFile: string | null = null;
  if (avatar) {
    const mime = (avatar as File).type || "";
    const ext = extFromMime(mime);
    avatarFile = `avatar.${ext}`;
    const avatarHandle = await holiDir.getFileHandle(avatarFile, {
      create: true,
    });
    const writable = await avatarHandle.createWritable();
    await writable.write(avatar);
    await writable.close();
  }

  const data: IdentityFileV1 = {
    version: 1,
    keyJson: key.to_json(),
    alias: alias || root.name || "User",
    createdAt: Date.now(),
    avatarFile,
  };

  const fileHandle = await holiDir.getFileHandle(IDENTITY_FILE, {
    create: true,
  });
  await writeJsonFile(fileHandle, data);

  return {
    id: key.public_key_hex(),
    alias: data.alias,
    avatar,
    createdAt: data.createdAt,
  };
}

/**
 * Updates alias/avatar for the active vault identity.
 */
export async function updateIdentity(identity: Identity): Promise<void> {
  const root = getActiveHandle();
  if (!root) throw new Error("No active workspace");

  const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
  const fileHandle = await holiDir.getFileHandle(IDENTITY_FILE, {
    create: true,
  });
  const { key, data } = await loadOrCreateIdentityFile(root);

  const currentPub = key.public_key_hex();
  if (identity.id && identity.id !== currentPub) {
    throw new Error("Identity mismatch (wrong vault?)");
  }

  data.alias = identity.alias ?? null;

  if (identity.avatar) {
    const mime = (identity.avatar as File).type || "";
    const ext = extFromMime(mime);
    const avatarFile = `avatar.${ext}`;
    const avatarHandle = await holiDir.getFileHandle(avatarFile, {
      create: true,
    });
    const writable = await avatarHandle.createWritable();
    await writable.write(identity.avatar);
    await writable.close();
    data.avatarFile = avatarFile;
  }

  await writeJsonFile(fileHandle, data);
}

/**
 * Returns all identities. Currently this is either [primary] (vault open) or [] (guest).
 */
export async function getIdentities(): Promise<Identity[]> {
  const primary = await getPrimaryIdentity();
  return primary ? [primary] : [];
}

/**
 * Legacy API: private keys are no longer exposed from the identity manager.
 */
export async function getIdentityPrivateKey(
  _id: string
): Promise<CryptoKey | null> {
  return null;
}

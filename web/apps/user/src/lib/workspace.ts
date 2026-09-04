/**
 * Workspace Manager
 * Manages the User's Local File System Vault
 */
import * as db from "./db/indexeddb";
import { ensurePrimaryIdentity } from "./identity/manager";

let currentHandle: FileSystemDirectoryHandle | null = null;
let currentVaultId: string | null = null;

const HOLI_DIR = ".holi";
const VAULT_ID_FILE = "vault-id";

async function readTextFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return await file.text();
}

async function writeTextFile(
  handle: FileSystemFileHandle,
  text: string
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function getOrCreateVaultId(
  root: FileSystemDirectoryHandle
): Promise<string> {
  const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
  const file = await holiDir.getFileHandle(VAULT_ID_FILE, { create: true });
  const raw = (await readTextFile(file)).trim();
  if (raw) return raw;

  const id = crypto.randomUUID();
  await writeTextFile(file, `${id}\n`);
  return id;
}

export async function openWorkspace(): Promise<{
  id: string;
  name: string;
  isOpfs: boolean;
}> {
  let handle: FileSystemDirectoryHandle;
  let isOpfs = false;

  // 1. Request access to a directory (Native or OPFS Fallback)
  // Brave sometimes defines the property but sets it to undefined/non-function
  if (typeof (window as any).showDirectoryPicker === "function") {
    try {
      // @ts-ignore
      handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        id: "holi-vault", // Helps browser remember default path
        startIn: "documents",
      });
    } catch (e: any) {
      if (e.name === "AbortError") throw e; // User cancelled
      // Native picker failed, try OPFS fallback
      if (navigator.storage && navigator.storage.getDirectory) {
        const opfsRoot = await navigator.storage.getDirectory();
        handle = await opfsRoot.getDirectoryHandle("HoliVault", {
          create: true,
        });
        isOpfs = true;
        console.warn(
          "Native folder selection failed. OPFS sandbox activated.",
          e
        );
      } else {
        throw e;
      }
    }
  } else if (navigator.storage && navigator.storage.getDirectory) {
    // Fallback for Safari / Brave (Shields Up) / Mobile / Insecure contexts
    const opfsRoot = await navigator.storage.getDirectory();
    handle = await opfsRoot.getDirectoryHandle("HoliVault", { create: true });
    isOpfs = true;
  } else {
    throw new Error(
      "Local folder access and OPFS are both unsupported on this browser."
    );
  }

  // 2. Get a stable vault ID stored inside the folder (cross-session, cross-origin).
  const id = await getOrCreateVaultId(handle);
  const name = isOpfs ? "Local Browser Sandbox" : handle.name;

  // 3. Save Handle to IDB
  await db.saveVaultHandle({
    id,
    name,
    handle,
    lastUsed: Date.now(),
  });

  currentHandle = handle;
  currentVaultId = id;

  // 4. Initialize structure if needed
  await initVaultStructure(handle);

  // 5. Auto-create identity (was previously manual/dev-only)
  await ensurePrimaryIdentity({ defaultAlias: name || "User" });

  return { id, name, isOpfs };
}

export async function restoreWorkspace(id: string): Promise<boolean> {
  const vault = await db.getVaultHandle(id);
  if (!vault) return false;

  // Verify permission
  // @ts-ignore
  const perm = await vault.handle.queryPermission({ mode: "readwrite" });
  // Important: do NOT call requestPermission() here.
  // Browsers require a user activation gesture to request permissions; calling it during
  // auto-restore (page load) will throw SecurityError. If permission isn't granted,
  // the user must re-open the folder via showDirectoryPicker (openWorkspace()).
  if (perm !== "granted") return false;

  // Canonicalize ID to the vault-id stored inside the folder.
  const canonicalId = await getOrCreateVaultId(vault.handle);
  currentHandle = vault.handle;
  currentVaultId = canonicalId;

  // If this record was created before we had a canonical vault-id, migrate it.
  if (canonicalId !== vault.id) {
    try {
      await db.deleteVaultHandle(vault.id);
    } catch {
      // ignore
    }
    await db.saveVaultHandle({
      id: canonicalId,
      name: vault.name,
      handle: vault.handle,
      lastUsed: Date.now(),
    });
  } else {
    // Update last used
    vault.lastUsed = Date.now();
    await db.saveVaultHandle(vault);
  }

  // Auto-create identity (was previously manual/dev-only)
  await ensurePrimaryIdentity({ defaultAlias: vault.name || "User" });
  return true;
}

export function getActiveHandle(): FileSystemDirectoryHandle | null {
  return currentHandle;
}

export function getActiveVaultId(): string | null {
  return currentVaultId;
}

// === Helper to init folders ===

async function initVaultStructure(root: FileSystemDirectoryHandle) {
  // Ensure 'projects' folder exists
  await root.getDirectoryHandle("projects", { create: true });

  // Check/Create holi.json
  try {
    await root.getFileHandle("holi.json");
  } catch {
    // Create default config
    const file = await root.getFileHandle("holi.json", { create: true });
    const writable = await file.createWritable();
    await writable.write(
      JSON.stringify(
        {
          version: "1.0",
          created: Date.now(),
          user: { alias: "User" },
        },
        null,
        2
      )
    );
    await writable.close();
  }
}

// === Restore Session Logic ===

export async function getLastVault(): Promise<{
  id: string;
  name: string;
} | null> {
  const vaults = await db.getVaultHandles();
  if (vaults.length === 0) return null;
  return { id: vaults[0].id, name: vaults[0].name };
}

export async function checkAccess(
  id: string
): Promise<"granted" | "prompt" | "denied"> {
  const vault = await db.getVaultHandle(id);
  if (!vault) return "denied";
  // @ts-ignore
  return await vault.handle.queryPermission({ mode: "readwrite" });
}

export async function restoreSession(id: string): Promise<boolean> {
  return await restoreWorkspace(id);
}

/**
 * Workspace Manager
 * Manages the User's Local File System Vault
 */
import * as db from './db/indexeddb';
import { ensurePrimaryIdentity } from './identity/manager';

let currentHandle: FileSystemDirectoryHandle | null = null;
let currentVaultId: string | null = null;

export async function openWorkspace(): Promise<{ id: string, name: string }> {
    // 1. Request access to a directory
    // @ts-ignore
    const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        id: 'holi-vault', // Helps browser remember default path
        startIn: 'documents'
    });

    // 2. Generate or Read ID
    // For now, we generate a stable ID based on name? No, UUID for the handle reference.
    // Ideally we put a .holi-id file in there?
    // Let's keep it simple: We assign a UUID to this "Session/Connection" to the folder.
    // If the user selects the same folder again, we might create a new Handle Record but it matches.

    const id = crypto.randomUUID();
    const name = handle.name;

    // 3. Save Handle to IDB
    await db.saveVaultHandle({
        id,
        name,
        handle,
        lastUsed: Date.now()
    });

    currentHandle = handle;
    currentVaultId = id;

    // 4. Initialize structure if needed
    await initVaultStructure(handle);

    // 5. Auto-create identity (was previously manual/dev-only)
    await ensurePrimaryIdentity({ defaultAlias: name || 'User' });

    return { id, name };
}

export async function restoreWorkspace(id: string): Promise<boolean> {
    const vault = await db.getVaultHandle(id);
    if (!vault) return false;

    // Verify permission
    // @ts-ignore
    const perm = await vault.handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
        currentHandle = vault.handle;
        currentVaultId = id;
        // Update last used
        vault.lastUsed = Date.now();
        await db.saveVaultHandle(vault);

        // Auto-create identity (was previously manual/dev-only)
        await ensurePrimaryIdentity({ defaultAlias: vault.name || 'User' });
        return true;
    }

    // Request permission if needed
    if (perm === 'prompt') {
        // @ts-ignore
        const newPerm = await vault.handle.requestPermission({ mode: 'readwrite' });
        if (newPerm === 'granted') {
            currentHandle = vault.handle;
            currentVaultId = id;
            vault.lastUsed = Date.now();
            await db.saveVaultHandle(vault);

            // Auto-create identity (was previously manual/dev-only)
            await ensurePrimaryIdentity({ defaultAlias: vault.name || 'User' });
            return true;
        }
    }

    return false;
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
    await root.getDirectoryHandle('projects', { create: true });

    // Check/Create holi.json
    try {
        await root.getFileHandle('holi.json');
    } catch {
        // Create default config
        const file = await root.getFileHandle('holi.json', { create: true });
        const writable = await file.createWritable();
        await writable.write(JSON.stringify({
            version: "1.0",
            created: Date.now(),
            user: { alias: "User" }
        }, null, 2));
        await writable.close();
    }
}

// === Restore Session Logic ===

export async function getLastVault(): Promise<{ id: string, name: string } | null> {
    const vaults = await db.getVaultHandles();
    if (vaults.length === 0) return null;
    return { id: vaults[0].id, name: vaults[0].name };
}

export async function checkAccess(id: string): Promise<'granted' | 'prompt' | 'denied'> {
    const vault = await db.getVaultHandle(id);
    if (!vault) return 'denied';
    // @ts-ignore
    return await vault.handle.queryPermission({ mode: 'readwrite' });
}

export async function restoreSession(id: string): Promise<boolean> {
    return await restoreWorkspace(id);
}

/**
 * Simple IndexedDB-based storage for cross-navigation persistence
 * Replaces SQLite in-memory until Worker-based OPFS is implemented
 */

const DB_NAME = "holi-vault";
const DB_VERSION = 2;

interface Identity {
    id: string;
    alias: string | null;
    avatar: Blob | null; // New avatar field
    privateKeyBlob: string;
    createdAt: number;
}

interface ProjectCollaborator {
    did: string;
    role: "owner" | "editor" | "viewer";
    name: string;
    addedAt: number;
}

interface Project {
    id: string;
    name: string;
    role: "owner" | "editor" | "viewer";
    projectMasterKey?: string;
    lastOpened: number;

    collaborators: ProjectCollaborator[];
    settings: {
        autoAdmit: boolean;
        allowOfflineEditing: boolean;
    };
    type: "generic" | "typst" | "paint";
    assets: string[];
}

export interface VaultHandle {
    id: string;
    name: string;
    handle: FileSystemDirectoryHandle;
    lastUsed: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object stores
            if (!db.objectStoreNames.contains("identities")) {
                db.createObjectStore("identities", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("projects")) {
                db.createObjectStore("projects", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("peers")) {
                db.createObjectStore("peers", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("messages")) {
                const store = db.createObjectStore("messages", { keyPath: "id" });
                store.createIndex("projectId", "projectId", { unique: false });
                store.createIndex("timestamp", "timestamp", { unique: false });
            }
            // Version 2: Vault Handles for FS Access
            if (!db.objectStoreNames.contains("vault_handles")) {
                db.createObjectStore("vault_handles", { keyPath: "id" });
            }
        };
    });

    return dbPromise;
}

// ==================== IDENTITY OPERATIONS ====================

export async function createIdentity(id: string, alias: string | null, privateKeyBlob: string, avatar: Blob | null = null): Promise<Identity> {
    const db = await getDb();
    const identity: Identity = {
        id,
        alias,
        avatar,
        privateKeyBlob,
        createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction("identities", "readwrite");
        const store = tx.objectStore("identities");
        const request = store.put(identity);

        request.onsuccess = () => resolve(identity);
        request.onerror = () => reject(request.error);
    });
}

export async function updateIdentity(identity: Identity): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("identities", "readwrite");
        const store = tx.objectStore("identities");
        const request = store.put(identity);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getIdentities(): Promise<Identity[]> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("identities", "readonly");
        const store = tx.objectStore("identities");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getIdentity(id: string): Promise<Identity | null> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("identities", "readonly");
        const store = tx.objectStore("identities");
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

// ==================== PROJECT OPERATIONS ====================

export async function createProject(project: Project): Promise<Project> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("projects", "readwrite");
        const store = tx.objectStore("projects");
        const request = store.put(project);

        request.onsuccess = () => resolve(project);
        request.onerror = () => reject(request.error);
    });
}

export async function getProjects(): Promise<Project[]> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("projects", "readonly");
        const store = tx.objectStore("projects");
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by lastOpened descending
            const projects = request.result as Project[];
            projects.sort((a, b) => b.lastOpened - a.lastOpened);
            resolve(projects);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function getProject(id: string): Promise<Project | null> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("projects", "readonly");
        const store = tx.objectStore("projects");
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function updateProject(project: Project): Promise<void> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("projects", "readwrite");
        const store = tx.objectStore("projects");
        const request = store.put(project);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function deleteProject(id: string): Promise<void> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("projects", "readwrite");
        const store = tx.objectStore("projects");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function deleteMessagesByProject(projectId: string): Promise<void> {
    const db = await getDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("messages", "readwrite");
        const store = tx.objectStore("messages");
        const index = store.index("projectId");
        const range = IDBKeyRange.only(projectId);
        const cursorReq = index.openCursor(range);

        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result as IDBCursorWithValue | null;
            if (!cursor) {
                resolve();
                return;
            }
            cursor.delete();
            cursor.continue();
        };
        cursorReq.onerror = () => reject(cursorReq.error);
    });
}

// ==================== MESSAGE OPERATIONS ====================

export interface StoredMessage {
    id: string; // uuid
    projectId: string;
    senderId: string; // 'me' or 'peer'
    type: 'text' | 'file';
    content: string;
    timestamp: number;
}

export async function saveMessage(message: StoredMessage): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("messages", "readwrite");
        const store = tx.objectStore("messages");
        const request = store.put(message);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getMessages(projectId: string): Promise<StoredMessage[]> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("messages", "readonly");
        const store = tx.objectStore("messages");
        const index = store.index("projectId");
        const request = index.getAll(IDBKeyRange.only(projectId));

        request.onsuccess = () => {
            const msgs = request.result as StoredMessage[];
            msgs.sort((a, b) => a.timestamp - b.timestamp);
            resolve(msgs);
        };
        request.onerror = () => reject(request.error);
    });
}

// ==================== VAULT HANDLES ====================

export async function saveVaultHandle(vault: VaultHandle): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("vault_handles", "readwrite");
        const store = tx.objectStore("vault_handles");
        const request = store.put(vault);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getVaultHandles(): Promise<VaultHandle[]> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("vault_handles", "readonly");
        const store = tx.objectStore("vault_handles");
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result as VaultHandle[];
            results.sort((a, b) => b.lastUsed - a.lastUsed);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function getVaultHandle(id: string): Promise<VaultHandle | null> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("vault_handles", "readonly");
        const store = tx.objectStore("vault_handles");
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

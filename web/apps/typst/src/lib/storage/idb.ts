/** IndexedDB + localStorage storage layer for Holi Typst. */

const DB_NAME = "holi-typst";
const STORE = "kv";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
    if (dbp) return dbp;
    if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB not available"));
    dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
    });
    return dbp;
}

async function idbGet(key: string): Promise<unknown> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB get failed"));
    });
}

async function idbSet(key: string, value: unknown): Promise<void> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error("IndexedDB set failed"));
    });
}

async function idbDel(key: string): Promise<void> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error("IndexedDB delete failed"));
    });
}

// Structured values (including File System Access handles) stay in IndexedDB.
// Unlike document strings, these deliberately have no localStorage mirror.
export async function getStoredValue<T>(key: string): Promise<T | undefined> {
    try {
        return (await idbGet(key)) as T | undefined;
    } catch {
        return undefined;
    }
}

export async function setStoredValue<T>(key: string, value: T): Promise<void> {
    await idbSet(key, value);
}

export async function deleteStoredValue(key: string): Promise<void> {
    try {
        await idbDel(key);
    } catch {
        // ignore unavailable IndexedDB; there is no secondary copy
    }
}

// ── localStorage helpers ──────────────────────────────────────────────

export function safeGetItem(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function safeSetItem(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // ignore (private mode / quota)
    }
}

// ── High-level document storage (IDB primary, localStorage fallback) ──

export async function getStoredDoc(key: string): Promise<string | null> {
    try {
        const value = await idbGet(key);
        if (typeof value === "string") return value;
    } catch {
        // ignore
    }
    return safeGetItem(key);
}

export async function setStoredDoc(key: string, value: string): Promise<void> {
    try {
        await idbSet(key, value);
    } catch {
        // ignore
    }
    // Keep localStorage as a fallback / fast path for simple retrieval.
    safeSetItem(key, value);
}

export async function deleteStoredKey(key: string): Promise<void> {
    try {
        await idbDel(key);
    } catch {
        // ignore
    }
    try {
        window.localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

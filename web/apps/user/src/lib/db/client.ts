import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { debugLog, debugWarn, isDebugEnabled } from "../debug";

let db: any = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY, -- PublicKey Root
  alias TEXT,
  private_key_blob BLOB, -- Encrypted with Passkey/Hardware
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, -- UUID
  name TEXT,
  role TEXT, -- 'owner', 'editor', 'viewer'
  project_master_key BLOB, -- Encrypted with Identity Root Key
  sync_state BLOB, -- Yjs SV
  last_opened INTEGER
);

CREATE TABLE IF NOT EXISTS peers (
  id TEXT PRIMARY KEY, -- Public Key
  alias TEXT,
  trust_level INTEGER, -- 0: Stranger, 1: Project-Peer, 2: Trusted
  last_seen INTEGER
);
`;

export async function getDb() {
    if (db) return db;

    try {
        const debug = isDebugEnabled();
        const noop = () => { };
        const sqlite3 = await sqlite3InitModule({
            print: debug ? console.log : noop,
            printErr: debug ? console.error : noop,
            locateFile: (_file: string) => `/sqlite3.wasm`,
        });

        if ("opfs" in sqlite3) {
            db = new sqlite3.oo1.OpfsDb("/holi-vault.sqlite3");
            debugLog('Opened OPFS database');
        } else {
            debugWarn('OPFS not available, falling back to in-memory DB');
            db = new sqlite3.oo1.DB("/holi-vault-mem.sqlite3", "ct");
        }

        // Initialize Schema
        db.exec(SCHEMA);

        return db;
    } catch (err) {
        debugWarn('Failed to initialize SQLite:', err);
        throw err;
    }
}

export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

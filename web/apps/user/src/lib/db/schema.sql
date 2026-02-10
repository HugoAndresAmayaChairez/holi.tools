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

import { getActiveHandle } from "../workspace";

export type ContactState = "active" | "paused" | "blocked";

export type Contact = {
  id: string;
  alias: string;
  state: ContactState;
  /** Nostr public key (hex). Optional until contact is bound. */
  nostrPubkey?: string;
  /** Friend DM configuration (created during friend invite accept). */
  dm?: {
    /** Nostr sessionId used for DM transport (base64url-ish string). */
    sessionId: string;
    /** Symmetric key for envelope encryption (base64url). */
    keyB64Url: string;
  };
  createdAt: number;
  updatedAt: number;
};

type ContactsFileV3 = {
  version: 3;
  contacts: Contact[];
};

const CONTACTS_DIR = ".holi";
const CONTACTS_FILE = "contacts.json";

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

async function ensureContactsFile(root: FileSystemDirectoryHandle) {
  const holiDir = await root.getDirectoryHandle(CONTACTS_DIR, { create: true });
  const file = await holiDir.getFileHandle(CONTACTS_FILE, { create: true });
  return file;
}

async function loadContactsFile(): Promise<ContactsFileV2> {
  const root = getActiveHandle();
  if (!root) throw new Error("No active workspace");

  const file = await ensureContactsFile(root);

  try {
    const raw = await readJsonFile(file);
    if (!raw || typeof raw !== "object") {
      const empty: ContactsFileV3 = { version: 3, contacts: [] };
      await writeJsonFile(file, empty);
      return empty;
    }

    const v = raw as any;
    if (!Array.isArray(v.contacts)) {
      const empty: ContactsFileV3 = { version: 3, contacts: [] };
      await writeJsonFile(file, empty);
      return empty;
    }

    // Migration: v1 -> v2
    const version: number = typeof v.version === 'number' ? v.version : 1;

    const contacts: Contact[] = v.contacts
      .filter((c: any) => c && typeof c.id === 'string' && typeof c.alias === 'string')
      .map((c: any) => {
        const createdAt = typeof c.createdAt === 'number' ? c.createdAt : Date.now();
        const updatedAt = typeof c.updatedAt === 'number' ? c.updatedAt : createdAt;
        const state: ContactState = c.state === 'paused' || c.state === 'blocked' ? c.state : 'active';

        const nostrPubkey = typeof c.nostrPubkey === 'string' && /^[0-9a-f]{64}$/i.test(c.nostrPubkey)
          ? c.nostrPubkey.toLowerCase()
          : undefined;

        const dm = (() => {
          const d = c.dm;
          if (!d || typeof d !== 'object') return undefined;
          const sessionId = typeof (d as any).sessionId === 'string' ? (d as any).sessionId : '';
          const keyB64Url = typeof (d as any).keyB64Url === 'string' ? (d as any).keyB64Url : '';
          if (!sessionId || !keyB64Url) return undefined;
          return { sessionId, keyB64Url };
        })();

        return {
          id: c.id,
          alias: c.alias,
          state,
          nostrPubkey,
          dm,
          createdAt,
          updatedAt,
        } satisfies Contact;
      });

    const out: ContactsFileV3 = { version: 3, contacts };

    // If we loaded a v1 file, upgrade on disk once.
    if (version !== 3) {
      await writeJsonFile(file, out);
    }

    return out;
  } catch {
    const empty: ContactsFileV3 = { version: 3, contacts: [] };
    await writeJsonFile(file, empty);
    return empty;
  }
}

async function saveContactsFile(data: ContactsFileV3) {
  const root = getActiveHandle();
  if (!root) throw new Error("No active workspace");
  const file = await ensureContactsFile(root);
  await writeJsonFile(file, data);
}

export async function setContactDm(contactId: string, dm: { sessionId: string; keyB64Url: string }): Promise<void> {
  if (!dm?.sessionId || !dm?.keyB64Url) throw new Error('Invalid DM config');
  const data = await loadContactsFile();
  const c = data.contacts.find((x) => x.id === contactId);
  if (!c) throw new Error('Contact not found');
  c.dm = { sessionId: dm.sessionId, keyB64Url: dm.keyB64Url };
  c.updatedAt = Date.now();
  await saveContactsFile(data);
}

export async function setContactDmByNostrPubkey(nostrPubkey: string, dm: { sessionId: string; keyB64Url: string }): Promise<void> {
  const pk = nostrPubkey.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pk)) throw new Error('Invalid nostr pubkey');
  if (!dm?.sessionId || !dm?.keyB64Url) throw new Error('Invalid DM config');
  const data = await loadContactsFile();
  const c = data.contacts.find((x) => x.nostrPubkey === pk);
  if (!c) throw new Error('Contact not found');
  c.dm = { sessionId: dm.sessionId, keyB64Url: dm.keyB64Url };
  c.updatedAt = Date.now();
  await saveContactsFile(data);
}

export async function listContacts(): Promise<Contact[]> {
  const data = await loadContactsFile();
  return [...data.contacts].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addContact(alias: string): Promise<Contact> {
  const trimmed = alias.trim();
  if (!trimmed) throw new Error("Alias is required");

  const data = await loadContactsFile();
  const norm = trimmed.toLowerCase();
  const existing = data.contacts.find((c) => (c.alias || '').trim().toLowerCase() === norm);
  if (existing) {
    existing.updatedAt = Date.now();
    await saveContactsFile(data);
    return existing;
  }

  const now = Date.now();
  const contact: Contact = {
    id: crypto.randomUUID(),
    alias: trimmed,
    state: "active",
    nostrPubkey: undefined,
    createdAt: now,
    updatedAt: now,
  };

  data.contacts.push(contact);
  await saveContactsFile(data);
  return contact;
}

export async function addContactWithNostrPubkey(alias: string, nostrPubkey: string): Promise<Contact> {
  const trimmed = alias.trim();
  if (!trimmed) throw new Error('Alias is required');

  const pk = nostrPubkey.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pk)) throw new Error('Invalid nostr pubkey');

  const data = await loadContactsFile();
  const existing = data.contacts.find((c) => c.nostrPubkey === pk);
  if (existing) {
    existing.alias = trimmed;
    existing.state = existing.state === 'blocked' ? existing.state : 'active';
    existing.updatedAt = Date.now();
    await saveContactsFile(data);
    return existing;
  }

  // If we already have a local-only contact with the same alias, prefer binding the pubkey
  // instead of creating a duplicate entry.
  const norm = trimmed.toLowerCase();
  const aliasMatch = data.contacts.find((c) => (c.alias || '').trim().toLowerCase() === norm);
  if (aliasMatch && !aliasMatch.nostrPubkey) {
    aliasMatch.nostrPubkey = pk;
    aliasMatch.state = aliasMatch.state === 'blocked' ? aliasMatch.state : 'active';
    aliasMatch.updatedAt = Date.now();
    await saveContactsFile(data);
    return aliasMatch;
  }

  // If the alias is already used by a different pubkey, disambiguate the display name.
  const aliasAlreadyUsedByOtherPk =
    !!aliasMatch && !!aliasMatch.nostrPubkey && aliasMatch.nostrPubkey !== pk;
  const finalAlias = aliasAlreadyUsedByOtherPk ? `${trimmed} (${pk.slice(0, 8)}…)` : trimmed;

  const now = Date.now();
  const contact: Contact = {
    id: crypto.randomUUID(),
    alias: finalAlias,
    state: 'active',
    nostrPubkey: pk,
    createdAt: now,
    updatedAt: now,
  };
  data.contacts.push(contact);
  await saveContactsFile(data);
  return contact;
}

export async function findContactByNostrPubkey(nostrPubkey: string): Promise<Contact | null> {
  const pk = nostrPubkey.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pk)) return null;
  const data = await loadContactsFile();
  return data.contacts.find((c) => c.nostrPubkey === pk) || null;
}

export async function bindContactToNostrPubkey(contactId: string, nostrPubkey: string): Promise<void> {
  const pk = nostrPubkey.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pk)) throw new Error('Invalid nostr pubkey');

  const data = await loadContactsFile();

  const existing = data.contacts.find((c) => c.nostrPubkey === pk);
  if (existing && existing.id !== contactId) {
    throw new Error('That pubkey is already linked to another contact');
  }

  const c = data.contacts.find((x) => x.id === contactId);
  if (!c) throw new Error('Contact not found');
  c.nostrPubkey = pk;
  c.updatedAt = Date.now();
  await saveContactsFile(data);
}

export async function renameContact(id: string, alias: string): Promise<void> {
  const trimmed = alias.trim();
  if (!trimmed) throw new Error("Alias is required");

  const data = await loadContactsFile();
  const c = data.contacts.find((x) => x.id === id);
  if (!c) throw new Error("Contact not found");
  c.alias = trimmed;
  c.updatedAt = Date.now();
  await saveContactsFile(data);
}

export async function setContactState(id: string, state: ContactState): Promise<void> {
  const data = await loadContactsFile();
  const c = data.contacts.find((x) => x.id === id);
  if (!c) throw new Error("Contact not found");
  c.state = state;
  c.updatedAt = Date.now();
  await saveContactsFile(data);
}

export async function removeContact(id: string): Promise<void> {
  const data = await loadContactsFile();
  const next = data.contacts.filter((x) => x.id !== id);
  data.contacts = next;
  await saveContactsFile(data);
}

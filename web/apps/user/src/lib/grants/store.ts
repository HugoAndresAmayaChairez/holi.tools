import { getActiveHandle } from '../workspace';

export type ProjectGrant = {
  projectId: string;
  allowedNostrPubkeys: string[];
  autoAdmit: boolean;
  createdAt: number;
  updatedAt: number;
};

type GrantsFileV1 = {
  version: 1;
  grants: ProjectGrant[];
};

const HOLI_DIR = '.holi';
const GRANTS_FILE = 'grants.json';

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

async function ensureGrantsFile(root: FileSystemDirectoryHandle) {
  const holiDir = await root.getDirectoryHandle(HOLI_DIR, { create: true });
  return await holiDir.getFileHandle(GRANTS_FILE, { create: true });
}

function normalizePubkey(pk: string): string {
  return pk.trim().toLowerCase();
}

function isValidPubkey(pk: string): boolean {
  return /^[0-9a-f]{64}$/.test(pk);
}

async function loadGrantsFile(): Promise<GrantsFileV1> {
  const root = getActiveHandle();
  if (!root) throw new Error('No active workspace');

  const file = await ensureGrantsFile(root);

  try {
    const raw = await readJsonFile(file);
    if (!raw || typeof raw !== 'object') {
      const empty: GrantsFileV1 = { version: 1, grants: [] };
      await writeJsonFile(file, empty);
      return empty;
    }

    const v = raw as any;
    if (v.version !== 1 || !Array.isArray(v.grants)) {
      const empty: GrantsFileV1 = { version: 1, grants: [] };
      await writeJsonFile(file, empty);
      return empty;
    }

    const grants: ProjectGrant[] = v.grants
      .filter((g: any) => g && typeof g.projectId === 'string')
      .map((g: any) => {
        const createdAt = typeof g.createdAt === 'number' ? g.createdAt : Date.now();
        const updatedAt = typeof g.updatedAt === 'number' ? g.updatedAt : createdAt;
        const autoAdmit = g.autoAdmit === true;

        const allowedNostrPubkeys = Array.isArray(g.allowedNostrPubkeys)
          ? g.allowedNostrPubkeys
            .filter((x: any) => typeof x === 'string')
            .map((x: string) => normalizePubkey(x))
            .filter((x: string) => isValidPubkey(x))
          : [];

        return {
          projectId: g.projectId,
          allowedNostrPubkeys: Array.from(new Set(allowedNostrPubkeys)),
          autoAdmit,
          createdAt,
          updatedAt,
        } satisfies ProjectGrant;
      });

    return { version: 1, grants };
  } catch {
    const empty: GrantsFileV1 = { version: 1, grants: [] };
    await writeJsonFile(file, empty);
    return empty;
  }
}

async function saveGrantsFile(data: GrantsFileV1) {
  const root = getActiveHandle();
  if (!root) throw new Error('No active workspace');
  const file = await ensureGrantsFile(root);
  await writeJsonFile(file, data);
}

function ensureProjectGrant(data: GrantsFileV1, projectId: string): ProjectGrant {
  const existing = data.grants.find((g) => g.projectId === projectId);
  if (existing) return existing;

  const now = Date.now();
  const grant: ProjectGrant = {
    projectId,
    allowedNostrPubkeys: [],
    autoAdmit: false,
    createdAt: now,
    updatedAt: now,
  };

  data.grants.push(grant);
  return grant;
}

export async function getProjectGrant(projectId: string): Promise<ProjectGrant> {
  const data = await loadGrantsFile();
  const existing = data.grants.find((g) => g.projectId === projectId);
  if (existing) return existing;

  const grant = ensureProjectGrant(data, projectId);
  await saveGrantsFile(data);
  return grant;
}

export async function allowNostrPubkeyForProject(projectId: string, nostrPubkey: string): Promise<void> {
  const pk = normalizePubkey(nostrPubkey);
  if (!isValidPubkey(pk)) throw new Error('Invalid nostr pubkey');

  const data = await loadGrantsFile();
  const grant = ensureProjectGrant(data, projectId);

  if (!grant.allowedNostrPubkeys.includes(pk)) {
    grant.allowedNostrPubkeys.push(pk);
    grant.updatedAt = Date.now();
    // Ensure uniqueness
    grant.allowedNostrPubkeys = Array.from(new Set(grant.allowedNostrPubkeys));
    await saveGrantsFile(data);
  }
}

export async function removeNostrPubkeyForProject(projectId: string, nostrPubkey: string): Promise<void> {
  const pk = normalizePubkey(nostrPubkey);
  if (!isValidPubkey(pk)) return;

  const data = await loadGrantsFile();
  const grant = ensureProjectGrant(data, projectId);

  const initialLen = grant.allowedNostrPubkeys.length;
  grant.allowedNostrPubkeys = grant.allowedNostrPubkeys.filter((k) => k !== pk);

  if (grant.allowedNostrPubkeys.length !== initialLen) {
    grant.updatedAt = Date.now();
    await saveGrantsFile(data);
  }
}


export async function setAutoAdmitForProject(projectId: string, autoAdmit: boolean): Promise<void> {
  const data = await loadGrantsFile();
  const grant = ensureProjectGrant(data, projectId);
  grant.autoAdmit = !!autoAdmit;
  grant.updatedAt = Date.now();
  await saveGrantsFile(data);
}

export async function isPubkeyAllowedForProject(projectId: string, nostrPubkey: string): Promise<boolean> {
  const pk = normalizePubkey(nostrPubkey);
  if (!isValidPubkey(pk)) return false;
  const grant = await getProjectGrant(projectId);
  return grant.allowedNostrPubkeys.includes(pk);
}

export async function shouldAutoAdmit(projectId: string, nostrPubkey: string): Promise<boolean> {
  const pk = normalizePubkey(nostrPubkey);
  if (!isValidPubkey(pk)) return false;
  const grant = await getProjectGrant(projectId);
  if (!grant.autoAdmit) return false;
  return grant.allowedNostrPubkeys.includes(pk);
}

export async function removeProjectGrant(projectId: string): Promise<void> {
  const data = await loadGrantsFile();
  const before = data.grants.length;
  data.grants = data.grants.filter((g) => g.projectId !== projectId);
  if (data.grants.length !== before) {
    await saveGrantsFile(data);
  }
}

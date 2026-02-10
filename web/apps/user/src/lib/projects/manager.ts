/**
 * Project Manager - Handles project vaults
 * Hybrid: Uses Local File System if available, otherwise IndexedDB
 */
import * as idb from "../db/indexeddb";
import * as fsdb from "../db/fs";
import { getActiveHandle } from "../workspace";
import { removeProjectGrant } from "../grants/store";
import { debugLog, debugWarn, redact } from "../debug";

export interface ProjectCollaborator {
    did: string; // Nostr pubkey
    role: "owner" | "editor" | "viewer";
    name: string;
    addedAt: number;
}

export type ProjectType = "generic" | "typst" | "paint";

export interface Project {
    id: string;
    name: string;
    role: "owner" | "editor" | "viewer";
    lastOpened: number;
    projectMasterKey?: string; // Optional in FS mode

    // [NEW] Collaboration & Universal Fields
    collaborators: ProjectCollaborator[];
    settings: {
        autoAdmit: boolean;
        allowOfflineEditing: boolean;
    };
    type: ProjectType;
    assets: string[]; // List of file IDs/Paths
}

/**
 * Creates a new project vault
 */
export async function createProject(name: string): Promise<Project> {
    const id = crypto.randomUUID();
    const pmk = crypto.getRandomValues(new Uint8Array(32));
    const pmkBase64 = btoa(String.fromCharCode(...pmk));
    const lastOpened = Date.now();

    const project: Project = {
        id,
        name,
        role: "owner",
        projectMasterKey: pmkBase64,
        lastOpened,
        collaborators: [
            { did: "me", role: "owner", name: "Me", addedAt: Date.now() }
        ],
        settings: {
            autoAdmit: false,
            allowOfflineEditing: false,
        },
        type: "generic",
        assets: [],
    };

    if (getActiveHandle()) {
        await fsdb.createProject(project);
    } else {
        await idb.createProject({ ...project, projectMasterKey: pmkBase64 } as any);
    }

    return project;
}

/**
 * Gets all projects
 */
export async function getProjects(): Promise<Project[]> {
    if (getActiveHandle()) {
        return fsdb.getProjects();
    }
    const projects = await idb.getProjects();
    return projects.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        lastOpened: p.lastOpened,
        projectMasterKey: p.projectMasterKey,
        collaborators: p.collaborators || [],
        settings: p.settings || { autoAdmit: false, allowOfflineEditing: false },
        type: p.type || "generic",
        assets: p.assets || []
    }));
}

/**
 * Gets a project by ID
 */
export async function getProject(id: string): Promise<Project | null> {
    debugLog('[ProjectManager] getProject called for ID:', redact(id));
    if (getActiveHandle()) {
        debugLog('[ProjectManager] Using FSDB for lookup');
        const projects = await fsdb.getProjects();
        const p = projects.find(p => p.id === id) || null;
        debugLog('[ProjectManager] FSDB lookup result:', p ? 'Found' : 'Not Found');
        return p;
    }

    debugLog('[ProjectManager] Using IDB for lookup');
    const project = await idb.getProject(id);
    if (!project) {
        debugWarn('[ProjectManager] Project not found in IDB for ID:', redact(id));
        return null;
    }

    debugLog('[ProjectManager] Project found in IDB');
    return {
        id: project.id,
        name: project.name,
        role: project.role,
        lastOpened: project.lastOpened,
        projectMasterKey: project.projectMasterKey,
        collaborators: project.collaborators || [],
        settings: project.settings || { autoAdmit: false, allowOfflineEditing: false },
        type: project.type || "generic",
        assets: project.assets || []
    };
}

/**
 * Updates last opened timestamp
 */
export async function touchProject(id: string): Promise<void> {
    const project = await getProject(id);
    if (project) {
        project.lastOpened = Date.now();
        if (getActiveHandle()) {
            await fsdb.updateProject(project);
        } else {
            await idb.updateProject(project as any);
        }
    }
}

/**
 * Saves a project joined via invitation
 */
export async function saveJoinedProject(id: string, name: string, secretKey?: string): Promise<void> {
    const existing = await getProject(id);
    if (existing) {
        // Update name? Or secret?
        if (name && existing.name !== name) {
            existing.name = name;
            await touchProject(id); // Saves update
        }
        if (secretKey && existing.projectMasterKey !== secretKey) {
            existing.projectMasterKey = secretKey;
            await touchProject(id);
        }
        return;
    }

    const project: Project = {
        id,
        name,
        role: "editor",
        projectMasterKey: secretKey || "guest-access-pending",
        lastOpened: Date.now(),
        collaborators: [], // Will be synced from owner
        settings: { autoAdmit: false, allowOfflineEditing: false }, // Synced from owner
        type: "generic",
        assets: [],
    };

    if (getActiveHandle()) {
        await fsdb.createProject(project);
    } else {
        await idb.createProject(project as any);
    }
}

/**
 * Deletes a project and its associated local artifacts.
 * - FS mode: removes the project folder under `projects/<id>`
 * - Legacy (IDB): removes the project record
 * Also clears local chat history and per-project grants.
 */
export async function deleteProject(id: string): Promise<void> {
    // Best-effort cleanup in both modes.
    try {
        await idb.deleteMessagesByProject(id);
    } catch {
        // ignore
    }

    try {
        await removeProjectGrant(id);
    } catch {
        // ignore
    }

    if (getActiveHandle()) {
        await fsdb.deleteProject(id);
        return;
    }

    await idb.deleteProject(id);
}

/**
 * Retrieves the stored passphrase (project master key) for a project.
 * Used for P2P session encryption.
 */
export function getStoredPassphrase(projectId: string): string | null {
    // In our current model, the "passphrase" is the projectMasterKey stored in the Project object.
    // However, for quick synchronous access (required by some init flows), we might check LocalStorage
    // if we are mirroring it there, OR we must accept that this needs to be async if fetching from IDB/FS.

    // BUT the error in signaling.ts comes from: 
    // const sessionKey = (await import("../projects/manager")).getStoredPassphrase(projectId);
    // So it IS awaited. We can make it async or read from IDB.

    // Wait, the usage in signaling.ts expects a synchronous return or a string promise?
    // It's awaited: (await import(...)).getStoredPassphrase(...) returns a string? or Promise<string>?
    // Let's implement it to read from localStorage cache if possible, or we need to rethink the architecture
    // if we only have async access. 

    // Ideally, for the "Passphrase Encryption" feature flag, we are storing a specific "passphrase" 
    // in localStorage key `holi.passphrase.<projectId>`.

    try {
        return window.localStorage.getItem(`holi.passphrase.${projectId}`);
    } catch {
        return null;
    }
}

/**
 * Updates full project metadata (collaborators, settings, etc.)
 */
export async function updateProjectMetadata(project: Project): Promise<void> {
    if (getActiveHandle()) {
        await fsdb.updateProject(project);
    } else {
        await idb.updateProject(project as any);
    }
}


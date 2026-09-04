/**
 * Project Manager - Handles project vaults
 * Hybrid: Uses Local File System if available, otherwise IndexedDB
 */
import * as idb from "../db/indexeddb";
import * as fsdb from "../db/fs";
import { getActiveHandle } from "../workspace";
import { debugLog, debugWarn, redact } from "../debug";

export interface Project {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  lastOpened: number;
  projectMasterKey?: string; // 32-byte project capability encoded as base64
}

function generateProjectMasterKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Creates a new project vault
 */
export async function createProject(name: string): Promise<Project> {
  const id = crypto.randomUUID();
  const pmkBase64 = generateProjectMasterKey();
  const lastOpened = Date.now();

  const project: Project = {
    id,
    name,
    role: "owner",
    projectMasterKey: pmkBase64,
    lastOpened,
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
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    lastOpened: p.lastOpened,
    projectMasterKey: p.projectMasterKey,
  }));
}

/**
 * Gets a project by ID
 */
export async function getProject(id: string): Promise<Project | null> {
  debugLog("[ProjectManager] getProject called for ID:", redact(id));
  if (getActiveHandle()) {
    debugLog("[ProjectManager] Using FSDB for lookup");
    const projects = await fsdb.getProjects();
    const p = projects.find((p) => p.id === id) || null;
    debugLog("[ProjectManager] FSDB lookup result:", p ? "Found" : "Not Found");
    return p;
  }

  debugLog("[ProjectManager] Using IDB for lookup");
  const project = await idb.getProject(id);
  if (!project) {
    debugWarn("[ProjectManager] Project not found in IDB for ID:", redact(id));
    return null;
  }

  debugLog("[ProjectManager] Project found in IDB");
  return {
    id: project.id,
    name: project.name,
    role: project.role,
    lastOpened: project.lastOpened,
    projectMasterKey: project.projectMasterKey,
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
export async function saveJoinedProject(
  id: string,
  name: string,
  secretKey?: string
): Promise<void> {
  const existing = await getProject(id);
  if (existing) {
    if (name) existing.name = name;
    if (secretKey) existing.projectMasterKey = secretKey;
    existing.lastOpened = Date.now();
    await updateProjectMetadata(existing);
    return;
  }

  const project: Project = {
    id,
    name,
    role: "editor",
    projectMasterKey: secretKey || "guest-access-pending",
    lastOpened: Date.now(),
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
 * Also clears local chat history.
 */
export async function deleteProject(id: string): Promise<void> {
  // Best-effort cleanup in both modes.
  try {
    await idb.deleteMessagesByProject(id);
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
 * Rotates the capability used by future project sessions and invitation links.
 * Existing live WebRTC sessions must still be closed by their participants.
 */
export async function rotateProjectKey(id: string): Promise<Project> {
  const project = await getProject(id);
  if (!project) throw new Error("Project not found");
  if (project.role !== "owner") {
    throw new Error("Only the project owner can rotate its access key");
  }

  project.projectMasterKey = generateProjectMasterKey();
  project.lastOpened = Date.now();
  await updateProjectMetadata(project);
  return project;
}

/**
 * Persists project metadata in the active storage backend.
 */
export async function updateProjectMetadata(project: Project): Promise<void> {
  if (getActiveHandle()) {
    await fsdb.updateProject(project);
  } else {
    await idb.updateProject(project as any);
  }
}

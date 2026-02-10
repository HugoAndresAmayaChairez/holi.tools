/**
 * File System Database Adapter
 * Interact with the user's local vault folder directly
 */
import { getActiveHandle } from '../workspace';
import type { Project } from '../projects/manager';

// Re-map Project interface if needed, or import common type
// For now, let's assume we store the same shape as JSON

export async function getProjects(): Promise<Project[]> {
    const root = getActiveHandle();
    if (!root) throw new Error("No active workspace");

    const projects: Project[] = [];

    try {
        const projectsDir = await root.getDirectoryHandle('projects');

        // Iterate project folders
        // @ts-ignore - async iterator
        for await (const [id, handle] of projectsDir.entries()) {
            if (handle.kind === 'directory') {
                try {
                    const dir = handle as FileSystemDirectoryHandle;
                    const fileHandle = await dir.getFileHandle('project.json');
                    const file = await fileHandle.getFile();
                    const text = await file.text();
                    const data = JSON.parse(text);
                    // Ensure ID matches folder name for sanity?
                    projects.push({ ...data, id });
                } catch (e) {
                    console.warn(`Skipping invalid project folder ${id}`, e);
                }
            }
        }
    } catch {
        // projects folder might not exist yet
    }

    return projects.sort((a, b) => b.lastOpened - a.lastOpened);
}

export async function createProject(project: Project): Promise<void> {
    const root = getActiveHandle();
    if (!root) throw new Error("No active workspace");

    const projectsDir = await root.getDirectoryHandle('projects', { create: true });
    const projectDir = await projectsDir.getDirectoryHandle(project.id, { create: true });

    // Save metadata
    const fileHandle = await projectDir.getFileHandle('project.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(project, null, 2));
    await writable.close();

    // Create subfolders
    await projectDir.getDirectoryHandle('files', { create: true });
    await projectDir.getDirectoryHandle('documents', { create: true });
}

export async function updateProject(project: Project): Promise<void> {
    // Same as create, just overwrite JSON
    await createProject(project);
}

export async function deleteProject(projectId: string): Promise<void> {
    const root = getActiveHandle();
    if (!root) throw new Error("No active workspace");

    const projectsDir = await root.getDirectoryHandle('projects');

    // File System Access API supports recursive delete.
    // If the folder doesn't exist, surface a helpful error.
    await projectsDir.removeEntry(projectId, { recursive: true });
}

// === File Operations ===

function sanitizeRelativePath(inputPath: string): string {
    const raw = (inputPath ?? '').toString();
    // Normalize Windows separators and strip leading slashes
    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');

    const parts = normalized
        .split('/')
        .map(p => p.trim())
        .filter(p => p.length > 0);

    // Disallow path traversal and reserved segments
    for (const part of parts) {
        if (part === '.' || part === '..') throw new Error('Invalid path segment');
        if (part.includes('\u0000')) throw new Error('Invalid path');
    }

    return parts.join('/');
}

async function getProjectFilesRoot(projectId: string): Promise<FileSystemDirectoryHandle> {
    const root = getActiveHandle();
    if (!root) throw new Error('No active workspace');

    const projectsDir = await root.getDirectoryHandle('projects');
    const projectDir = await projectsDir.getDirectoryHandle(projectId);
    return await projectDir.getDirectoryHandle('files', { create: true });
}

async function ensureDirPath(base: FileSystemDirectoryHandle, dirParts: string[]): Promise<FileSystemDirectoryHandle> {
    let current = base;
    for (const part of dirParts) {
        current = await current.getDirectoryHandle(part, { create: true });
    }
    return current;
}

async function listFilesRecursive(dir: FileSystemDirectoryHandle, prefix: string, out: string[]): Promise<void> {
    // @ts-ignore
    for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file') {
            out.push(prefix ? `${prefix}/${name}` : name);
        } else if (handle.kind === 'directory') {
            await listFilesRecursive(handle as FileSystemDirectoryHandle, prefix ? `${prefix}/${name}` : name, out);
        }
    }
}

export async function saveProjectFile(projectId: string, file: File | Blob, filename: string): Promise<void> {
    const safePath = sanitizeRelativePath(filename);
    const filesDir = await getProjectFilesRoot(projectId);

    const parts = safePath.split('/');
    const leaf = parts.pop();
    if (!leaf) throw new Error('Invalid filename');
    const parentDir = await ensureDirPath(filesDir, parts);

    const fileHandle = await parentDir.getFileHandle(leaf, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
}

export async function listProjectFiles(projectId: string): Promise<string[]> {
    const files: string[] = [];
    try {
        const filesDir = await getProjectFilesRoot(projectId);
        await listFilesRecursive(filesDir, '', files);
    } catch { }

    return files.sort((a, b) => a.localeCompare(b));
}

export async function readProjectFile(projectId: string, filename: string): Promise<Blob> {
    const safePath = sanitizeRelativePath(filename);
    const filesDir = await getProjectFilesRoot(projectId);

    const parts = safePath.split('/');
    const leaf = parts.pop();
    if (!leaf) throw new Error('Invalid filename');
    const parentDir = await ensureDirPath(filesDir, parts);
    const fileHandle = await parentDir.getFileHandle(leaf);
    const file = await fileHandle.getFile();
    return file;
}

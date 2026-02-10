import { getProject, updateProjectMetadata, type Project, type ProjectCollaborator } from './manager';
import { allowNostrPubkeyForProject, removeNostrPubkeyForProject } from '../grants/store';

/**
 * Adds a new collaborator to the project
 */
export async function addCollaborator(projectId: string, collaborator: ProjectCollaborator): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");

    // Check if already exists
    if (project.collaborators.some(c => c.did === collaborator.did)) {
        return; // Already added
    }

    project.collaborators.push(collaborator);

    // Update Grants (Allow P2P/Nostr access)
    await allowNostrPubkeyForProject(projectId, collaborator.did);

    await updateProjectMetadata(project);
}

/**
 * Removes a collaborator from the project
 */
export async function removeCollaborator(projectId: string, pubkey: string): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");

    project.collaborators = project.collaborators.filter(c => c.did !== pubkey);

    // Revoke Grant
    await removeNostrPubkeyForProject(projectId, pubkey);

    await updateProjectMetadata(project);
}

/**
 * Updates a collaborator's role
 */
export async function updateCollaboratorRole(projectId: string, pubkey: string, newRole: "owner" | "editor" | "viewer"): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");

    const collaborator = project.collaborators.find(c => c.did === pubkey);
    if (!collaborator) throw new Error("Collaborator not found");

    collaborator.role = newRole;
    await updateProjectMetadata(project);
}

/**
 * Updates project settings
 */
export async function updateProjectSettings(projectId: string, settings: Partial<Project['settings']>): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");

    project.settings = {
        ...project.settings,
        ...settings
    };

    await updateProjectMetadata(project);
}

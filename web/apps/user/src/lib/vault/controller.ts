import {
    saveJoinedProject,
    getProject,
    touchProject,
    type Project,
} from "../projects/manager";
import { TrysteroVaultManager } from "../p2p/trystero-vault";
import { saveMessage, getMessages } from "../db/indexeddb";
import * as fsdb from "../db/fs";
import { getLastVault, restoreSession, checkAccess, getActiveHandle } from "../workspace";
import { getPrimaryIdentity } from "../identity/manager";
import { debugLog, debugWarn, redact } from "../debug";

export class VaultController {
    private vaultManager: TrysteroVaultManager | null = null;
    private currentProject: Project | null = null;
    private ephemeralMode = false;
    private projectId: string | null = null;
    private urlSecret: string | null = null;
    private peerIdentities = new Map<string, { alias: string, avatar: string | null }>();

    private lastLocalManifest: { files: Array<{ path: string; size: number; type?: string; lastModified?: number }>; generatedAt: number } | null = null;
    private peerManifests = new Map<string, { files: Array<{ path: string; size: number; type?: string; lastModified?: number }>; generatedAt: number }>();

    constructor() {
        const { id, secret } = this.parseHash();
        this.projectId = id;
        this.urlSecret = secret;
    }

    private parseHash() {
        const hash = window.location.hash.slice(1).split("?")[0];
        if (!hash) return { id: null, secret: null };
        const parts = hash.split(".");
        if (parts.length === 2) {
            return { id: parts[0], secret: parts[1] };
        }
        return { id: hash, secret: null };
    }

    public async init() {
        debugLog("[Vault] Controller init started", { projectId: redact(this.projectId) });
        if (!this.projectId) {
            debugWarn('[Vault] No projectId found in hash, redirecting to /');
            window.location.href = "/";
            return;
        }

        // Provide a stable project id for embedded components (e.g. StoragePanel)
        // since the URL hash may include a secret: /vault#<projectId>.<secret>
        (window as any).__holiActiveProjectId = this.projectId;

        try {
            // 1. Try restore session first
            const last = await getLastVault();
            if (last) {
                debugLog("[Vault] Found last vault session", { id: redact(last.id) });
                const status = await checkAccess(last.id);
                if (status === "granted") {
                    debugLog("[Vault] Silent restore possible");
                    await restoreSession(last.id);
                } else {
                    debugWarn('[Vault] Vault access required. Status:', status);
                }
            }

            debugLog("[Vault] Initial load attempt");
            const success = await this.loadProjectData();

            if (!success && last) {
                // If not found, and we have a vault that isn't granted, it might be in there.
                const status = await checkAccess(last.id);
                if (status !== "granted") {
                    debugLog('[Vault] Project not found in IDB, showing Locked Overlay');
                    this.showLockedOverlay();
                } else {
                    // Even with vault restored, not found. Redirect.
                    debugWarn('[Vault] Project not found even with restored vault');
                    window.location.href = "/";
                }
            } else if (!success) {
                debugWarn('[Vault] Project not found (no vault session). Redirecting');
                window.location.href = "/";
            } else {
                // Load rest
                debugLog("[Vault] Loading history");
                await this.loadHistory();
                debugLog("[Vault] Binding UI");
                this.bindUI();
                debugLog("[Vault] Init complete");
            }
        } catch (err) {
            debugWarn('[Vault] Init failed:', err);
        }
    }

    private showLockedOverlay() {
        const overlay = document.getElementById("locked-overlay");
        const unlockBtn = document.getElementById("unlock-btn");
        if (overlay) overlay.classList.remove("hidden");
        if (unlockBtn) {
            unlockBtn.onclick = async () => {
                const last = await getLastVault();
                if (last) {
                    const ok = await restoreSession(last.id);
                    if (ok) {
                        overlay?.classList.add("hidden");
                        this.init(); // Retry init
                    } else {
                        alert("Access denied. Please open the folder from the dashboard.");
                        window.location.href = "/";
                    }
                }
            };
        }
    }

    private async loadProjectData(): Promise<boolean> {
        if (!this.projectId) return false;

        // 1. Try Load
        debugLog("[Vault] Fetching project from manager", { projectId: redact(this.projectId) });
        let project = await getProject(this.projectId);
        debugLog("[Vault] Project result", { found: Boolean(project) });

        // 2. Ephemeral / New Join Case
        if (!project && this.urlSecret) {
            debugLog("[Vault] Joining new project ephemerally");
            this.ephemeralMode = true;
            project = {
                id: this.projectId,
                name: "Loading Project...",
                role: "viewer",
                projectMasterKey: this.urlSecret,
                lastOpened: Date.now(),
                // New Universal Project fields
                collaborators: [],
                settings: { autoAdmit: false, allowOfflineEditing: false },
                type: "generic",
                assets: [],
            };
        } else if (!project) {
            return false;
        }

        debugLog('[Vault] Project data loaded successfully');

        // 3. Update State & UI
        this.currentProject = project!;
        this.updateProjectUI(project!);

        // Update Last Opened
        await touchProject(this.projectId);

        // 4. Start Connection
        if (
            project!.projectMasterKey &&
            project!.projectMasterKey !== "guest-access-pending"
        ) {
            this.initVaultConnection(project!.id, project!.projectMasterKey);
        }

        return true;
    }

    private updateProjectUI(project: Project) {
        const nameEl = document.getElementById("project-name");
        if (nameEl) nameEl.textContent = project.name;

        // Render Invite/Instant Link UI
        this.renderInviteUI();
    }

    private updatePeersList(count: number) {
        const el = document.getElementById("peers-list");
        if (el) {
            // Future: Show actual avatars using this.peerIdentities
            el.innerHTML = count > 0
                ? `<div class="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg"><div class="w-2 h-2 bg-green-500 rounded-full"></div><span class="text-green-400 text-sm">${count} Peer(s) Connected</span></div>`
                : `<p>No peers.</p>`;
        }
    }

    private appendChatMessage(text: string, sender: 'own' | 'peer' | 'system', senderId?: string) {
        let colorStyle = "";
        let senderName = "";
        let avatarUrl = "";

        if (sender === 'peer' && senderId) {
            const identity = this.peerIdentities.get(senderId);
            if (identity) {
                senderName = identity.alias;
                if (identity.avatar) {
                    // Base64 to URL? It comes as Data URL usually if we do readAsDataURL
                    avatarUrl = identity.avatar;
                }
            }

            // Fallback if no identity or to generate color
            if (!senderName) senderName = senderId.slice(0, 6);

            // Simple hash for color (always used for border/fallback)
            let hash = 0;
            for (let i = 0; i < senderId.length; i++) {
                hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00ffffff).toString(16).toUpperCase();
            const hex = "00000".substring(0, 6 - c.length) + c;
            colorStyle = `#${hex}`;
        }

        if ((window as any).addChatMessage) {
            (window as any).addChatMessage(text, sender, colorStyle, senderName, avatarUrl);
        }
    }

    private escapeHtml(input: string): string {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private renderInviteUI() {
        if (!this.currentProject?.projectMasterKey) return;

        // [New] Only show for owners
        if (this.currentProject.role !== 'owner') {
            const button = document.getElementById("instant-link-btn") as HTMLButtonElement | null;
            if (button) {
                button.disabled = true;
                button.classList.add("opacity-60");
                button.textContent = "Instant Link (Owner Only)";
            }
            return;
        }

        const button = document.getElementById("instant-link-btn") as HTMLButtonElement | null;
        if (!button) return;

        button.disabled = false;
        button.classList.remove("opacity-60");
        button.textContent = "Copy Instant Link (Owner)";
        button.onclick = async () => {
            const link = `${window.location.origin}/vault#${this.currentProject!.id}.${this.currentProject!.projectMasterKey}`;
            await navigator.clipboard.writeText(link);
            const prev = button.textContent;
            button.textContent = "Copied!";
            setTimeout(() => (button.textContent = prev || "Copy Instant Link"), 2000);
        };
    }

    private async broadcastIdentity() {
        if (!this.vaultManager) return;
        const identity = await getPrimaryIdentity();
        if (identity) {
            let avatarBase64: string | null = null;
            if (identity.avatar) {
                avatarBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(identity.avatar as Blob);
                });
            }
            this.vaultManager.sendIdentity(identity.alias || "Anonymous", avatarBase64);
        }
    }

    private async initVaultConnection(projectId: string, secretKey: string) {
        if (this.vaultManager) return;

        this.vaultManager = new TrysteroVaultManager(projectId);

        this.vaultManager.setListeners({
            onStateChange: (state) => {
                const dot = document.getElementById("status-dot");
                const status = document.getElementById("chat-status");

                if (dot) dot.className = `w-2.5 h-2.5 rounded-full ${state === 'connected' ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`;
                if (status) status.textContent = state === 'connected' ? "P2P Connected" : "Connecting...";

                // If connected, show chat (even if 0 peers)
                if (state === 'connected') {
                    document.getElementById("chat-container")?.classList.remove("hidden");
                    this.updatePeersList(this.vaultManager?.getPeerCount() || 0);

                    // Broadcast Identity on Connect
                    this.broadcastIdentity();

                    // Sync Protocol
                    if (this.ephemeralMode || this.currentProject?.name === "Loading Project...") {
                        setTimeout(() => this.vaultManager?.requestMetadata(), 500);
                    }
                }
            },
            onPeerJoin: (peerId) => {
                this.updatePeersList(this.vaultManager?.getPeerCount() || 0);
                this.appendChatMessage(`${peerId.slice(0, 8)} joined`, 'system');
                // Broadcast Identity to new peer
                this.broadcastIdentity();

                // Share our manifest so late-joiners can request missing files.
                void this.publishManifest(peerId);
            },
            onPeerLeave: (peerId) => {
                this.updatePeersList(this.vaultManager?.getPeerCount() || 0);
                this.appendChatMessage(`${peerId.slice(0, 8)} left`, 'system');
                this.peerIdentities.delete(peerId);
                this.peerManifests.delete(peerId);
            },
            onIdentity: (identity, peerId) => {
                debugLog('[Vault] Identity received', {
                    peerId: redact(peerId),
                    hasAlias: Boolean((identity as any)?.alias),
                    hasAvatar: Boolean((identity as any)?.avatar),
                });
                this.peerIdentities.set(peerId, identity);
                // Optionally update past messages or just future ones? 
                // For now, future ones. But let's trigger a UI refresh of peer list if we were showing avatars there.
                this.appendChatMessage(`Verified as ${identity.alias}`, 'system');
            },
            onMessage: (msg) => {
                const sender = (msg as any)?.senderId === 'me' ? 'own' : 'peer';

                // Trystero file sends emit a local "file-start" message; peers may also send
                // structured messages. Normalize to a user-visible string.
                const type = (msg as any)?.type;
                const content = (msg as any)?.content;

                if (typeof content === 'string') {
                    this.appendChatMessage(content, sender, (msg as any)?.senderId);
                    return;
                }

                if (type === 'file-start' && typeof (msg as any)?.filename === 'string') {
                    this.appendChatMessage(`Sending ${(msg as any).filename}...`, sender, (msg as any)?.senderId);
                    return;
                }

                // Fallback: avoid crashing UI on unexpected payloads
                this.appendChatMessage(`[${type || 'message'}]`, 'system');
            },
            onFileProgress: (progress, meta) => {
                if ((window as any).showFileProgress) {
                    const name = (meta as any)?.name || 'file';
                    (window as any).showFileProgress(progress, name);
                }
            },
            onFileReceived: async (fileId, meta, blob) => {
                const safeMeta = (meta && typeof meta === 'object') ? (meta as any) : {};
                const name = typeof safeMeta.name === 'string' && safeMeta.name ? safeMeta.name : `file-${fileId}`;
                const size = typeof safeMeta.size === 'number' ? safeMeta.size : (blob instanceof Blob ? blob.size : 0);
                const displayName = (typeof name === 'string' && name.includes('/')) ? (name.split('/').pop() || name) : name;
                const safeNameHtml = this.escapeHtml(displayName);

                // Respect sender paths when provided; otherwise default to chat/.
                const storedPath = (typeof name === 'string' && (name.startsWith('chat/') || name.startsWith('project/') || name.includes('/')))
                    ? name
                    : `chat/${name}`;

                // Trystero strategies may deliver ArrayBuffer/Uint8Array depending on transport.
                const blobAny = blob as unknown;
                const safeBlob = blobAny instanceof Blob
                    ? blobAny
                    : (blobAny instanceof ArrayBuffer
                        ? new Blob([blobAny])
                        : (blobAny instanceof Uint8Array
                            ? (() => {
                                const u8 = blobAny as Uint8Array;
                                const copy = new Uint8Array(u8.byteLength);
                                copy.set(u8);
                                return new Blob([copy]);
                            })()
                            : new Blob([])));

                // Prefer saving into the user's local vault folder (if opened).
                // If no workspace is active, we can only keep the blob in-memory and offer a download link.
                try {
                    if (this.projectId) {
                        await fsdb.saveProjectFile(this.projectId, safeBlob, storedPath);
                        (window as any).refreshStorageFiles?.();

                                                const pid = this.projectId;
                                                const rootFolder = storedPath.startsWith('project/') ? 'project' : 'chat';
                                                const kb = Math.round(size / 1024);
                                                const html = `
                                                    <div class="flex flex-col gap-1">
                                                        <div class="text-zinc-300">
                                                            Received <span class="font-medium">${safeNameHtml}</span> (${kb}KB) — saved to vault
                                                        </div>
                                                        <div class="flex items-center gap-3 text-sm">
                                                            <button type="button" data-holi-action="preview-file" data-project-id="${this.escapeHtml(pid)}" data-file-path="${this.escapeHtml(storedPath)}" class="text-purple-400 hover:underline">Preview</button>
                                                            <button type="button" data-holi-action="show-files" data-folder="${this.escapeHtml(rootFolder)}" class="text-purple-400 hover:underline">Show in Project Files</button>
                                                        </div>
                                                    </div>
                                                `.trim();
                                                this.appendChatMessage(html, 'system');
                        return;
                    }
                } catch (e) {
                    debugWarn('[Vault] Failed to save received file to vault', e);
                }

                const url = URL.createObjectURL(safeBlob);
                const linkId = `dl-${fileId}`;
                const link = `<a id="${linkId}" href="${url}" download="${safeNameHtml}" class="text-purple-400 hover:underline flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download ${safeNameHtml} (${Math.round(size / 1024)}KB)
                </a>`;
                this.appendChatMessage(link, 'system');

                // Cleanup object URL after the user clicks (or after a timeout).
                setTimeout(() => {
                    const el = document.getElementById(linkId);
                    if (el) {
                        el.addEventListener('click', () => {
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }, { once: true });
                    }
                    // Safety net: don't hold blobs forever
                    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
                }, 0);
            },
            onMetadata: async (meta) => {
                debugLog('[Vault] Metadata Received', { hasName: Boolean((meta as any)?.name) });
                const nameEl = document.getElementById("project-name");
                if (nameEl) nameEl.textContent = meta.name;

                // PERSISTENCE MOMENT
                if (this.ephemeralMode || this.currentProject?.name !== meta.name) {
                    debugLog('[Vault] Persisting synced project data...');
                    await saveJoinedProject(projectId, meta.name, secretKey);
                    this.ephemeralMode = false;
                    if (this.currentProject) this.currentProject.name = meta.name;
                    this.appendChatMessage(`Project verified: ${meta.name}`, 'system');
                }
            },
            onMetadataRequest: (_peerId) => {
                const name = document.getElementById("project-name")?.textContent;
                if (name && name !== "Loading Project...") {
                    this.vaultManager?.sendMetadata(name);
                }
            },

            onManifest: (manifest, peerId) => {
                try {
                    const files = (manifest && typeof manifest === 'object' && Array.isArray((manifest as any).files))
                        ? ((manifest as any).files as any[])
                              .filter((f) => f && typeof f === 'object' && typeof (f as any).path === 'string')
                              .map((f) => ({
                                  path: String((f as any).path),
                                  size: Number((f as any).size) || 0,
                                  type: typeof (f as any).type === 'string' ? (f as any).type : undefined,
                                  lastModified: typeof (f as any).lastModified === 'number' ? (f as any).lastModified : undefined,
                              }))
                        : [];

                    this.peerManifests.set(peerId, {
                        files,
                        generatedAt: typeof (manifest as any)?.generatedAt === 'number' ? (manifest as any).generatedAt : Date.now(),
                    });

                    void this.maybeAnnounceMissingFiles();
                } catch (e) {
                    debugWarn('[Vault] Failed to process manifest', e);
                }
            },

            onFileRequest: (paths, peerId) => {
                void this.handleFileRequest(paths, peerId);
            },
        });

        await this.vaultManager.join(secretKey);

        // Broadcast our manifest after joining (for already-present peers).
        void this.publishManifest();
    }

    private async buildLocalManifest() {
        if (!this.projectId) return { files: [], generatedAt: Date.now() };
        if (!getActiveHandle()) return { files: [], generatedAt: Date.now() };

        const paths = await fsdb.listProjectFiles(this.projectId);
        const files: Array<{ path: string; size: number; type?: string; lastModified?: number }> = [];

        for (const path of paths) {
            try {
                const blob = await fsdb.readProjectFile(this.projectId, path);
                const f = blob as File;
                files.push({
                    path,
                    size: blob.size,
                    type: blob.type || undefined,
                    lastModified: typeof (f as any).lastModified === 'number' ? (f as any).lastModified : undefined,
                });
            } catch {
                // ignore
            }
        }

        return { files, generatedAt: Date.now() };
    }

    private async publishManifest(targetPeerId?: string) {
        if (!this.vaultManager || !this.projectId) return;
        const manifest = await this.buildLocalManifest();
        this.lastLocalManifest = manifest;
        this.vaultManager.sendManifest({ projectId: this.projectId, ...manifest }, targetPeerId);
    }

    private async computeMissingPlan(): Promise<{ requestsByPeer: Map<string, string[]>; missingCount: number }> {
        const requestsByPeer = new Map<string, string[]>();
        if (!this.projectId) return { requestsByPeer, missingCount: 0 };

        const local = this.lastLocalManifest ?? (await this.buildLocalManifest());
        this.lastLocalManifest = local;
        const localMap = new Map<string, number>();
        for (const f of local.files) localMap.set(f.path, f.size);

        const availability = new Map<string, string>();
        for (const [peerId, m] of this.peerManifests.entries()) {
            for (const f of m.files) {
                if (!availability.has(f.path)) availability.set(f.path, peerId);
            }
        }

        let missingCount = 0;
        for (const [path, peerId] of availability.entries()) {
            const localSize = localMap.get(path);
            const peerSize = this.peerManifests.get(peerId)?.files.find((x) => x.path === path)?.size;
            const isMissing = localSize == null;
            const sizeMismatch = localSize != null && peerSize != null && localSize !== peerSize;
            if (!isMissing && !sizeMismatch) continue;

            missingCount++;
            const arr = requestsByPeer.get(peerId) ?? [];
            arr.push(path);
            requestsByPeer.set(peerId, arr);
        }

        return { requestsByPeer, missingCount };
    }

    private async maybeAnnounceMissingFiles() {
        const { missingCount } = await this.computeMissingPlan();
        if (missingCount <= 0) return;

        const html = `
            <div class="flex items-center justify-between gap-3">
                <div class="text-zinc-300">Missing ${missingCount} project file(s) compared to connected peers.</div>
                <button type="button" data-holi-action="sync-missing" class="text-purple-400 hover:underline">Sync missing</button>
            </div>
        `.trim();
        this.appendChatMessage(html, 'system');
    }

    private async syncMissingProjectFiles() {
        if (!this.vaultManager) return;
        const { requestsByPeer, missingCount } = await this.computeMissingPlan();
        if (missingCount === 0) {
            this.appendChatMessage('No missing files detected.', 'system');
            return;
        }

        let requested = 0;
        for (const [peerId, paths] of requestsByPeer.entries()) {
            if (paths.length === 0) continue;
            this.vaultManager.requestFiles(paths, peerId);
            requested += paths.length;
        }

        this.appendChatMessage(`Requested ${requested} file(s) from peers…`, 'system');
    }

    private async handleFileRequest(paths: string[], peerId: string) {
        if (!this.vaultManager || !this.projectId) return;
        if (!getActiveHandle()) {
            this.appendChatMessage('Cannot serve requested files: no Vault folder open.', 'system');
            return;
        }

        const safePaths = (paths || []).filter((p) => typeof p === 'string' && p.length > 0).slice(0, 200);
        if (safePaths.length === 0) return;

        for (const path of safePaths) {
            try {
                const blob = await fsdb.readProjectFile(this.projectId, path);
                const leaf = path.split('/').pop() || 'file';
                const file = new File([blob], leaf, { type: blob.type || undefined });
                this.vaultManager.sendFile(file, path, peerId);
            } catch {
                // ignore
            }
        }
    }

    private async loadHistory() {
        if (!this.projectId) return;
        try {
            const history = await getMessages(this.projectId);
            for (const msg of history) {
                const sender = msg.senderId === "me" ? "own" : msg.senderId === "system" ? "system" : "peer";
                this.appendChatMessage(msg.content, sender);
            }
        } catch (e) {
            debugWarn('Failed to load chat history', e);
        }
    }

    private bindUI() {
        // Chat Submit via Form (handles Enter key effectively on some browsers, but we also bind explicit keydown)
        document.getElementById("chat-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const msgInput = document.getElementById("msg-input") as HTMLInputElement;
            if (msgInput) {
                this.sendChat(msgInput.value);
                msgInput.value = "";
            }
        });

        // We need to bind to the specific inputs used in your layout.
        // Assuming standard layout:
        const msgInput = document.getElementById("msg-input") as HTMLInputElement;
        const sendBtn = document.getElementById("msg-send-btn");

        if (sendBtn) {
            sendBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if (msgInput) {
                    this.sendChat(msgInput.value);
                    msgInput.value = "";
                }
            });
        }

        if (msgInput) {
            msgInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChat(msgInput.value);
                    msgInput.value = "";
                }
            });
        }

        // File Drop is usually custom event or drag/drop listeners
        // For now, let's expose public methods if needed, or bind global
        document.addEventListener("file-drop", (e: any) => {
            this.handleFileDrop(e);
        });

        // Handle chat action buttons without relying on inline onclick (avoids hash navigation).
        document.addEventListener(
            'click',
            (ev) => {
                const target = (ev.target as HTMLElement | null)?.closest?.('[data-holi-action]') as HTMLElement | null;
                if (!target) return;

                const action = target.getAttribute('data-holi-action');
                if (!action) return;

                ev.preventDefault();
                ev.stopPropagation();

                if (action === 'preview-file') {
                    const pid = target.getAttribute('data-project-id') || this.projectId || '';
                    const path = target.getAttribute('data-file-path') || '';
                    (window as any).holiPreviewProjectFile?.(pid, path);
                    return;
                }

                if (action === 'show-files') {
                    const folder = target.getAttribute('data-folder') || '';
                    if (folder) (window as any).holiSetProjectFilesFolder?.(folder);
                    (window as any).holiScrollToProjectFiles?.();
                    return;
                }

                if (action === 'sync-missing') {
                    void this.syncMissingProjectFiles();
                    return;
                }
            },
            { capture: true }
        );

        (window as any).holiUploadProjectFiles = async (files: File[], folder: string, announce: boolean) => {
            try {
                await this.uploadProjectFiles(files, folder, announce);
            } catch (e) {
                if ((e as any)?.message === 'No active workspace') {
                    this.appendChatMessage('Open your Vault folder to upload project files.', 'system');
                }
                throw e;
            }
        };

        (window as any).holiSyncMissingProjectFiles = async () => {
            await this.syncMissingProjectFiles();
        };
    }

    public sendChat(text: string) {
        text = text.trim();
        if (!text || !this.vaultManager || !this.projectId) return;

        this.vaultManager.sendText(text);

        // Save Local
        saveMessage({
            id: crypto.randomUUID(),
            projectId: this.projectId,
            senderId: "me",
            type: "text",
            content: text,
            timestamp: Date.now(),
        });
    }

    private handleFileDrop(e: CustomEvent) {
        if (!this.vaultManager) return;
        const file = e.detail?.file;
        if (!file) return;

        const storedPath = `chat/${file.name}`;

        // Save locally for the sender too (if a vault folder is open)
        if (this.projectId && getActiveHandle()) {
            void (async () => {
                try {
                    await fsdb.saveProjectFile(this.projectId as string, file, storedPath);
                    (window as any).refreshStorageFiles?.();
                } catch {
                    // ignore
                }
            })();
        }

        // Send path-aware so receivers store it under chat/ as well.
        this.vaultManager.sendFile(file, storedPath);
    }

    public async uploadProjectFiles(files: File[], subfolder: string, announceToChat: boolean) {
        if (!this.vaultManager || !this.projectId) throw new Error('Not connected to project');
        if (!getActiveHandle()) throw new Error('No active workspace');

        const folder = (subfolder || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
        const base = folder ? `project/${folder}` : 'project';

        for (const file of files) {
            const path = `${base}/${file.name}`;

            await fsdb.saveProjectFile(this.projectId, file, path);
            (window as any).refreshStorageFiles?.();

            this.vaultManager.sendFile(file, path);

            if (announceToChat) {
                this.vaultManager.sendText(`Uploaded ${path}`);

                const safeLeaf = this.escapeHtml(file.name);
                const safeBase = this.escapeHtml(base);
                const pid = this.projectId;
                const html = `
                    <div class="flex flex-col gap-1">
                        <div class="text-zinc-300">Uploaded <span class="font-medium">${safeLeaf}</span> to <span class="text-zinc-400">${safeBase}/</span></div>
                        <div class="flex items-center gap-3 text-sm">
                            <button type="button" data-holi-action="preview-file" data-project-id="${this.escapeHtml(pid)}" data-file-path="${this.escapeHtml(path)}" class="text-purple-400 hover:underline">Preview</button>
                            <button type="button" data-holi-action="show-files" data-folder="project" class="text-purple-400 hover:underline">Show in Project Files</button>
                        </div>
                    </div>
                `.trim();
                this.appendChatMessage(html, 'system');
            }
        }
    }

    public cleanup() {
        if (this.vaultManager) {
            debugLog('[Vault] Cleaning up...');
            this.vaultManager.leave();
            this.vaultManager = null;
        }
    }
}

/** Workspace file management for Holi Typst. */

import {
  deleteStoredKey,
  getStoredDoc,
  getStoredValue,
  safeGetItem,
  safeSetItem,
  setStoredDoc,
  setStoredValue,
} from "./idb";
import {
  chooseDirectory,
  ensureStarterStructure,
  EXAMPLE_CODE,
  EXAMPLE_MAIN_PATH,
  forgetDirectory,
  getDirectoryPermission,
  getRememberedDirectory,
  HOLI_MARK_SVG,
  moveWorkspaceFile,
  removeWorkspaceFile,
  scanWorkspace,
  STARTER_IMAGE_PATH,
  STARTER_MAIN_PATH,
  supportsDirectoryPicker,
  writeWorkspaceFile,
} from "./workspace";
import type { HoliDirectoryHandle, WorkspaceInfo } from "./workspace";
import {
  basename,
  createId,
  ensureUniquePath,
  normalizeTypstPath,
  slugify,
} from "../utils";

export interface FileEntry {
  id: string;
  path: string;
  /** Physical path for a connected legacy folder. Never persisted for browser files. */
  storagePath?: string;
  name: string;
  kind: "typst" | "image";
  mimeType: string;
  createdAt: number;
  updatedAt: number;
}

export interface CompilerWorkspaceFile {
  path: string;
  kind: "typst" | "image";
  content: string | Uint8Array;
}

export interface FileStoreCallbacks {
  renderFileTree(): void;
  updateActiveFileLabel(): void;
  updateWorkspace(info: WorkspaceInfo): void;
  markSaved(): void;
  markSaving(): void;
  markSaveError(): void;
  clearErrors(): void;
  schedulePreviewUpdate(text: string): void;
  setEditorDoc(text: string): void;
}

export const FILE_INDEX_KEY = "holi-typst:files:index:v3";
export const ACTIVE_FILE_KEY = "holi-typst:files:active:v1";
const LEGACY_INDEX_KEYS = [
  "holi-typst:files:index:v2",
  "holi-typst:files:index:v1",
] as const;
const LEGACY_DOC_KEY = "holi-typst:doc:v1";

export function fileContentKey(fileId: string): string {
  return `holi-typst:file:${fileId}`;
}

function externalId(path: string): string {
  return `folder:${path}`;
}

function projectFromPath(path: string): string {
  const [first, second] = path.split("/").filter(Boolean);
  return second ? first : "welcome";
}

function flattenLegacyProjectPath(path: string): string {
  const clean = String(path).replaceAll("\\", "/").replace(/^\/+/, "");
  return clean.startsWith("projects/") ? clean.slice("projects/".length) : clean;
}

function starterProjectCode(name: string): string {
  return `= ${name}\n\n#image("images/holi-mark.svg", width: 22mm)\n\nStart writing here.\n`;
}

function ensureUniqueAssetPath(path: string, existingPaths: string[]): string {
  if (!existingPaths.includes(path)) return path;
  const dot = path.lastIndexOf(".");
  const base = dot > path.lastIndexOf("/") ? path.slice(0, dot) : path;
  const extension = dot > path.lastIndexOf("/") ? path.slice(dot) : "";
  let suffix = 2;
  while (existingPaths.includes(`${base}-${suffix}${extension}`)) suffix++;
  return `${base}-${suffix}${extension}`;
}

function supportedImageMime(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop();
  const byExtension: Record<string, string> = {
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  return extension ? byExtension[extension] ?? null : null;
}

function asEntry(
  path: string,
  kind: "typst" | "image",
  mimeType: string,
  now = Date.now(),
  id = createId()
): FileEntry {
  return {
    id,
    path,
    name: basename(path),
    kind,
    mimeType,
    createdAt: now,
    updatedAt: now,
  };
}

export class FileStore {
  fileIndex: FileEntry[] = [];
  activeFileId: string | null = null;
  workspace: WorkspaceInfo = {
    kind: "browser",
    label: "Browser workspace",
    permission: "granted",
  };

  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private indexSaveTimer: ReturnType<typeof setTimeout> | undefined;
  private cb: FileStoreCallbacks;
  private directoryHandle: HoliDirectoryHandle | null = null;
  private contents = new Map<string, string | Uint8Array>();
  private defaultCode = "";

  constructor(callbacks: FileStoreCallbacks) {
    this.cb = callbacks;
  }

  async init(defaultCode: string): Promise<{ initialDoc: string }> {
    this.defaultCode = defaultCode;
    const remembered = await getRememberedDirectory();
    if (remembered) {
      const permission = await getDirectoryPermission(remembered);
      if (permission === "granted") {
        return { initialDoc: await this.loadDirectory(remembered, false) };
      }
    }
    return { initialDoc: await this.loadBrowser(false) };
  }

  get activeEntry(): FileEntry | null {
    return this.activeFileId
      ? this.fileIndex.find((file) => file.id === this.activeFileId) ?? null
      : null;
  }

  get canChooseFolder(): boolean {
    return supportsDirectoryPicker();
  }

  scheduleIndexSave(): void {
    if (this.workspace.kind !== "browser") return;
    if (this.indexSaveTimer) clearTimeout(this.indexSaveTimer);
    this.indexSaveTimer = setTimeout(() => void this.persistFileIndex(), 250);
  }

  scheduleSave(doc: string, fileId: string | null): void {
    if (!fileId) return;
    this.contents.set(fileId, doc);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const entry = this.fileIndex.find((file) => file.id === fileId);
      if (!entry || entry.kind !== "typst") return;
      this.cb.markSaving();
      entry.updatedAt = Date.now();
      this.scheduleIndexSave();
      const write = this.directoryHandle
        ? writeWorkspaceFile(this.directoryHandle, entry.storagePath ?? entry.path, doc)
        : setStoredDoc(fileContentKey(fileId), doc);
      void write
        .then(() => this.cb.markSaved())
        .catch(() => this.cb.markSaveError());
    }, 300);
  }

  async persistFileIndex(): Promise<void> {
    if (this.workspace.kind !== "browser") return;
    await setStoredDoc(FILE_INDEX_KEY, JSON.stringify(this.fileIndex));
  }

  async getCompilerFiles(): Promise<CompilerWorkspaceFile[]> {
    const result: CompilerWorkspaceFile[] = [];
    for (const entry of this.fileIndex) {
      let content = this.contents.get(entry.id);
      if (content === undefined) content = await this.readEntry(entry);
      this.contents.set(entry.id, content);
      result.push({ path: entry.path, kind: entry.kind, content });
    }
    return result;
  }

  suggestedNewPath(): string {
    const activePath = this.activeEntry?.path ?? STARTER_MAIN_PATH;
    const parts = activePath.split("/");
    if (parts.length > 1 && parts[0]) {
      return `${parts[0]}/untitled.typ`;
    }
    return "welcome/untitled.typ";
  }

  async createFile(path: string, content?: string): Promise<void> {
    const entry = asEntry(path, "typst", "text/plain");
    const text = String(content ?? "");
    if (this.directoryHandle) {
      entry.storagePath = this.physicalPathForNewEntry(path);
      await writeWorkspaceFile(this.directoryHandle, entry.storagePath, text);
    } else {
      await setStoredDoc(fileContentKey(entry.id), text);
    }
    this.contents.set(entry.id, text);
    this.fileIndex = [...this.fileIndex, entry];
    await this.persistFileIndex();
    this.activeFileId = null;
    await this.openFile(entry.id);
  }

  async createProject(label: string): Promise<void> {
    const baseSlug = slugify(label) || "project";
    const projectNames = new Set(
      this.fileIndex
        .map((file) => file.path.split("/")[0])
        .filter((value): value is string => Boolean(value))
    );
    let slug = baseSlug;
    let suffix = 2;
    while (projectNames.has(slug)) slug = `${baseSlug}-${suffix++}`;

    const mainPath = `${slug}/main.typ`;
    const imagePath = `${slug}/images/holi-mark.svg`;
    const main = starterProjectCode(label.trim() || "New project");
    const imageBytes = new TextEncoder().encode(HOLI_MARK_SVG);
    const mainEntry = asEntry(mainPath, "typst", "text/plain");
    const imageEntry = asEntry(imagePath, "image", "image/svg+xml");

    if (this.directoryHandle) {
      await writeWorkspaceFile(this.directoryHandle, mainPath, main);
      await writeWorkspaceFile(this.directoryHandle, imagePath, imageBytes);
    } else {
      await setStoredDoc(fileContentKey(mainEntry.id), main);
      await setStoredValue(fileContentKey(imageEntry.id), imageBytes);
    }

    this.contents.set(mainEntry.id, main);
    this.contents.set(imageEntry.id, imageBytes);
    this.fileIndex = [...this.fileIndex, mainEntry, imageEntry];
    await this.persistFileIndex();
    this.activeFileId = null;
    await this.openFile(mainEntry.id);
  }

  async addImage(file: File): Promise<void> {
    const mimeType = supportedImageMime(file);
    if (!mimeType) throw new Error("Unsupported image type");
    const activePath = this.activeEntry?.path ?? STARTER_MAIN_PATH;
    const project = projectFromPath(activePath);
    const safeName = basename(file.name)
      .replace(/[^a-zA-Z0-9._ -]+/g, "-")
      .replace(/^\.+/, "") || "image.png";
    const path = ensureUniqueAssetPath(
      `${project}/images/${safeName}`,
      this.getExistingPaths()
    );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entry = asEntry(path, "image", mimeType, file.lastModified || Date.now());
    if (this.directoryHandle) {
      entry.storagePath = this.physicalPathForNewEntry(path);
      await writeWorkspaceFile(this.directoryHandle, entry.storagePath, bytes);
    } else {
      await setStoredValue(fileContentKey(entry.id), bytes);
    }
    this.contents.set(entry.id, bytes);
    this.fileIndex = [...this.fileIndex, entry];
    await this.persistFileIndex();
    this.cb.renderFileTree();
  }

  async openFile(fileId: string): Promise<void> {
    if (fileId === this.activeFileId) return;
    const next = this.fileIndex.find((file) => file.id === fileId);
    if (!next || next.kind !== "typst") return;
    const content = await this.readEntry(next);
    const text =
      typeof content === "string" ? content : new TextDecoder().decode(content);
    this.contents.set(fileId, text);
    this.activeFileId = fileId;
    safeSetItem(ACTIVE_FILE_KEY, fileId);
    this.cb.updateActiveFileLabel();
    this.cb.renderFileTree();
    this.cb.setEditorDoc(text);
    this.cb.markSaved();
    this.cb.clearErrors();
    this.cb.schedulePreviewUpdate(text);
  }

  async deleteFile(fileId: string): Promise<void> {
    const entry = this.fileIndex.find((file) => file.id === fileId);
    if (!entry) return;
    if (this.directoryHandle) {
      await removeWorkspaceFile(this.directoryHandle, entry.storagePath ?? entry.path);
    } else {
      await deleteStoredKey(fileContentKey(fileId));
    }
    this.contents.delete(fileId);
    this.fileIndex = this.fileIndex.filter((file) => file.id !== fileId);
    await this.persistFileIndex();

    if (this.activeFileId === fileId) {
      const fallback =
        this.fileIndex.find((file) => file.kind === "typst")?.id ?? null;
      this.activeFileId = null;
      this.cb.updateActiveFileLabel();
      this.cb.renderFileTree();
      if (fallback) await this.openFile(fallback);
    } else {
      this.cb.renderFileTree();
      this.cb.updateActiveFileLabel();
    }
  }

  async renameFile(fileId: string, newPath: string): Promise<void> {
    const entry = this.fileIndex.find((file) => file.id === fileId);
    if (!entry || entry.kind !== "typst") return;
    if (this.directoryHandle) {
      const newStoragePath = entry.storagePath?.startsWith("projects/")
        ? `projects/${newPath}`
        : newPath;
      await moveWorkspaceFile(
        this.directoryHandle,
        entry.storagePath ?? entry.path,
        newStoragePath
      );
      const previousId = entry.id;
      entry.id = externalId(newPath);
      entry.storagePath = newStoragePath;
      const content = this.contents.get(previousId);
      if (content !== undefined) {
        this.contents.delete(previousId);
        this.contents.set(entry.id, content);
      }
      if (this.activeFileId === previousId) {
        this.activeFileId = entry.id;
        safeSetItem(ACTIVE_FILE_KEY, entry.id);
      }
    }
    entry.path = newPath;
    entry.name = basename(newPath);
    entry.updatedAt = Date.now();
    await this.persistFileIndex();
    this.cb.renderFileTree();
    this.cb.updateActiveFileLabel();
  }

  async connectFolder(): Promise<void> {
    let handle = await getRememberedDirectory();
    if (handle) {
      const permission = await getDirectoryPermission(handle, true);
      if (permission !== "granted") handle = null;
    }
    if (!handle) handle = await chooseDirectory();
    if (!handle) return;
    await this.loadDirectory(handle, true);
  }

  async useBrowserWorkspace(): Promise<void> {
    await forgetDirectory();
    await this.loadBrowser(true);
  }

  async refreshWorkspace(): Promise<void> {
    if (!this.directoryHandle) return;
    await this.loadDirectory(this.directoryHandle, true);
  }

  getExistingPaths(excludeId?: string): string[] {
    return this.fileIndex
      .filter((file) => (excludeId ? file.id !== excludeId : true))
      .map((file) => file.path);
  }

  private physicalPathForNewEntry(path: string): string {
    const active = this.activeEntry;
    if (active?.storagePath?.startsWith("projects/") && !path.startsWith("projects/")) {
      return `projects/${path}`;
    }
    return path;
  }

  private async readEntry(entry: FileEntry): Promise<string | Uint8Array> {
    const cached = this.contents.get(entry.id);
    if (cached !== undefined) return cached;
    if (this.directoryHandle) {
      const match = (await scanWorkspace(this.directoryHandle)).find(
        (file) => file.path === (entry.storagePath ?? entry.path)
      );
      return match?.content ??
        (entry.kind === "typst" ? "" : new Uint8Array());
    }
    if (entry.kind === "typst") {
      return (await getStoredDoc(fileContentKey(entry.id))) ?? "";
    }
    const value = await getStoredValue<Uint8Array | string>(
      fileContentKey(entry.id)
    );
    return typeof value === "string"
      ? new TextEncoder().encode(value)
      : value ?? new Uint8Array();
  }

  private async loadDirectory(
    handle: HoliDirectoryHandle,
    notify: boolean
  ): Promise<string> {
    let scanned = await scanWorkspace(handle);
    if (!scanned.some((file) => file.kind === "typst")) {
      await ensureStarterStructure(handle, this.defaultCode);
      scanned = await scanWorkspace(handle);
    }
    const typstFiles = scanned.filter((file) => file.kind === "typst");
    const usesLegacyWrapper =
      typstFiles.length > 0 &&
      typstFiles.every((file) => file.path.startsWith("projects/"));
    this.directoryHandle = handle;
    this.contents.clear();
    this.fileIndex = scanned.map((file) => {
      const path = usesLegacyWrapper
        ? flattenLegacyProjectPath(file.path)
        : file.path;
      const id = externalId(path);
      this.contents.set(id, file.content);
      return {
        id,
        path,
        storagePath: file.path,
        name: basename(path),
        kind: file.kind,
        mimeType: file.mimeType,
        createdAt: file.updatedAt,
        updatedAt: file.updatedAt,
      };
    });
    this.workspace = {
      kind: "folder",
      label: handle.name,
      permission: "granted",
    };
    const initial = this.resolveInitialEntry();
    const text = initial ? await this.entryText(initial) : this.defaultCode;
    this.activeFileId = initial?.id ?? null;
    if (this.activeFileId) safeSetItem(ACTIVE_FILE_KEY, this.activeFileId);
    if (notify) this.notifySwitch(text);
    return text;
  }

  private async loadBrowser(notify: boolean): Promise<string> {
    this.directoryHandle = null;
    const { files, contents } = await ensureBrowserFiles(this.defaultCode);
    this.fileIndex = files;
    this.contents = contents;
    this.workspace = {
      kind: "browser",
      label: "Browser workspace",
      permission: "granted",
    };
    const initial = this.resolveInitialEntry();
    const text = initial ? await this.entryText(initial) : this.defaultCode;
    this.activeFileId = initial?.id ?? null;
    if (this.activeFileId) safeSetItem(ACTIVE_FILE_KEY, this.activeFileId);
    if (notify) this.notifySwitch(text);
    return text;
  }

  private resolveInitialEntry(): FileEntry | null {
    const stored = safeGetItem(ACTIVE_FILE_KEY);
    return (
      this.fileIndex.find(
        (file) => file.id === stored && file.kind === "typst"
      ) ??
      this.fileIndex.find((file) => file.path === STARTER_MAIN_PATH) ??
      this.fileIndex.find((file) => file.kind === "typst") ??
      null
    );
  }

  private async entryText(entry: FileEntry): Promise<string> {
    const content = await this.readEntry(entry);
    return typeof content === "string"
      ? content
      : new TextDecoder().decode(content);
  }

  private notifySwitch(text: string): void {
    this.cb.updateWorkspace(this.workspace);
    this.cb.updateActiveFileLabel();
    this.cb.renderFileTree();
    this.cb.setEditorDoc(text);
    this.cb.markSaved();
    this.cb.clearErrors();
    this.cb.schedulePreviewUpdate(text);
  }
}

async function ensureBrowserFiles(
  defaultCode: string
): Promise<{
  files: FileEntry[];
  contents: Map<string, string | Uint8Array>;
}> {
  let files = await readIndex(FILE_INDEX_KEY);
  const contents = new Map<string, string | Uint8Array>();

  if (files.length === 0) {
    for (const legacyKey of LEGACY_INDEX_KEYS) {
      const legacyFiles = await readIndex(legacyKey);
      if (legacyFiles.length === 0) continue;
      const paths: string[] = [];
      files = legacyFiles.map((legacy) => {
        const oldPath = String(legacy.path || legacy.name || "untitled.typ");
        let migrated =
          oldPath === "examples/demo.typ"
            ? EXAMPLE_MAIN_PATH
            : flattenLegacyProjectPath(oldPath);
        if (legacyKey.endsWith(":v1") && !migrated.includes("/")) {
          migrated = `welcome/${migrated}`;
        }
        const normalized = legacy.kind === "image"
          ? migrated.replace(/^\/+/, "")
          : normalizeTypstPath(migrated);
        const path = legacy.kind === "image"
          ? normalized
          : ensureUniquePath(normalized, paths);
        paths.push(path);
        return {
          ...legacy,
          path,
          name: basename(path),
          kind: legacy.kind,
          mimeType: legacy.mimeType,
        };
      });
      break;
    }
  }

  if (files.length === 0) {
    const legacy = await getStoredDoc(LEGACY_DOC_KEY);
    const initial =
      typeof legacy === "string" && legacy.trim() ? legacy : defaultCode;
    const main = asEntry(STARTER_MAIN_PATH, "typst", "text/plain");
    files.push(main);
    await setStoredDoc(fileContentKey(main.id), initial);
  }

  async function addTypst(path: string, content: string): Promise<void> {
    if (files.some((file) => file.path === path)) return;
    const entry = asEntry(path, "typst", "text/plain");
    files.push(entry);
    await setStoredDoc(fileContentKey(entry.id), content);
  }

  async function addImage(path: string, content: string): Promise<void> {
    if (files.some((file) => file.path === path)) return;
    const entry = asEntry(path, "image", "image/svg+xml");
    files.push(entry);
    await setStoredValue(
      fileContentKey(entry.id),
      new TextEncoder().encode(content)
    );
  }

  await addTypst(STARTER_MAIN_PATH, defaultCode);
  await addImage(STARTER_IMAGE_PATH, HOLI_MARK_SVG);
  await addTypst(EXAMPLE_MAIN_PATH, EXAMPLE_CODE);

  for (const entry of files) {
    const content =
      entry.kind === "image"
        ? await getStoredValue<Uint8Array | string>(fileContentKey(entry.id))
        : await getStoredDoc(fileContentKey(entry.id));
    if (typeof content === "string") {
      contents.set(
        entry.id,
        entry.kind === "image" ? new TextEncoder().encode(content) : content
      );
    } else if (content instanceof Uint8Array) {
      contents.set(entry.id, content);
    }
  }

  await setStoredDoc(FILE_INDEX_KEY, JSON.stringify(files));
  return { files, contents };
}

async function readIndex(key: string): Promise<FileEntry[]> {
  const raw = await getStoredDoc(key);
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((file) => file && typeof file.id === "string")
      .map((file) => ({
        ...file,
        kind: file.kind === "image" ? "image" : "typst",
        mimeType:
          typeof file.mimeType === "string"
            ? file.mimeType
            : file.kind === "image"
              ? "application/octet-stream"
              : "text/plain",
      }));
  } catch {
    return [];
  }
}

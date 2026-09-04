/** Local workspace adapters for browser storage and user-selected folders. */

import {
  deleteStoredValue,
  getStoredValue,
  setStoredValue,
} from "./idb";

export type WorkspaceKind = "browser" | "folder";
export type WorkspacePermission = "granted" | "prompt" | "denied" | "unsupported";

export interface WorkspaceInfo {
  kind: WorkspaceKind;
  label: string;
  permission: WorkspacePermission;
}

export interface WorkspaceFileData {
  path: string;
  kind: "typst" | "image";
  mimeType: string;
  content: string | Uint8Array;
  updatedAt: number;
}

// These small interfaces keep the app buildable in browsers whose TypeScript
// DOM declarations do not yet expose showDirectoryPicker.
export interface HoliFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string | Uint8Array): Promise<void>;
    close(): Promise<void>;
  }>;
}

export interface HoliDirectoryHandle {
  kind: "directory";
  name: string;
  queryPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<HoliDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<HoliFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  values(): AsyncIterable<HoliDirectoryHandle | HoliFileHandle>;
}

const DIRECTORY_HANDLE_KEY = "holi-typst:workspace:directory:v1";

export const STARTER_MAIN_PATH = "welcome/main.typ";
export const STARTER_IMAGE_PATH = "welcome/images/holi-mark.svg";
export const EXAMPLE_MAIN_PATH = "examples/main.typ";

export const HOLI_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="34" fill="#0ea5e9"/>
  <path d="M46 42v76M114 42v76M46 80h68" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"/>
</svg>`;

export const EXAMPLE_CODE = `= A second project

Each top-level folder is an independent project. Open its main.typ file to compile it.

#rect(
  width: 100%,
  inset: 18pt,
  radius: 8pt,
  fill: rgb("e0f2fe"),
  [Everything in this workspace stays local unless you explicitly export or share it.],
)
`;

function pickerWindow(): Window & {
  showDirectoryPicker?: (options: {
    id?: string;
    mode?: "read" | "readwrite";
  }) => Promise<HoliDirectoryHandle>;
} {
  return window as Window & {
    showDirectoryPicker?: (options: {
      id?: string;
      mode?: "read" | "readwrite";
    }) => Promise<HoliDirectoryHandle>;
  };
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && typeof pickerWindow().showDirectoryPicker === "function";
}

export async function getRememberedDirectory(): Promise<HoliDirectoryHandle | null> {
  const handle = await getStoredValue<HoliDirectoryHandle>(DIRECTORY_HANDLE_KEY);
  return handle?.kind === "directory" ? handle : null;
}

export async function rememberDirectory(handle: HoliDirectoryHandle): Promise<void> {
  await setStoredValue(DIRECTORY_HANDLE_KEY, handle);
}

export async function forgetDirectory(): Promise<void> {
  await deleteStoredValue(DIRECTORY_HANDLE_KEY);
}

export async function getDirectoryPermission(
  handle: HoliDirectoryHandle,
  request = false
): Promise<WorkspacePermission> {
  if (!supportsDirectoryPicker()) return "unsupported";
  try {
    if (request && handle.requestPermission) {
      return await handle.requestPermission({ mode: "readwrite" });
    }
    if (handle.queryPermission) {
      return await handle.queryPermission({ mode: "readwrite" });
    }
    return "prompt";
  } catch {
    return "denied";
  }
}

export async function chooseDirectory(): Promise<HoliDirectoryHandle | null> {
  const picker = pickerWindow().showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ id: "holi-typst-workspace", mode: "readwrite" });
    await rememberDirectory(handle);
    return handle;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}

function cleanParts(path: string): string[] {
  const parts = String(path).replaceAll("\\", "/").split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("Workspace paths cannot leave their project root");
  }
  return parts;
}

async function directoryForPath(
  root: HoliDirectoryHandle,
  parts: string[],
  create: boolean
): Promise<HoliDirectoryHandle> {
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function fileHandleForPath(
  root: HoliDirectoryHandle,
  path: string,
  create: boolean
): Promise<HoliFileHandle> {
  const parts = cleanParts(path);
  const name = parts.pop();
  if (!name) throw new Error("A file name is required");
  const directory = await directoryForPath(root, parts, create);
  return directory.getFileHandle(name, { create });
}

export async function writeWorkspaceFile(
  root: HoliDirectoryHandle,
  path: string,
  content: string | Uint8Array
): Promise<void> {
  const handle = await fileHandleForPath(root, path, true);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function writeIfMissing(
  root: HoliDirectoryHandle,
  path: string,
  content: string | Uint8Array
): Promise<void> {
  try {
    await fileHandleForPath(root, path, false);
  } catch {
    await writeWorkspaceFile(root, path, content);
  }
}

export async function ensureStarterStructure(
  root: HoliDirectoryHandle,
  mainCode: string
): Promise<void> {
  await writeIfMissing(root, STARTER_MAIN_PATH, mainCode);
  await writeIfMissing(root, STARTER_IMAGE_PATH, HOLI_MARK_SVG);
  await writeIfMissing(root, EXAMPLE_MAIN_PATH, EXAMPLE_CODE);
}

function supportedFile(name: string): { kind: "typst" | "image"; mimeType: string } | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".typ")) return { kind: "typst", mimeType: "text/plain" };
  if (lower.endsWith(".svg")) return { kind: "image", mimeType: "image/svg+xml" };
  if (lower.endsWith(".png")) return { kind: "image", mimeType: "image/png" };
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return { kind: "image", mimeType: "image/jpeg" };
  }
  if (lower.endsWith(".webp")) return { kind: "image", mimeType: "image/webp" };
  if (lower.endsWith(".gif")) return { kind: "image", mimeType: "image/gif" };
  return null;
}

export async function scanWorkspace(root: HoliDirectoryHandle): Promise<WorkspaceFileData[]> {
  const files: WorkspaceFileData[] = [];

  async function visit(directory: HoliDirectoryHandle, parent: string): Promise<void> {
    for await (const handle of directory.values()) {
      if (handle.name.startsWith(".")) continue;
      const path = parent ? `${parent}/${handle.name}` : handle.name;
      if (handle.kind === "directory") {
        await visit(handle, path);
        continue;
      }
      const type = supportedFile(handle.name);
      if (!type) continue;
      const file = await handle.getFile();
      files.push({
        path,
        ...type,
        content: type.kind === "typst" ? await file.text() : new Uint8Array(await file.arrayBuffer()),
        updatedAt: file.lastModified || Date.now(),
      });
    }
  }

  await visit(root, "");
  return files;
}

export async function removeWorkspaceFile(
  root: HoliDirectoryHandle,
  path: string
): Promise<void> {
  const parts = cleanParts(path);
  const name = parts.pop();
  if (!name) return;
  const directory = await directoryForPath(root, parts, false);
  await directory.removeEntry(name);
}

export async function moveWorkspaceFile(
  root: HoliDirectoryHandle,
  fromPath: string,
  toPath: string
): Promise<void> {
  const sourceHandle = await fileHandleForPath(root, fromPath, false);
  const source = await sourceHandle.getFile();
  await writeWorkspaceFile(root, toPath, new Uint8Array(await source.arrayBuffer()));
  await removeWorkspaceFile(root, fromPath);
}

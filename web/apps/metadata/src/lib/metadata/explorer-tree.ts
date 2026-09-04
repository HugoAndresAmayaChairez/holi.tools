export type NodeSource = "virtual" | "fs";

export type FileLike = { kind: "file"; file: File } | { kind: "handle"; handle: any };

export type ExplorerNode =
  | {
      id: string;
      kind: "folder";
      source: NodeSource;
      name: string;
      parentId: string | null;
      path: string;
      childrenIds: string[];
      isExpanded: boolean;
      isLoaded: boolean;
      isLoading: boolean;
      dirHandle?: any;
    }
  | {
      id: string;
      kind: "file";
      source: NodeSource;
      name: string;
      parentId: string | null;
      path: string;
      fileLike: FileLike;
    };

export const HOLI_RELATIVE_PATH_PROP = "__holiRelativePath";

export type MergeVirtualFilesResult = {
  nodes: Record<string, ExplorerNode>;
  addedFileIds: string[];
  updatedFileIds: string[];
  duplicateFileIds: string[];
  touchedFolderIds: string[];
};

export type VirtualImportEntry =
  | { kind: "folder"; path: string }
  | { kind: "file"; file: File; path?: string };

export function buildPath(parentPath: string, name: string) {
  if (!parentPath) return name;
  return `${parentPath}/${name}`;
}

export function normalizeRelativePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function getFileRelativePath(file: File) {
  return normalizeRelativePath(
    ((file as any).webkitRelativePath as string | undefined) ||
      ((file as any)[HOLI_RELATIVE_PATH_PROP] as string | undefined) ||
      ""
  );
}

export function setDroppedRelativePath(file: File, path: string) {
  const normalizedPath = normalizeRelativePath(path);

  try {
    Object.defineProperty(file, HOLI_RELATIVE_PATH_PROP, {
      value: normalizedPath,
      configurable: true,
    });
  } catch {
    try {
      (file as any)[HOLI_RELATIVE_PATH_PROP] = normalizedPath;
    } catch {
      // Best effort only. The file will still be added as a flat file.
    }
  }
}

export function getImportEntryPath(entry: VirtualImportEntry) {
  if (entry.kind === "folder") return normalizeRelativePath(entry.path);
  return normalizeRelativePath(entry.path || getFileRelativePath(entry.file) || entry.file.name);
}

function normalizeKey(value: string) {
  return normalizeRelativePath(value).toLocaleLowerCase();
}

function folderKey(parentId: string | null, name: string) {
  return `${parentId ?? "root"}\0${name.toLocaleLowerCase()}`;
}

function fileSignature(file: File) {
  return [
    file.name,
    file.size,
    file.lastModified,
    file.type || "",
  ].join("\0");
}

function getVirtualFileSignature(node: ExplorerNode) {
  if (node.kind !== "file" || node.fileLike.kind !== "file") return null;
  return fileSignature(node.fileLike.file);
}

function appendChild(
  nodes: Record<string, ExplorerNode>,
  parentId: string | null,
  childId: string
) {
  if (!parentId) return;

  const parent = nodes[parentId];
  if (!parent || parent.kind !== "folder") return;
  if (parent.childrenIds.includes(childId) && parent.isExpanded) return;

  nodes[parentId] = {
    ...parent,
    childrenIds: parent.childrenIds.includes(childId)
      ? parent.childrenIds
      : [...parent.childrenIds, childId],
    isExpanded: true,
  };
}

function removeChild(
  nodes: Record<string, ExplorerNode>,
  parentId: string | null,
  childId: string
) {
  if (!parentId) return;

  const parent = nodes[parentId];
  if (!parent || parent.kind !== "folder") return;
  if (!parent.childrenIds.includes(childId)) return;

  nodes[parentId] = {
    ...parent,
    childrenIds: parent.childrenIds.filter((id) => id !== childId),
  };
}

export function mergeVirtualFiles(
  previousNodes: Record<string, ExplorerNode>,
  files: File[],
  createId: () => string
): MergeVirtualFilesResult {
  return mergeVirtualEntries(
    previousNodes,
    files.map((file) => ({ kind: "file", file })),
    createId
  );
}

export function mergeVirtualEntries(
  previousNodes: Record<string, ExplorerNode>,
  entries: VirtualImportEntry[],
  createId: () => string
): MergeVirtualFilesResult {
  const nodes: Record<string, ExplorerNode> = { ...previousNodes };
  const folderIdsByParentAndName = new Map<string, string>();
  const fileIdsByPath = new Map<string, string>();
  const fileIdsBySignature = new Map<string, string>();
  const addedFileIds: string[] = [];
  const updatedFileIds: string[] = [];
  const duplicateFileIds: string[] = [];
  const touchedFolderIds: string[] = [];

  for (const node of Object.values(nodes)) {
    if (node.kind === "folder" && node.source === "virtual") {
      folderIdsByParentAndName.set(folderKey(node.parentId, node.name), node.id);
      continue;
    }

    if (node.kind !== "file") continue;
    fileIdsByPath.set(normalizeKey(node.path), node.id);

    const signature = getVirtualFileSignature(node);
    if (signature && !fileIdsBySignature.has(signature)) {
      fileIdsBySignature.set(signature, node.id);
    }
  }

  const touchFolder = (id: string) => {
    const folder = nodes[id];
    if (!folder || folder.kind !== "folder") return;
    if (!folder.isExpanded) {
      nodes[id] = { ...folder, isExpanded: true };
    }
    if (!touchedFolderIds.includes(id)) touchedFolderIds.push(id);
  };

  const getOrCreateFolder = (
    parentId: string | null,
    parentPath: string,
    name: string
  ) => {
    const key = folderKey(parentId, name);
    const existingId = folderIdsByParentAndName.get(key);
    if (existingId) {
      touchFolder(existingId);
      return existingId;
    }

    const id = createId();
    const path = buildPath(parentPath, name);
    nodes[id] = {
      id,
      kind: "folder",
      source: "virtual",
      name,
      parentId,
      path,
      childrenIds: [],
      isExpanded: true,
      isLoaded: true,
      isLoading: false,
    };
    folderIdsByParentAndName.set(key, id);
    touchedFolderIds.push(id);
    appendChild(nodes, parentId, id);
    return id;
  };

  const getOrCreateFolderPath = (path: string) => {
    const folders = normalizeRelativePath(path).split("/").filter(Boolean);
    let parentId: string | null = null;
    let parentPath = "";

    for (const folderName of folders) {
      parentId = getOrCreateFolder(parentId, parentPath, folderName);
      parentPath = nodes[parentId]?.path ?? parentPath;
    }

    return parentId;
  };

  for (const entry of entries) {
    if (entry.kind === "folder") {
      getOrCreateFolderPath(entry.path);
      continue;
    }

    const file = entry.file;
    const parts = getImportEntryPath(entry)
      .split("/")
      .filter(Boolean);
    if (parts.length === 0) continue;

    const folders = parts.slice(0, -1);
    const filename = parts[parts.length - 1] ?? file.name;
    let parentId: string | null = null;
    let parentPath = "";

    for (const folderName of folders) {
      parentId = getOrCreateFolder(parentId, parentPath, folderName);
      parentPath = nodes[parentId]?.path ?? parentPath;
    }

    const path = buildPath(parentPath, filename);
    const pathKey = normalizeKey(path);
    const signature = fileSignature(file);
    const duplicateByPath = fileIdsByPath.get(pathKey);

    if (duplicateByPath) {
      const existing = nodes[duplicateByPath];
      const existingSignature = existing
        ? getVirtualFileSignature(existing)
        : null;

      if (
        existing?.kind === "file" &&
        existing.source === "virtual" &&
        existingSignature !== signature
      ) {
        if (existingSignature) fileIdsBySignature.delete(existingSignature);
        nodes[duplicateByPath] = {
          ...existing,
          name: filename,
          parentId,
          path,
          fileLike: { kind: "file", file },
        };
        fileIdsBySignature.set(signature, duplicateByPath);
        updatedFileIds.push(duplicateByPath);
      } else {
        duplicateFileIds.push(duplicateByPath);
      }
      continue;
    }

    const duplicateBySignature = fileIdsBySignature.get(signature);
    if (duplicateBySignature) {
      const existing = nodes[duplicateBySignature];

      if (
        existing?.kind === "file" &&
        existing.source === "virtual" &&
        existing.parentId === null &&
        folders.length > 0
      ) {
        fileIdsByPath.delete(normalizeKey(existing.path));
        removeChild(nodes, existing.parentId, duplicateBySignature);
        nodes[duplicateBySignature] = {
          ...existing,
          name: filename,
          parentId,
          path,
          fileLike: { kind: "file", file },
        };
        appendChild(nodes, parentId, duplicateBySignature);
        fileIdsByPath.set(pathKey, duplicateBySignature);
        updatedFileIds.push(duplicateBySignature);
        continue;
      }

      duplicateFileIds.push(duplicateBySignature);
      continue;
    }

    const id = createId();
    nodes[id] = {
      id,
      kind: "file",
      source: "virtual",
      name: filename,
      parentId,
      path,
      fileLike: { kind: "file", file },
    };
    appendChild(nodes, parentId, id);
    fileIdsByPath.set(pathKey, id);
    fileIdsBySignature.set(signature, id);
    addedFileIds.push(id);
  }

  return {
    nodes,
    addedFileIds,
    updatedFileIds: Array.from(new Set(updatedFileIds)),
    duplicateFileIds: Array.from(new Set(duplicateFileIds)),
    touchedFolderIds,
  };
}

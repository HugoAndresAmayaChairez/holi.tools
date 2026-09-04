/** Compact workspace explorer for Holi Typst. */

import { safeGetItem, safeSetItem } from "../storage/idb";
import {
  defaultNewFileContent,
  ensureUniquePath,
  isMobile,
  normalizeTypstPath,
} from "../utils";
import type { FileEntry, FileStore } from "../storage/files";
import type { TypstCopy } from "../../i18n/translations";

export interface ExplorerRefs {
  fileTree: HTMLElement | null;
  workspaceLocation: HTMLElement | null;
  explorerNewButton: HTMLElement | null;
  explorerNewProjectButton: HTMLElement | null;
  explorerAddImageButton: HTMLElement | null;
  explorerImageInput: HTMLInputElement | null;
  explorerConnectButton: HTMLElement | null;
  explorerRefreshButton: HTMLElement | null;
  explorerRenameButton: HTMLElement | null;
  explorerDeleteButton: HTMLElement | null;
}

export interface ExplorerCallbacks {
  setExplorerOpen(open: boolean): void;
}

interface TreeNode {
  folders: Map<string, TreeNode>;
  files: FileEntry[];
}

function folderOpenKey(folderPath: string): string {
  return `holi-typst:explorer:open:v1:${folderPath}`;
}

function buildExplorerTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { folders: new Map(), files: [] };
  for (const file of files) {
    const parts = String(file.path || file.name || "")
      .replaceAll("\\", "/")
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean);
    if (parts.length === 0) continue;
    let node = root;
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (index === parts.length - 1) {
        node.files.push(file);
      } else {
        if (!node.folders.has(part)) {
          node.folders.set(part, { folders: new Map(), files: [] });
        }
        node = node.folders.get(part)!;
      }
    }
  }
  return root;
}

export function renderFileTree(
  refs: ExplorerRefs,
  fileIndex: FileEntry[],
  activeFileId: string | null,
  copy: TypstCopy
): void {
  if (!refs.fileTree) return;
  refs.fileTree.innerHTML = "";
  const tree = buildExplorerTree(fileIndex);
  const container = document.createElement("div");
  container.className = "file-tree-list";

  function renderNode(
    node: TreeNode,
    parentPath: string,
    parentEl: HTMLElement
  ): void {
    const folders = Array.from(node.folders.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [name, child] of folders) {
      const folderPath = parentPath ? `${parentPath}/${name}` : name;
      const details = document.createElement("details");
      details.dataset.folderPath = folderPath;
      details.className = "file-tree-folder";
      details.open = safeGetItem(folderOpenKey(folderPath)) !== "0";

      const summary = document.createElement("summary");
      summary.className = "file-tree-folder-label";
      summary.textContent = name;
      details.appendChild(summary);

      const body = document.createElement("div");
      body.className = "file-tree-children";
      details.appendChild(body);
      renderNode(child, folderPath, body);
      parentEl.appendChild(details);
    }

    const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
    for (const file of files) {
      const row = document.createElement(file.kind === "typst" ? "button" : "div");
      row.dataset.workspaceEntry = file.id;
      row.className = `file-tree-item file-tree-item--${file.kind}${
        activeFileId === file.id ? " is-active" : ""
      }`;
      row.title = file.kind === "image" ? `${file.path} · ${copy.imageAsset}` : file.path;
      if (row instanceof HTMLButtonElement) {
        row.type = "button";
        row.dataset.fileId = file.id;
      }
      const mark = document.createElement("span");
      mark.className = "file-tree-item-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = file.kind === "image" ? "I" : "T";
      const name = document.createElement("span");
      name.className = "file-tree-item-name";
      name.textContent = file.name;
      row.append(mark, name);
      parentEl.appendChild(row);
    }
  }

  renderNode(tree, "", container);
  refs.fileTree.appendChild(container);
}

export function syncExplorerWorkspace(refs: ExplorerRefs, fileStore: FileStore, copy: TypstCopy): void {
  if (refs.workspaceLocation) {
    refs.workspaceLocation.textContent = fileStore.workspace.kind === "browser"
      ? copy.browserWorkspace
      : fileStore.workspace.label;
    refs.workspaceLocation.dataset.kind = fileStore.workspace.kind;
  }
  if (refs.explorerRefreshButton) {
    refs.explorerRefreshButton.toggleAttribute(
      "hidden",
      fileStore.workspace.kind !== "folder"
    );
  }
  if (refs.explorerConnectButton instanceof HTMLButtonElement) {
    refs.explorerConnectButton.disabled = !fileStore.canChooseFolder;
    refs.explorerConnectButton.title = fileStore.canChooseFolder
      ? copy.switchFolder
      : copy.folderUnavailable;
  }
}

export function wireExplorer(
  refs: ExplorerRefs,
  fileStore: FileStore,
  callbacks: ExplorerCallbacks,
  copy: TypstCopy
): void {
  refs.fileTree?.addEventListener("click", (event) => {
    const target = event.target;
    const button =
      target instanceof Element
        ? target.closest("button[data-file-id]")
        : null;
    const fileId = button?.getAttribute("data-file-id");
    if (!fileId) return;
    void fileStore.openFile(fileId).then(() => {
      if (isMobile()) callbacks.setExplorerOpen(false);
    });
  });

  refs.fileTree?.addEventListener(
    "toggle",
    (event) => {
      const element = event.target;
      if (!(element instanceof HTMLDetailsElement)) return;
      const folderPath = element.dataset.folderPath;
      if (folderPath) {
        safeSetItem(folderOpenKey(folderPath), element.open ? "1" : "0");
      }
    },
    true
  );

  refs.explorerNewButton?.addEventListener("click", async () => {
    const proposed = prompt(copy.newFilePrompt, fileStore.suggestedNewPath());
    if (!proposed) return;
    const path = ensureUniquePath(
      normalizeTypstPath(proposed),
      fileStore.getExistingPaths()
    );
    await fileStore.createFile(path, defaultNewFileContent(path));
  });

  refs.explorerNewProjectButton?.addEventListener("click", async () => {
    const name = prompt(copy.projectNamePrompt, copy.newProjectName);
    if (!name) return;
    await fileStore.createProject(name);
  });

  refs.explorerAddImageButton?.addEventListener("click", () => {
    refs.explorerImageInput?.click();
  });

  refs.explorerImageInput?.addEventListener("change", async () => {
    const file = refs.explorerImageInput?.files?.[0];
    if (refs.explorerImageInput) refs.explorerImageInput.value = "";
    if (!file) return;
    try {
      await fileStore.addImage(file);
    } catch (error) {
      console.error("Unable to add image", error);
      alert(copy.imageAddFailed);
    }
  });

  refs.explorerConnectButton?.addEventListener("click", async () => {
    if (!fileStore.canChooseFolder) {
      alert(copy.folderUnavailableLong);
      return;
    }
    await fileStore.connectFolder();
    syncExplorerWorkspace(refs, fileStore, copy);
  });

  refs.explorerRefreshButton?.addEventListener("click", async () => {
    await fileStore.refreshWorkspace();
    syncExplorerWorkspace(refs, fileStore, copy);
  });

  refs.explorerRenameButton?.addEventListener("click", async () => {
    const entry = fileStore.activeEntry;
    if (!entry) return;
    const proposed = prompt(copy.renamePrompt, entry.path);
    if (!proposed) return;
    const path = ensureUniquePath(
      normalizeTypstPath(proposed),
      fileStore.getExistingPaths(entry.id)
    );
    await fileStore.renameFile(entry.id, path);
  });

  refs.explorerDeleteButton?.addEventListener("click", async () => {
    const entry = fileStore.activeEntry;
    if (!entry) return;
    const location =
      fileStore.workspace.kind === "folder"
        ? copy.folderLocation.replace("{name}", fileStore.workspace.label)
        : copy.thisBrowser;
    const question = copy.deleteFrom
      .replace("{path}", entry.path)
      .replace("{location}", location);
    if (!confirm(question)) return;
    await fileStore.deleteFile(entry.id);
  });
}

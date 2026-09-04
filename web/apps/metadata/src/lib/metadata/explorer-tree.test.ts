import { describe, expect, it } from "vitest";
import {
  mergeVirtualEntries,
  mergeVirtualFiles,
  setDroppedRelativePath,
  type ExplorerNode,
} from "./explorer-tree";

function createIdFactory() {
  let next = 0;
  return () => `node-${++next}`;
}

function makeFile(
  name: string,
  size: number,
  options: { type?: string; lastModified?: number } = {}
) {
  return new File([new Uint8Array(size)], name, {
    type: options.type,
    lastModified: options.lastModified ?? 1000,
  });
}

function fileNodes(nodes: Record<string, ExplorerNode>) {
  return Object.values(nodes).filter((node) => node.kind === "file");
}

function folderByName(nodes: Record<string, ExplorerNode>, name: string) {
  return Object.values(nodes).find(
    (node) => node.kind === "folder" && node.name === name
  );
}

describe("metadata explorer tree", () => {
  it("adds mixed folder files and loose files in the same import", () => {
    const id = createIdFactory();
    const folderFile = makeFile("cover.jpg", 4, {
      type: "image/jpeg",
      lastModified: 1,
    });
    const looseFile = makeFile("notes.txt", 3, {
      type: "text/plain",
      lastModified: 2,
    });
    setDroppedRelativePath(folderFile, "Album/cover.jpg");

    const result = mergeVirtualFiles({}, [folderFile, looseFile], id);
    const album = folderByName(result.nodes, "Album");

    expect(album).toMatchObject({ kind: "folder", isExpanded: true });
    expect(fileNodes(result.nodes)).toHaveLength(2);
    expect(
      Object.values(result.nodes).some(
        (node) => node.kind === "file" && node.path === "notes.txt"
      )
    ).toBe(true);
    expect(
      Object.values(result.nodes).some(
        (node) => node.kind === "file" && node.path === "Album/cover.jpg"
      )
    ).toBe(true);
  });

  it("keeps explicitly dropped folders even when they are empty", () => {
    const id = createIdFactory();

    const result = mergeVirtualEntries(
      {},
      [
        { kind: "folder", path: "Empty A" },
        { kind: "folder", path: "Parent/Empty B" },
      ],
      id
    );

    expect(folderByName(result.nodes, "Empty A")).toMatchObject({
      kind: "folder",
      path: "Empty A",
      isExpanded: true,
    });
    expect(folderByName(result.nodes, "Empty B")).toMatchObject({
      kind: "folder",
      path: "Parent/Empty B",
      isExpanded: true,
    });
    expect(fileNodes(result.nodes)).toHaveLength(0);
  });

  it("adds multiple folders and loose images from one drop operation", () => {
    const id = createIdFactory();
    const imageA = makeFile("a.png", 1, { type: "image/png", lastModified: 1 });
    const imageB = makeFile("b.png", 2, { type: "image/png", lastModified: 2 });
    const imageC = makeFile("c.png", 3, { type: "image/png", lastModified: 3 });

    const result = mergeVirtualEntries(
      {},
      [
        { kind: "folder", path: "Folder 1" },
        { kind: "folder", path: "Folder 2" },
        { kind: "folder", path: "Folder 3" },
        { kind: "file", file: imageA },
        { kind: "file", file: imageB },
        { kind: "file", file: imageC },
      ],
      id
    );

    expect(folderByName(result.nodes, "Folder 1")).toBeTruthy();
    expect(folderByName(result.nodes, "Folder 2")).toBeTruthy();
    expect(folderByName(result.nodes, "Folder 3")).toBeTruthy();
    expect(fileNodes(result.nodes)).toHaveLength(3);
  });

  it("does not duplicate the same loose file when it is added repeatedly", () => {
    const id = createIdFactory();
    const image = makeFile("photo.png", 8, {
      type: "image/png",
      lastModified: 42,
    });

    const first = mergeVirtualFiles({}, [image], id);
    const second = mergeVirtualFiles(first.nodes, [image], id);

    expect(fileNodes(second.nodes)).toHaveLength(1);
    expect(second.addedFileIds).toHaveLength(0);
    expect(second.updatedFileIds).toHaveLength(0);
    expect(second.duplicateFileIds).toHaveLength(1);
  });

  it("moves a loose duplicate into the folder path when the folder is imported later", () => {
    const id = createIdFactory();
    const looseImage = makeFile("photo.png", 8, {
      type: "image/png",
      lastModified: 42,
    });
    const folderImage = makeFile("photo.png", 8, {
      type: "image/png",
      lastModified: 42,
    });
    setDroppedRelativePath(folderImage, "Shoot/photo.png");

    const first = mergeVirtualFiles({}, [looseImage], id);
    const second = mergeVirtualFiles(first.nodes, [folderImage], id);
    const shoot = folderByName(second.nodes, "Shoot");
    const [image] = fileNodes(second.nodes);

    expect(fileNodes(second.nodes)).toHaveLength(1);
    expect(shoot).toMatchObject({ kind: "folder", isExpanded: true });
    expect(image.path).toBe("Shoot/photo.png");
    expect(image.parentId).toBe(shoot?.id);
    expect(second.updatedFileIds).toEqual([image.id]);
    expect(second.duplicateFileIds).toHaveLength(0);
  });

  it("refreshes an existing virtual file when the same path has new content", () => {
    const id = createIdFactory();
    const firstImage = makeFile("photo.png", 8, {
      type: "image/png",
      lastModified: 42,
    });
    const editedImage = makeFile("photo.png", 12, {
      type: "image/png",
      lastModified: 43,
    });

    const first = mergeVirtualFiles({}, [firstImage], id);
    const second = mergeVirtualFiles(first.nodes, [editedImage], id);
    const [image] = fileNodes(second.nodes);

    expect(fileNodes(second.nodes)).toHaveLength(1);
    expect(image.path).toBe("photo.png");
    expect(image.fileLike.kind).toBe("file");
    if (image.fileLike.kind === "file") {
      expect(image.fileLike.file.size).toBe(12);
    }
    expect(second.updatedFileIds).toEqual([image.id]);
    expect(second.duplicateFileIds).toHaveLength(0);
  });
});

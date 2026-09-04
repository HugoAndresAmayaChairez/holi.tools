import { describe, expect, it } from "vitest";
import { formatChatFileSize, getChatFileKind } from "./chat-file-preview";

describe("chat file preview helpers", () => {
  it("recognizes previewable media by MIME type or filename", () => {
    expect(getChatFileKind("photo.bin", "image/png")).toBe("image");
    expect(getChatFileKind("clip.webm")).toBe("video");
    expect(getChatFileKind("notes.pdf", "application/pdf")).toBe("file");
  });

  it("formats file sizes for chat metadata", () => {
    expect(formatChatFileSize(0)).toBe("0 B");
    expect(formatChatFileSize(1_536)).toBe("1.5 KB");
    expect(formatChatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });
});

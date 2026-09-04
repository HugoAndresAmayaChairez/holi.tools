import { describe, expect, it } from "vitest";
import {
  formatBytes,
  getExtension,
  inferMimeTypeFromExtension,
  readAsciiFromBytes,
  startsWithBytes,
} from "./file-utils";

describe("metadata file utilities", () => {
  it("formats byte sizes for compact display", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024)).toBe("10 KB");
  });

  it("extracts lowercase file extensions", () => {
    expect(getExtension("photo.JPG")).toBe("jpg");
    expect(getExtension("archive.tar.gz")).toBe("gz");
    expect(getExtension("README")).toBe("");
  });

  it("infers supported mime types by extension", () => {
    expect(inferMimeTypeFromExtension("jpg")).toBe("image/jpeg");
    expect(inferMimeTypeFromExtension("pdf")).toBe("application/pdf");
    expect(inferMimeTypeFromExtension("docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(inferMimeTypeFromExtension("xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(inferMimeTypeFromExtension("pptx")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    expect(inferMimeTypeFromExtension("tiff")).toBe("image/tiff");
    expect(inferMimeTypeFromExtension("zip")).toBe("application/zip");
    expect(inferMimeTypeFromExtension("unknown")).toBeNull();
  });

  it("reads magic bytes safely", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(startsWithBytes(bytes, [0x25, 0x50])).toBe(true);
    expect(startsWithBytes(bytes, [0x50, 0x25])).toBe(false);
    expect(readAsciiFromBytes(bytes, 0, 5)).toBe("%PDF-");
  });
});

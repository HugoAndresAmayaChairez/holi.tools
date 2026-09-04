import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createId,
  formatBytes,
  getExtension,
  inferMimeTypeFromExtension,
  readAsciiFromBytes,
  startsWithBytes,
} from "../lib/metadata/file-utils";
import { downloadBlob, downloadCsv, downloadJson } from "../lib/metadata/exporters";
import {
  buildPath,
  mergeVirtualEntries,
  mergeVirtualFiles,
  normalizeRelativePath,
  setDroppedRelativePath,
} from "../lib/metadata/explorer-tree";
import { getPrivacyFindings, getPrivacyScore } from "../lib/metadata/privacy";
import type {
  ExplorerNode,
  MergeVirtualFilesResult,
  VirtualImportEntry,
} from "../lib/metadata/explorer-tree";
import type { FileMetadata } from "../lib/metadata/types";
import { getMetadataCopy, type MetadataUi } from "../i18n/translations";

const MetadataI18nContext = createContext<MetadataUi>(getMetadataCopy("en").ui);
const useMetadataUi = () => useContext(MetadataI18nContext);

type InspectorTab = "details" | "export" | "forensic";

async function inflateBytes(
  bytes: Uint8Array,
  format: "deflate" | "deflate-raw"
): Promise<Uint8Array | null> {
  if (typeof (globalThis as any).DecompressionStream !== "function")
    return null;
  try {
    const ds = new (globalThis as any).DecompressionStream(format);
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const out = await new Response(stream).arrayBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}

async function inflateZipDeflateRaw(
  bytes: Uint8Array
): Promise<Uint8Array | null> {
  return (
    (await inflateBytes(bytes, "deflate-raw")) ??
    (await inflateBytes(bytes, "deflate"))
  );
}

async function inflateZlib(bytes: Uint8Array): Promise<Uint8Array | null> {
  return (
    (await inflateBytes(bytes, "deflate")) ??
    (await inflateBytes(bytes, "deflate-raw"))
  );
}

function decodeUtf16Be(bytes: Uint8Array) {
  // bytes length should be even; ignore trailing odd byte.
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  }
  return out;
}

function decodePdfLiteralString(raw: string) {
  // Best-effort: handle basic escapes.
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractPdfStringAt(
  source: string,
  startIndex: number
): { value: string; next: number } | null {
  // Expects source[startIndex] === '('
  let i = startIndex;
  if (source[i] !== "(") return null;
  i += 1;
  let out = "";
  let depth = 1;
  while (i < source.length && depth > 0) {
    const ch = source[i]!;
    if (ch === "\\") {
      const next = source[i + 1];
      if (next == null) break;
      out += `\\${next}`;
      i += 2;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
      out += ch;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  if (depth !== 0) return null;
  return { value: decodePdfLiteralString(out), next: i };
}

function extractPdfHexStringAt(
  source: string,
  startIndex: number
): { value: string; next: number } | null {
  // Expects source[startIndex] === '<' and not '<<'
  if (source[startIndex] !== "<" || source[startIndex + 1] === "<") return null;
  let i = startIndex + 1;
  let hex = "";
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === ">") {
      i += 1;
      break;
    }
    if (/[0-9a-fA-F]/.test(ch)) hex += ch;
    i += 1;
  }
  if (hex.length < 2) return null;
  // If UTF-16BE BOM FEFF, decode accordingly.
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let j = 0; j + 1 < hex.length; j += 2) {
    bytes[j / 2] = parseInt(hex.slice(j, j + 2), 16);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { value: decodeUtf16Be(bytes.slice(2)), next: i };
  }
  try {
    const text = new TextDecoder("latin1").decode(bytes);
    return { value: text, next: i };
  } catch {
    return null;
  }
}

function stripXmlTags(text: string) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function takeFirstNonEmpty(...values: Array<string | undefined | null>) {
  for (const v of values) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return undefined;
}

async function extractPdfCommon(
  file: File
): Promise<FileMetadata["common"] | null> {
  // Best-effort: scan head+tail for an Info dictionary and/or embedded XMP.
  const MB = 1024 * 1024;
  const headBuf = await file
    .slice(0, Math.min(file.size, 2 * MB))
    .arrayBuffer();
  const tailStart = Math.max(0, file.size - 2 * MB);
  const tailBuf = await file.slice(tailStart, file.size).arrayBuffer();

  const decoder = new TextDecoder("latin1");
  const head = decoder.decode(headBuf);
  const tail = decoder.decode(tailBuf);
  const text = `${head}\n${tail}`;

  const out: NonNullable<FileMetadata["common"]> = {};

  const tryKey = (key: "Title" | "Author" | "Subject" | "Keywords") => {
    const idx = text.lastIndexOf(`/${key}`);
    if (idx < 0) return;
    let i = idx + key.length + 1;
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    const ch = text[i];
    if (ch === "(") {
      const parsed = extractPdfStringAt(text, i);
      if (!parsed) return;
      const value = parsed.value.trim();
      if (!value) return;
      if (key === "Title") out.title = value;
      if (key === "Author") out.author = value;
      if (key === "Subject") out.subject = value;
      if (key === "Keywords") out.keywords = value;
      return;
    }
    if (ch === "<" && text[i + 1] !== "<") {
      const parsed = extractPdfHexStringAt(text, i);
      if (!parsed) return;
      const value = parsed.value.trim();
      if (!value) return;
      if (key === "Title") out.title = value;
      if (key === "Author") out.author = value;
      if (key === "Subject") out.subject = value;
      if (key === "Keywords") out.keywords = value;
    }
  };

  tryKey("Title");
  tryKey("Author");
  tryKey("Subject");
  tryKey("Keywords");

  // XMP (very rough): pull out dc:title/dc:creator and pdf:Keywords if visible as plain XML.
  const xmpStart = text.lastIndexOf("<x:xmpmeta");
  const xmpEnd = xmpStart >= 0 ? text.indexOf("</x:xmpmeta>", xmpStart) : -1;
  if (xmpStart >= 0 && xmpEnd > xmpStart) {
    const xmp = text.slice(xmpStart, xmpEnd + "</x:xmpmeta>".length);
    const title = takeFirstNonEmpty(
      xmp.match(
        /<dc:title>[\s\S]*?<rdf:Alt>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/
      )?.[1],
      xmp.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1]
    );
    const creator = takeFirstNonEmpty(
      xmp.match(
        /<dc:creator>[\s\S]*?<rdf:Seq>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/
      )?.[1],
      xmp.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/)?.[1]
    );
    const subject = takeFirstNonEmpty(
      xmp.match(
        /<dc:description>[\s\S]*?<rdf:Alt>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/
      )?.[1],
      xmp.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/)?.[1]
    );
    const keywords = takeFirstNonEmpty(
      xmp.match(/<pdf:Keywords[^>]*>([\s\S]*?)<\/pdf:Keywords>/)?.[1],
      xmp.match(/<xmp:Keywords[^>]*>([\s\S]*?)<\/xmp:Keywords>/)?.[1]
    );

    if (!out.title && title) out.title = stripXmlTags(title);
    if (!out.author && creator) out.author = stripXmlTags(creator);
    if (!out.subject && subject) out.subject = stripXmlTags(subject);
    if (!out.keywords && keywords) out.keywords = stripXmlTags(keywords);
  }

  return Object.keys(out).length > 0 ? out : null;
}

async function extractPngCommon(
  file: File
): Promise<FileMetadata["common"] | null> {
  // Parse PNG tEXt/iTXt chunks best-effort.
  const MAX = 512 * 1024;
  const buf = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX)).arrayBuffer()
  );
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!startsWithBytes(buf, sig)) return null;

  const out: NonNullable<FileMetadata["common"]> = {};
  const readU32 = (o: number) =>
    (buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3];

  let offset = 8;
  while (offset + 12 <= buf.length) {
    const length = readU32(offset);
    const type = readAsciiFromBytes(buf, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;

    if (type === "tEXt") {
      const data = buf.slice(dataStart, dataEnd);
      const nul = data.indexOf(0);
      if (nul > 0) {
        const key = readAsciiFromBytes(data, 0, nul).trim();
        // Per PNG spec, tEXt is ISO-8859-1 (latin1).
        const value = new TextDecoder("latin1", { fatal: false })
          .decode(data.slice(nul + 1))
          .trim();
        if (key && value) {
          const k = key.toLowerCase();
          if (!out.title && (k === "title" || k === "documentname"))
            out.title = value;
          if (!out.author && (k === "author" || k === "artist"))
            out.author = value;
          if (!out.subject && k === "subject") out.subject = value;
          if (!out.description && (k === "description" || k === "comment"))
            out.description = value;
          if (!out.keywords && k === "keywords") out.keywords = value;
          if (!out.software && k === "software") out.software = value;
        }
      }
    }

    if (type === "iTXt") {
      const data = buf.slice(dataStart, dataEnd);
      const firstNul = data.indexOf(0);
      if (firstNul > 0) {
        const key = readAsciiFromBytes(data, 0, firstNul).trim();
        const compressionFlag = data[firstNul + 1];
        // compressionMethod = data[firstNul + 2]
        // keyword\0 flag method language\0 translated\0 text
        let i = firstNul + 3;
        const langEnd = data.indexOf(0, i);
        if (langEnd < 0) break;
        i = langEnd + 1;
        const translatedEnd = data.indexOf(0, i);
        if (translatedEnd < 0) break;
        i = translatedEnd + 1;

        let value = "";
        if (compressionFlag === 0) {
          value = new TextDecoder("utf-8", { fatal: false })
            .decode(data.slice(i))
            .trim();
        } else if (compressionFlag === 1) {
          const inflated = await inflateZlib(data.slice(i));
          if (inflated)
            value = new TextDecoder("utf-8", { fatal: false })
              .decode(inflated)
              .trim();
        }

        if (key && value) {
          const k = key.toLowerCase();
          if (!out.title && (k === "title" || k === "documentname"))
            out.title = value;
          if (!out.author && (k === "author" || k === "artist"))
            out.author = value;
          if (!out.subject && k === "subject") out.subject = value;
          if (!out.description && (k === "description" || k === "comment"))
            out.description = value;
          if (!out.keywords && k === "keywords") out.keywords = value;
          if (!out.software && k === "software") out.software = value;
        }
      }
    }

    if (type === "IEND") break;
    offset = dataEnd + 4;
  }

  return Object.keys(out).length > 0 ? out : null;
}

async function extractPngTextTags(
  file: File
): Promise<Record<string, string> | null> {
  const MAX = 512 * 1024;
  const buf = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX)).arrayBuffer()
  );
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!startsWithBytes(buf, sig)) return null;

  const tags: Record<string, string> = {};
  const readU32 = (o: number) =>
    (buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3];

  const addTag = (key: string, value: string) => {
    const k = key.trim();
    const v = value.trim();
    if (!k || !v) return;
    // Avoid unbounded growth.
    if (Object.keys(tags).length >= 128) return;
    tags[k] = v.length > 8192 ? `${v.slice(0, 8192)}…` : v;
  };

  let offset = 8;
  while (offset + 12 <= buf.length) {
    const length = readU32(offset);
    const type = readAsciiFromBytes(buf, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;

    if (type === "tEXt") {
      const data = buf.slice(dataStart, dataEnd);
      const nul = data.indexOf(0);
      if (nul > 0) {
        const key = readAsciiFromBytes(data, 0, nul);
        const value = new TextDecoder("latin1", { fatal: false }).decode(
          data.slice(nul + 1)
        );
        addTag(key, value);
      }
    }

    if (type === "iTXt") {
      const data = buf.slice(dataStart, dataEnd);
      const firstNul = data.indexOf(0);
      if (firstNul > 0) {
        const key = readAsciiFromBytes(data, 0, firstNul);
        const compressionFlag = data[firstNul + 1];
        let i = firstNul + 3;
        const langEnd = data.indexOf(0, i);
        if (langEnd < 0) break;
        i = langEnd + 1;
        const translatedEnd = data.indexOf(0, i);
        if (translatedEnd < 0) break;
        i = translatedEnd + 1;

        if (compressionFlag === 0) {
          const value = new TextDecoder("utf-8", { fatal: false }).decode(
            data.slice(i)
          );
          addTag(key, value);
        } else if (compressionFlag === 1) {
          const inflated = await inflateZlib(data.slice(i));
          if (inflated) {
            const value = new TextDecoder("utf-8", { fatal: false }).decode(
              inflated
            );
            addTag(key, value);
          }
        }
      }
    }

    if (type === "IEND") break;
    offset = dataEnd + 4;
  }

  return Object.keys(tags).length > 0 ? tags : null;
}

async function extractJpegXmpCommon(
  file: File
): Promise<FileMetadata["common"] | null> {
  const MAX = 1024 * 1024;
  const buf = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX)).arrayBuffer()
  );
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  const out: NonNullable<FileMetadata["common"]> = {};

  // Scan JPEG segments for APP1 XMP.
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS
    const len = (buf[offset] << 8) | buf[offset + 1];
    const segStart = offset + 2;
    const segEnd = segStart + len - 2;
    if (segEnd > buf.length) break;
    if (marker === 0xe1) {
      const header = "http://ns.adobe.com/xap/1.0/\u0000";
      const headerBytes = new TextEncoder().encode(header);
      const seg = buf.slice(segStart, segEnd);
      if (startsWithBytes(seg, Array.from(headerBytes))) {
        const xmlBytes = seg.slice(headerBytes.length);
        const xml = new TextDecoder("utf-8", { fatal: false }).decode(xmlBytes);
        const title = takeFirstNonEmpty(
          xml.match(
            /<dc:title>[\s\S]*?<rdf:Alt>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/
          )?.[1],
          xml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1]
        );
        const creator = takeFirstNonEmpty(
          xml.match(
            /<dc:creator>[\s\S]*?<rdf:Seq>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/
          )?.[1],
          xml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/)?.[1]
        );
        const description = takeFirstNonEmpty(
          xml.match(
            /<dc:description>[\s\S]*?<rdf:Alt>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/
          )?.[1],
          xml.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/)?.[1]
        );

        if (title) out.title = stripXmlTags(title);
        if (creator) out.author = stripXmlTags(creator);
        if (description) out.description = stripXmlTags(description);
        break;
      }
    }
    offset = segEnd;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function readSynchsafeInt(b0: number, b1: number, b2: number, b3: number) {
  return (
    ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f)
  );
}

function stripNullTerminators(value: string) {
  return value.split("\u0000").join("").trim();
}

function decodeId3Text(encoding: number, bytes: Uint8Array) {
  try {
    if (encoding === 0)
      return stripNullTerminators(new TextDecoder("latin1").decode(bytes));
    if (encoding === 3)
      return stripNullTerminators(new TextDecoder("utf-8").decode(bytes));
    if (encoding === 1) {
      // UTF-16 with BOM
      return stripNullTerminators(new TextDecoder("utf-16").decode(bytes));
    }
    if (encoding === 2) {
      // UTF-16BE without BOM
      return stripNullTerminators(decodeUtf16Be(bytes));
    }
    return stripNullTerminators(new TextDecoder("utf-8").decode(bytes));
  } catch {
    return "";
  }
}

async function extractMp3Id3Common(
  file: File
): Promise<FileMetadata["common"] | null> {
  const MAX = 512 * 1024;
  const buf = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX)).arrayBuffer()
  );
  if (buf.length < 10) return null;
  if (readAsciiFromBytes(buf, 0, 3) !== "ID3") return null;

  const versionMajor = buf[3];
  const tagSize = readSynchsafeInt(buf[6], buf[7], buf[8], buf[9]);
  const end = Math.min(buf.length, 10 + tagSize);
  if (end <= 10) return null;

  const out: NonNullable<FileMetadata["common"]> = {};

  let offset = 10;
  while (offset + 10 <= end) {
    const frameId = readAsciiFromBytes(buf, offset, 4);
    const frameSize =
      versionMajor === 4
        ? readSynchsafeInt(
            buf[offset + 4],
            buf[offset + 5],
            buf[offset + 6],
            buf[offset + 7]
          )
        : (buf[offset + 4] << 24) |
          (buf[offset + 5] << 16) |
          (buf[offset + 6] << 8) |
          buf[offset + 7];
    // flags at +8,+9

    if (!frameId.trim() || frameSize <= 0) break;
    const dataStart = offset + 10;
    const dataEnd = dataStart + frameSize;
    if (dataEnd > end) break;

    const data = buf.slice(dataStart, dataEnd);
    if (frameId[0] === "T" && frameId !== "TXXX") {
      const encoding = data[0] ?? 0;
      const text = decodeId3Text(encoding, data.slice(1));
      if (text) {
        if (!out.title && frameId === "TIT2") out.title = text;
        if (!out.author && frameId === "TPE1") out.author = text;
        if (!out.keywords && frameId === "TCON") out.keywords = text;
        if (!out.created && (frameId === "TDRC" || frameId === "TYER"))
          out.created = text;
      }
    } else if (frameId === "COMM") {
      // encoding(1) + lang(3) + desc(null-term) + text
      const encoding = data[0] ?? 0;
      const rest = data.slice(4); // skip encoding+lang
      const nulIndex = rest.indexOf(0);
      const textStart = nulIndex >= 0 ? nulIndex + 1 : 0;
      const comment = decodeId3Text(encoding, rest.slice(textStart));
      if (comment && !out.description) out.description = comment;
    }

    offset = dataEnd;
  }

  return Object.keys(out).length > 0 ? out : null;
}

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function readU16LE(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readU32LE(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function findLastIndexOfBytes(haystack: Uint8Array, needle: number[]) {
  if (needle.length === 0 || haystack.length < needle.length) return -1;
  for (let i = haystack.length - needle.length; i >= 0; i -= 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

async function readZipCentralDirectory(
  file: File
): Promise<Map<string, ZipEntry> | null> {
  // Read tail to find EOCD.
  const TAIL_MAX = 256 * 1024;
  const tailStart = Math.max(0, file.size - TAIL_MAX);
  const tail = new Uint8Array(
    await file.slice(tailStart, file.size).arrayBuffer()
  );
  const eocdSig = [0x50, 0x4b, 0x05, 0x06];
  const eocdRel = findLastIndexOfBytes(tail, eocdSig);
  if (eocdRel < 0) return null;

  const eocdAbs = tailStart + eocdRel;
  const eocd = new DataView(
    await file.slice(eocdAbs, eocdAbs + 22).arrayBuffer()
  );
  // central directory size + offset
  const cdSize = readU32LE(eocd, 12);
  const cdOffset = readU32LE(eocd, 16);
  if (cdSize <= 0) return null;

  // Basic sanity limits
  if (cdSize > 16 * 1024 * 1024) return null;

  const cdBuf = new Uint8Array(
    await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer()
  );
  const cdView = new DataView(cdBuf.buffer, cdBuf.byteOffset, cdBuf.byteLength);
  const out = new Map<string, ZipEntry>();
  const decoder = new TextDecoder("utf-8", { fatal: false });

  let offset = 0;
  while (offset + 46 <= cdBuf.length) {
    const sig = readU32LE(cdView, offset);
    if (sig !== 0x02014b50) break;
    const flags = readU16LE(cdView, offset + 8);
    const compressionMethod = readU16LE(cdView, offset + 10);
    const compressedSize = readU32LE(cdView, offset + 20);
    const uncompressedSize = readU32LE(cdView, offset + 24);
    const nameLen = readU16LE(cdView, offset + 28);
    const extraLen = readU16LE(cdView, offset + 30);
    const commentLen = readU16LE(cdView, offset + 32);
    const localHeaderOffset = readU32LE(cdView, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > cdBuf.length) break;

    const nameBytes = cdBuf.slice(nameStart, nameEnd);
    // If UTF-8 flag is unset, docx still uses UTF-8 in practice; fall back to latin1 if it looks broken.
    let name = decoder.decode(nameBytes);
    if ((flags & (1 << 11)) === 0 && /�/.test(name)) {
      name = new TextDecoder("latin1", { fatal: false }).decode(nameBytes);
    }

    out.set(name, {
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset = nameEnd + extraLen + commentLen;
  }

  return out.size > 0 ? out : null;
}

async function readZipEntryBytes(
  file: File,
  entry: ZipEntry
): Promise<Uint8Array | null> {
  const localHeader = new DataView(
    await file
      .slice(entry.localHeaderOffset, entry.localHeaderOffset + 30)
      .arrayBuffer()
  );
  if (readU32LE(localHeader, 0) !== 0x04034b50) return null;
  const nameLen = readU16LE(localHeader, 26);
  const extraLen = readU16LE(localHeader, 28);
  const dataStart = entry.localHeaderOffset + 30 + nameLen + extraLen;
  const dataEnd = dataStart + entry.compressedSize;
  if (entry.compressedSize <= 0) return null;
  const compressed = new Uint8Array(
    await file.slice(dataStart, dataEnd).arrayBuffer()
  );

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8)
    return await inflateZipDeflateRaw(compressed);
  return null;
}

function textFromFirstTag(doc: Document, ...tagNames: string[]) {
  for (const tag of tagNames) {
    const el = doc.getElementsByTagName(tag)[0];
    const t = el?.textContent?.trim();
    if (t) return t;
  }
  return undefined;
}

async function extractDocxMetadata(file: File): Promise<{
  common: FileMetadata["common"] | null;
  tags: Record<string, string> | null;
}> {
  const cd = await readZipCentralDirectory(file);
  if (!cd) return { common: null, tags: null };

  const core = cd.get("docProps/core.xml");
  const app = cd.get("docProps/app.xml");
  if (!core && !app) return { common: null, tags: null };

  const tags: Record<string, string> = {};
  const common: NonNullable<FileMetadata["common"]> = {};

  const parseXml = (xml: string) => {
    const parser = new DOMParser();
    return parser.parseFromString(xml, "application/xml");
  };

  if (core) {
    const bytes = await readZipEntryBytes(file, core);
    if (bytes) {
      const xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const doc = parseXml(xml);

      const title = textFromFirstTag(doc, "dc:title");
      const author = textFromFirstTag(doc, "dc:creator");
      const subject = textFromFirstTag(doc, "dc:subject");
      const description = textFromFirstTag(doc, "dc:description");
      const keywords = textFromFirstTag(doc, "cp:keywords");
      const created = textFromFirstTag(doc, "dcterms:created");
      const modified = textFromFirstTag(doc, "dcterms:modified");
      const lastModifiedBy = textFromFirstTag(doc, "cp:lastModifiedBy");

      if (title) common.title = title;
      if (author) common.author = author;
      if (subject) common.subject = subject;
      if (description) common.description = description;
      if (keywords) common.keywords = keywords;
      if (created) common.created = created;
      if (modified) common.modified = modified;

      if (title) tags["core:title"] = title;
      if (author) tags["core:creator"] = author;
      if (subject) tags["core:subject"] = subject;
      if (description) tags["core:description"] = description;
      if (keywords) tags["core:keywords"] = keywords;
      if (created) tags["core:created"] = created;
      if (modified) tags["core:modified"] = modified;
      if (lastModifiedBy) tags["core:lastModifiedBy"] = lastModifiedBy;
    }
  }

  if (app) {
    const bytes = await readZipEntryBytes(file, app);
    if (bytes) {
      const xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const doc = parseXml(xml);

      const application = textFromFirstTag(doc, "Application");
      const appVersion = textFromFirstTag(doc, "AppVersion");
      const company = textFromFirstTag(doc, "Company");

      if (!common.software && application) common.software = application;
      if (application) tags["app:Application"] = application;
      if (appVersion) tags["app:AppVersion"] = appVersion;
      if (company) tags["app:Company"] = company;
    }
  }

  return {
    common: Object.keys(common).length > 0 ? common : null,
    tags: Object.keys(tags).length > 0 ? tags : null,
  };
}

function parseSvgLength(value: string | null | undefined) {
  if (!value) return undefined;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function extractSvgMetadata(file: File): Promise<{
  common: FileMetadata["common"] | null;
  image: FileMetadata["image"] | undefined;
  tags: Record<string, string> | null;
}> {
  const MAX = 1024 * 1024;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(
    await file.slice(0, Math.min(file.size, MAX)).arrayBuffer()
  );
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.getElementsByTagName("svg")[0];
  const title = doc.getElementsByTagName("title")[0]?.textContent?.trim();
  const description = doc.getElementsByTagName("desc")[0]?.textContent?.trim();
  const tags: Record<string, string> = {};
  const common: NonNullable<FileMetadata["common"]> = {};

  if (title) common.title = title;
  if (description) common.description = description;

  const width = parseSvgLength(svg?.getAttribute("width"));
  const height = parseSvgLength(svg?.getAttribute("height"));
  const viewBox = svg?.getAttribute("viewBox")?.trim();
  let image: FileMetadata["image"] | undefined;

  if (width && height) {
    image = { width, height };
  } else if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts.every(Number.isFinite)) {
      const [, , w, h] = parts;
      if (w > 0 && h > 0) image = { width: w, height: h };
    }
  }

  if (viewBox) tags["svg:viewBox"] = viewBox;
  if (svg?.getAttribute("xmlns")) tags["svg:xmlns"] = svg.getAttribute("xmlns")!;
  if (svg?.getAttribute("version")) tags["svg:version"] = svg.getAttribute("version")!;

  return {
    common: Object.keys(common).length > 0 ? common : null,
    image,
    tags: Object.keys(tags).length > 0 ? tags : null,
  };
}

async function extractZipMetadata(
  file: File
): Promise<Record<string, string> | null> {
  const cd = await readZipCentralDirectory(file);
  if (!cd) return null;

  const names = Array.from(cd.keys()).sort((a, b) => a.localeCompare(b));
  const tags: Record<string, string> = {
    entries: String(names.length),
  };
  const contentTypes = names.find((name) => name === "[Content_Types].xml");
  const hasCore = names.some((name) => name === "docProps/core.xml");
  const hasApp = names.some((name) => name === "docProps/app.xml");

  if (contentTypes) tags["hasContentTypes"] = "true";
  if (hasCore) tags["hasDocPropsCore"] = "true";
  if (hasApp) tags["hasDocPropsApp"] = "true";
  tags["sampleEntries"] = names.slice(0, 12).join(", ");

  return tags;
}

async function extractTextMetadata(
  file: File,
  ext: string,
  effectiveType: string
): Promise<{
  common: FileMetadata["common"] | null;
  tags: Record<string, string> | null;
}> {
  const MAX = 1024 * 1024;
  const bytes = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX)).arrayBuffer()
  );
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const tags: Record<string, string> = {
    encoding: "utf-8/best-effort",
    sampledBytes: String(bytes.byteLength),
    lines: String(text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length),
    characters: String(text.length),
  };
  const common: NonNullable<FileMetadata["common"]> = {};

  if (ext === "json" || effectiveType === "application/json") {
    try {
      const parsed = JSON.parse(text);
      const kind = Array.isArray(parsed) ? "array" : typeof parsed;
      tags["json:topLevel"] = kind;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        tags["json:keys"] = Object.keys(parsed).slice(0, 30).join(", ");
      }
      if (parsed?.title && typeof parsed.title === "string") {
        common.title = parsed.title;
      }
      if (parsed?.description && typeof parsed.description === "string") {
        common.description = parsed.description;
      }
    } catch {
      tags["json:valid"] = "false";
    }
  }

  if (ext === "csv" || effectiveType === "text/csv") {
    const firstLine = text.split(/\r\n|\r|\n/).find((line) => line.trim());
    if (firstLine) {
      tags["csv:columns"] = String(firstLine.split(",").length);
      tags["csv:header"] = firstLine.slice(0, 512);
    }
  }

  if (ext === "html" || ext === "htm" || effectiveType === "text/html") {
    const title = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const description = text.match(
      /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i
    )?.[1];
    if (title) common.title = stripXmlTags(title);
    if (description) common.description = stripXmlTags(description);
  }

  return {
    common: Object.keys(common).length > 0 ? common : null,
    tags: Object.keys(tags).length > 0 ? tags : null,
  };
}

async function sniffMimeTypeFromMagic(file: File): Promise<string | null> {
  // Only need a tiny window for signature checks.
  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 128).arrayBuffer());
  } catch {
    return null;
  }

  // JPEG
  if (startsWithBytes(head, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // PNG
  if (startsWithBytes(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  // GIF
  const gif = readAsciiFromBytes(head, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  // BMP
  if (readAsciiFromBytes(head, 0, 2) === "BM") return "image/bmp";
  // TIFF
  if (
    startsWithBytes(head, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWithBytes(head, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return "image/tiff";
  }
  // ICO
  if (startsWithBytes(head, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon";
  // WebP (RIFF....WEBP)
  if (
    readAsciiFromBytes(head, 0, 4) === "RIFF" &&
    readAsciiFromBytes(head, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }
  // PDF
  if (readAsciiFromBytes(head, 0, 5) === "%PDF-") return "application/pdf";
  // MP3 (ID3)
  if (readAsciiFromBytes(head, 0, 3) === "ID3") return "audio/mpeg";
  if (readAsciiFromBytes(head, 0, 4) === "fLaC") return "audio/flac";
  if (readAsciiFromBytes(head, 0, 4) === "OggS") return "audio/ogg";
  if (
    readAsciiFromBytes(head, 0, 4) === "RIFF" &&
    readAsciiFromBytes(head, 8, 4) === "WAVE"
  ) {
    return "audio/wav";
  }
  if (startsWithBytes(head, [0x50, 0x4b, 0x03, 0x04])) return "application/zip";
  // MP4 (ftyp)
  if (readAsciiFromBytes(head, 4, 4) === "ftyp") {
    const brand = readAsciiFromBytes(head, 8, 4).trim();
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand))
      return "image/heic";
    if (brand === "qt") return "video/quicktime";
    return "video/mp4";
  }

  return null;
}

function isJpeg(file: File) {
  if (file.type === "image/jpeg") return true;
  const ext = getExtension(file.name);
  return ext === "jpg" || ext === "jpeg";
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256File(file: File) {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(new Uint8Array(hash));
}

function decodeAscii(bytes: Uint8Array) {
  let text = "";
  for (const b of bytes) {
    if (b === 0) break;
    text += String.fromCharCode(b);
  }
  return text;
}

function readString(view: DataView, offset: number, length: number) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  return decodeAscii(bytes);
}

function readRational(
  view: DataView,
  offset: number,
  littleEndian: boolean
): number | null {
  if (offset + 8 > view.byteLength) return null;
  const numerator = view.getUint32(offset, littleEndian);
  const denominator = view.getUint32(offset + 4, littleEndian);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function gpsToDecimal(
  dms: [number, number, number],
  ref: string
): number | null {
  const [deg, min, sec] = dms;
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec))
    return null;
  let value = deg + min / 60 + sec / 3600;
  if (ref === "S" || ref === "W") value *= -1;
  return value;
}

function extractJpegExifFromApp1(app1: ArrayBuffer): FileMetadata["exif"] {
  const view = new DataView(app1);
  if (view.byteLength < 14) return undefined;

  const preamble = readString(view, 0, 6);
  if (preamble !== "Exif") return undefined;

  const tiffOffset = 6;
  const endianMark = readString(view, tiffOffset, 2);
  const littleEndian = endianMark === "II";
  if (!littleEndian && endianMark !== "MM") return undefined;

  const magic = view.getUint16(tiffOffset + 2, littleEndian);
  if (magic !== 42) return undefined;

  const ifd0Rel = view.getUint32(tiffOffset + 4, littleEndian);
  const ifd0 = tiffOffset + ifd0Rel;
  if (ifd0 + 2 > view.byteLength) return undefined;

  const getValueOffset = (entryOffset: number) =>
    view.getUint32(entryOffset + 8, littleEndian);

  const readEntryValue = (entryOffset: number) => {
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueOffset = getValueOffset(entryOffset);

    const typeSize =
      type === 1 || type === 2 || type === 7
        ? 1
        : type === 3
          ? 2
          : type === 4 || type === 9
            ? 4
            : type === 5 || type === 10
              ? 8
              : 0;
    const byteCount = count * typeSize;

    const valuePtr =
      byteCount <= 4 ? entryOffset + 8 : tiffOffset + valueOffset;

    if (valuePtr < 0 || valuePtr + byteCount > view.byteLength) return null;

    return { tag, type, count, valuePtr, byteCount };
  };

  const readIfd = (ifdOffset: number) => {
    if (ifdOffset + 2 > view.byteLength) return [];
    const count = view.getUint16(ifdOffset, littleEndian);
    const entriesOffset = ifdOffset + 2;
    const entries: ReturnType<typeof readEntryValue>[] = [];
    for (let i = 0; i < count; i += 1) {
      const entryOffset = entriesOffset + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      entries.push(readEntryValue(entryOffset));
    }
    return entries;
  };

  const ifd0Entries = readIfd(ifd0);

  const exif: NonNullable<FileMetadata["exif"]> = {};

  const findEntry = (entries: ReturnType<typeof readIfd>, tag: number) =>
    entries.find((e) => e && e.tag === tag) ?? null;

  const readAscii = (entry: NonNullable<ReturnType<typeof readEntryValue>>) => {
    const raw = readString(view, entry.valuePtr, entry.byteCount);
    return raw.trim();
  };

  const readShort = (entry: NonNullable<ReturnType<typeof readEntryValue>>) => {
    if (entry.type !== 3 || entry.byteCount < 2) return null;
    return view.getUint16(entry.valuePtr, littleEndian);
  };

  const makeEntry = findEntry(ifd0Entries, 0x010f);
  if (makeEntry) exif.make = readAscii(makeEntry);
  const modelEntry = findEntry(ifd0Entries, 0x0110);
  if (modelEntry) exif.model = readAscii(modelEntry);
  const orientationEntry = findEntry(ifd0Entries, 0x0112);
  if (orientationEntry) {
    const value = readShort(orientationEntry);
    if (value != null) exif.orientation = value;
  }

  const exifIfdPtrEntry = findEntry(ifd0Entries, 0x8769);
  const gpsIfdPtrEntry = findEntry(ifd0Entries, 0x8825);

  if (exifIfdPtrEntry && exifIfdPtrEntry.type === 4) {
    const rel = view.getUint32(exifIfdPtrEntry.valuePtr, littleEndian);
    const exifIfd = tiffOffset + rel;
    const exifEntries = readIfd(exifIfd);
    const dtoEntry = findEntry(exifEntries, 0x9003);
    if (dtoEntry) exif.datetimeOriginal = readAscii(dtoEntry);
  }

  if (gpsIfdPtrEntry && gpsIfdPtrEntry.type === 4) {
    const rel = view.getUint32(gpsIfdPtrEntry.valuePtr, littleEndian);
    const gpsIfd = tiffOffset + rel;
    const gpsEntries = readIfd(gpsIfd);
    const latRefEntry = findEntry(gpsEntries, 0x0001);
    const latEntry = findEntry(gpsEntries, 0x0002);
    const lonRefEntry = findEntry(gpsEntries, 0x0003);
    const lonEntry = findEntry(gpsEntries, 0x0004);

    if (latRefEntry && latEntry && lonRefEntry && lonEntry) {
      const latRef = readAscii(latRefEntry).toUpperCase();
      const lonRef = readAscii(lonRefEntry).toUpperCase();

      const readDms = (
        entry: NonNullable<ReturnType<typeof readEntryValue>>
      ): [number, number, number] | null => {
        if (entry.type !== 5 || entry.count < 3) return null;
        const values: number[] = [];
        for (let i = 0; i < 3; i += 1) {
          const r = readRational(view, entry.valuePtr + i * 8, littleEndian);
          if (r == null) return null;
          values.push(r);
        }
        return [values[0], values[1], values[2]];
      };

      const latDms = readDms(latEntry);
      const lonDms = readDms(lonEntry);
      if (latDms && lonDms) {
        const lat = gpsToDecimal(latDms, latRef);
        const lon = gpsToDecimal(lonDms, lonRef);
        if (lat != null && lon != null) exif.gps = { lat, lon };
      }
    }
  }

  return Object.keys(exif).length ? exif : undefined;
}

async function extractJpegExif(file: File): Promise<FileMetadata["exif"]> {
  const maxScanBytes = Math.min(file.size, 1024 * 1024);
  const scanBuf = await file.slice(0, maxScanBytes).arrayBuffer();
  const scanView = new DataView(scanBuf);

  if (scanView.byteLength < 4) return undefined;
  if (scanView.getUint16(0, false) !== 0xffd8) return undefined;

  let offset = 2;
  while (offset + 4 <= scanView.byteLength) {
    if (scanView.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = scanView.getUint8(offset + 1);
    offset += 2;

    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > scanView.byteLength) break;

    const segmentLen = scanView.getUint16(offset, false);
    if (segmentLen < 2) break;
    const segmentStart = offset + 2;
    const segmentEnd = segmentStart + (segmentLen - 2);
    offset = segmentEnd;

    if (marker !== 0xe1) continue;

    const needsFullRead = segmentEnd > scanView.byteLength;
    const app1Buf = needsFullRead
      ? await file.slice(segmentStart, segmentEnd).arrayBuffer()
      : scanBuf.slice(segmentStart, segmentEnd);

    const exif = extractJpegExifFromApp1(app1Buf);
    if (exif) return exif;
  }

  return undefined;
}

async function getImageDimensions(
  file: File
): Promise<FileMetadata["image"] | undefined> {
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      const result = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return result;
    }
  } catch {
    // fall through to <img>
  }

  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function cleanImageMetadata(file: File): Promise<File> {
  const outputMime = outputMimeForCleanImage(file);
  const quality = outputMime === "image/jpeg" || outputMime === "image/webp" ? 0.95 : undefined;

  let width = 0;
  let height = 0;
  let draw: (ctx: CanvasRenderingContext2D) => void;

  try {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    draw = (ctx) => {
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image decode failed"));
        image.src = url;
      });
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      draw = (ctx) => ctx.drawImage(img, 0, 0);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (!width || !height) throw new Error("Image has no readable dimensions");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  draw(ctx);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputMime, quality)
  );
  if (!blob) throw new Error("Canvas export failed");

  return new File([blob], cleanedImageFilename(file.name, outputMime), {
    type: outputMime,
    lastModified: Date.now(),
  });
}

async function getVideoMetadata(
  file: File
): Promise<FileMetadata["video"] | undefined> {
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        duration: Number.isFinite(video.duration) ? video.duration : undefined,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

async function getAudioMetadata(
  file: File
): Promise<FileMetadata["audio"] | undefined> {
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve({
        duration: Number.isFinite(audio.duration) ? audio.duration : undefined,
      });
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

async function extractFileMetadata(
  file: File,
  path: string
): Promise<FileMetadata> {
  const ext = getExtension(file.name);

  const reportedType = file.type || "";
  const typeIsUnknown =
    reportedType.length === 0 || reportedType === "application/octet-stream";

  const inferred =
    inferMimeTypeFromExtension(ext) ??
    (typeIsUnknown ? await sniffMimeTypeFromMagic(file) : null);

  const effectiveType =
    (typeIsUnknown ? inferred : reportedType) ||
    inferred ||
    "application/octet-stream";

  const metadata: FileMetadata = {
    file: {
      name: file.name,
      path,
      size: file.size,
      type: effectiveType,
      lastModified: file.lastModified || undefined,
    },
    warnings: [],
    errors: [],
  };

  const common: NonNullable<FileMetadata["common"]> = {};
  const mergeCommon = (next: FileMetadata["common"] | null) => {
    if (!next) return;
    for (const [k, v] of Object.entries(next)) {
      if (v == null) continue;
      const key = k as keyof NonNullable<FileMetadata["common"]>;
      if (!common[key] && typeof v === "string" && v.trim())
        common[key] = v.trim();
    }
  };

  const tags: Record<string, string> = {};
  const mergeTags = (next: Record<string, string> | null, prefix?: string) => {
    if (!next) return;
    for (const [k, v] of Object.entries(next)) {
      const key = (prefix ? `${prefix}:${k}` : k).trim();
      const value = (v ?? "").trim();
      if (!key || !value) continue;
      if (tags[key] == null) tags[key] = value;
    }
  };
  const isOpenXmlDocument =
    ext === "docx" ||
    ext === "xlsx" ||
    ext === "pptx" ||
    effectiveType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    effectiveType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    effectiveType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const isTextLike =
    effectiveType.startsWith("text/") ||
    ["json", "csv", "md", "html", "htm", "xml", "yaml", "yml"].includes(ext) ||
    effectiveType === "application/json" ||
    effectiveType === "application/xml" ||
    effectiveType === "application/yaml";

  if (effectiveType.startsWith("image/")) {
    if (effectiveType === "image/svg+xml" || ext === "svg") {
      try {
        const svg = await extractSvgMetadata(file);
        metadata.image = svg.image ?? (await getImageDimensions(file));
        mergeCommon(svg.common);
        mergeTags(svg.tags, "svg");
      } catch {
        metadata.warnings?.push("No se pudo leer metadata SVG.");
        metadata.image = await getImageDimensions(file);
      }
    } else {
      metadata.image = await getImageDimensions(file);
    }
    if (isJpeg(file)) metadata.exif = await extractJpegExif(file);
    if (effectiveType === "image/png" || ext === "png") {
      try {
        mergeCommon(await extractPngCommon(file));
        mergeTags(await extractPngTextTags(file), "png");
      } catch {
        metadata.warnings?.push("No se pudo leer metadata PNG (tEXt/iTXt).");
      }
    }
    if (effectiveType === "image/jpeg" || ext === "jpg" || ext === "jpeg") {
      try {
        mergeCommon(await extractJpegXmpCommon(file));
      } catch {
        metadata.warnings?.push("No se pudo leer XMP en JPEG.");
      }
    }
  } else if (effectiveType.startsWith("video/")) {
    metadata.video = await getVideoMetadata(file);
  } else if (effectiveType.startsWith("audio/")) {
    metadata.audio = await getAudioMetadata(file);
    if (effectiveType === "audio/mpeg" || ext === "mp3") {
      try {
        mergeCommon(await extractMp3Id3Common(file));
      } catch {
        metadata.warnings?.push("No se pudo leer ID3 en MP3.");
      }
    }
  } else if (isOpenXmlDocument) {
    try {
      const docx = await extractDocxMetadata(file);
      mergeCommon(docx.common);
      mergeTags(docx.tags, ext || "openxml");
    } catch {
      metadata.warnings?.push(
        "No se pudo leer metadata OpenXML (docProps/core.xml)."
      );
    }
  } else if (effectiveType === "application/pdf" || ext === "pdf") {
    try {
      mergeCommon(await extractPdfCommon(file));
    } catch {
      metadata.warnings?.push(
        "No se pudo leer metadata PDF (Title/Author/Subject/Keywords)."
      );
    }
  } else if (effectiveType === "application/zip" || ext === "zip") {
    try {
      mergeTags(await extractZipMetadata(file), "zip");
    } catch {
      metadata.warnings?.push("No se pudo leer índice ZIP.");
    }
  }

  if (isTextLike && ext !== "svg") {
    try {
      const textMeta = await extractTextMetadata(file, ext, effectiveType);
      mergeCommon(textMeta.common);
      mergeTags(textMeta.tags, "text");
    } catch {
      metadata.warnings?.push("No se pudo leer metadata textual.");
    }
  }

  if (Object.keys(common).length > 0) metadata.common = common;
  if (Object.keys(tags).length > 0) metadata.tags = tags;
  if (metadata.warnings?.length === 0) delete metadata.warnings;
  if (metadata.errors?.length === 0) delete metadata.errors;
  return metadata;
}

function MapPreview({ gps }: { gps: { lat: number; lon: number } }) {
  const width = 320;
  const height = 160;

  const x = ((gps.lon + 180) / 360) * width;
  const y = ((90 - gps.lat) / 180) * height;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}#map=12/${gps.lat}/${gps.lon}`;

  return (
    <div className="rounded-lg border border-zinc-200/80 dark:border-white/10 bg-white/85 dark:bg-zinc-950/35 backdrop-blur p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
          Ubicación
        </div>
        <a
          className="text-xs underline decoration-zinc-300 hover:decoration-zinc-500 dark:decoration-white/20 dark:hover:decoration-white/60"
          href={osmUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir mapa
        </a>
      </div>
      <div className="mt-2">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto rounded-md bg-gradient-to-br from-slate-50 to-slate-200 dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200/80 dark:border-white/10"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(148,163,184,0.35)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <circle cx={x} cy={y} r={6} fill="rgba(239, 68, 68, 0.9)" />
          <circle cx={x} cy={y} r={12} fill="rgba(239, 68, 68, 0.25)" />
        </svg>
        <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 font-mono">
          lat {gps.lat.toFixed(6)} · lon {gps.lon.toFixed(6)}
        </div>
      </div>
    </div>
  );
}

function classNames(...values: Array<string | boolean | undefined | null>) {
  return values.filter(Boolean).join(" ");
}

function withoutRecordKeys<T>(record: Record<string, T>, keys: string[]) {
  if (keys.length === 0) return record;
  const remove = new Set(keys);
  let changed = false;
  const next: Record<string, T> = {};

  for (const [key, value] of Object.entries(record)) {
    if (remove.has(key)) {
      changed = true;
      continue;
    }
    next[key] = value;
  }

  return changed ? next : record;
}

function getImportSelection(result: MergeVirtualFilesResult) {
  if (result.addedFileIds.length > 0) return result.addedFileIds;
  if (result.updatedFileIds.length > 0) return result.updatedFileIds;
  if (result.duplicateFileIds.length > 0) return result.duplicateFileIds;
  return result.touchedFolderIds;
}

const CLEANABLE_IMAGE_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "svg",
  "avif",
]);

function isProbablyCleanableImage(node: ExplorerNode | undefined) {
  if (!node || node.kind !== "file") return false;
  const ext = getExtension(node.name);
  if (CLEANABLE_IMAGE_EXTS.has(ext)) return true;
  if (node.fileLike.kind === "file" && node.fileLike.file.type.startsWith("image/")) {
    return true;
  }
  return false;
}

function replacePathFilename(path: string, filename: string) {
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return filename;
  parts[parts.length - 1] = filename;
  return parts.join("/");
}

function cleanedImageFilename(name: string, mimeType: string) {
  const ext =
    mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "imagen"}-clean.${ext}`;
}

function outputMimeForCleanImage(file: File) {
  const ext = getExtension(file.name);
  if (file.type === "image/jpeg" || ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (file.type === "image/webp" || ext === "webp") return "image/webp";
  return "image/png";
}

type SaveFileHandleLike = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void> | void;
    close: () => Promise<void> | void;
  }>;
};

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function cleanImageAcceptType(mimeType: string) {
  if (mimeType === "image/jpeg") return { [mimeType]: [".jpg", ".jpeg"] };
  if (mimeType === "image/webp") return { [mimeType]: [".webp"] };
  return { "image/png": [".png"] };
}

async function pickCleanImageSaveHandle(file: File) {
  const picker =
    typeof window !== "undefined" ? (window as any).showSaveFilePicker : null;
  if (typeof picker !== "function") return null;

  const outputMime = outputMimeForCleanImage(file);
  const suggestedName = cleanedImageFilename(file.name, outputMime);
  return (await picker({
    suggestedName,
    types: [
      {
        description: "Imagen sin metadata",
        accept: cleanImageAcceptType(outputMime),
      },
    ],
  })) as SaveFileHandleLike;
}

async function writeCleanFileToHandle(
  handle: SaveFileHandleLike,
  file: File
) {
  const writable = await handle.createWritable();
  try {
    await writable.write(file);
  } finally {
    await writable.close();
  }
}

type DropItemSnapshot = {
  kind: string;
  type: string;
  file: File | null;
  legacyEntry: any;
  handlePromise: Promise<any> | null;
};

type FolderOpenResult = "opened" | "cancelled" | "unsupported" | "failed";

function captureDropItem(item: any): DropItemSnapshot {
  return {
    kind: item?.kind || "",
    type: item?.type || "",
    file:
      item?.kind === "file" && typeof item.getAsFile === "function"
        ? item.getAsFile()
        : null,
    legacyEntry:
      typeof item?.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null,
    handlePromise:
      typeof item?.getAsFileSystemHandle === "function"
        ? item.getAsFileSystemHandle()
        : null,
  };
}

function NodeRow({
  node,
  depth,
  isSelected,
  onToggle,
  onSelect,
  onContextMenu,
}: {
  node: ExplorerNode;
  depth: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const copy = useMetadataUi();
  const paddingLeft = 12 + depth * 14;
  const isFolder = node.kind === "folder";

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      className={classNames(
        "flex items-center gap-2 px-2 py-1 rounded-md text-sm cursor-default select-none group",
        isSelected
          ? "bg-zinc-200/70 dark:bg-white/10"
          : "hover:bg-zinc-200/40 dark:hover:bg-white/5"
      )}
      style={{ paddingLeft }}
      onClick={(e: React.MouseEvent) => onSelect(node.id, e)}
      onContextMenu={(e: React.MouseEvent) => onContextMenu?.(e, node.id)}
    >
      {isFolder ? (
        <button
          type="button"
          className="shrink-0 w-4 h-4 grid place-items-center text-zinc-500 dark:text-zinc-400"
          aria-label={node.isExpanded ? copy.collapseFolder : copy.expandFolder}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
        >
          <span className="text-xs">{node.isExpanded ? "▾" : "▸"}</span>
        </button>
      ) : (
        <span className="shrink-0 w-4 h-4" />
      )}

      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
        {isFolder ? "📁" : "📄"}
      </span>

      <span className="truncate">{node.name}</span>

      {node.kind === "folder" && node.isLoading && (
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          …
        </span>
      )}
    </div>
  );
}

export default function MetadataApp({ lang = "en" }: { lang?: string }) {
  const ui = getMetadataCopy(lang).ui;
  const formatCopy = (value: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((text, [key, replacement]) => text.replace(`{${key}}`, String(replacement)), value);
  const [supportsDirectoryPicker, setSupportsDirectoryPicker] = useState(false);

  const [nodes, setNodes] = useState<Record<string, ExplorerNode>>({});
  const [, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, Record<string, any>>
  >({});

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<InspectorTab>("details");
  const [metadataByNodeId, setMetadataByNodeId] = useState<
    Record<string, FileMetadata>
  >({});
  const [cleanRevision, setCleanRevision] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const nodesRef = useRef<Record<string, ExplorerNode>>({});
  const workspaceRevisionRef = useRef(0);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const rootIds = useMemo(() => {
    return Object.values(nodes)
      .filter((n) => n.parentId === null)
      .map((n) => n.id);
  }, [nodes]);

  const selectedPrimaryId = selectedIds[0] ?? null;
  const selectedPrimary = selectedPrimaryId ? nodes[selectedPrimaryId] : null;

  useEffect(() => {
    setSupportsDirectoryPicker(
      typeof window !== "undefined" &&
        typeof (window as any).showDirectoryPicker === "function"
    );

    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.setAttribute("mozdirectory", "");
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    (input as any).mozdirectory = true;
  }, []);

  const visibleNodeIds = useMemo(() => {
    const ids: string[] = [];
    const visit = (nodeId: string, depth: number) => {
      const node = nodes[nodeId];
      if (!node) return;
      ids.push(nodeId);
      if (node.kind !== "folder" || !node.isExpanded) return;
      for (const childId of node.childrenIds) visit(childId, depth + 1);
    };

    for (const rootId of rootIds) {
      visit(rootId, 0);
    }
    return ids;
  }, [nodes]);

  const nodeDepths = useMemo(() => {
    const depths: Record<string, number> = {};
    const visit = (nodeId: string, depth: number) => {
      const node = nodes[nodeId];
      if (!node) return;
      depths[nodeId] = depth;
      if (node.kind !== "folder" || !node.isExpanded) return;
      for (const childId of node.childrenIds) visit(childId, depth + 1);
    };
    for (const rootId of rootIds) {
      visit(rootId, 0);
    }
    return depths;
  }, [nodes]);

  const resolveFile = async (node: ExplorerNode): Promise<File | null> => {
    if (node.kind !== "file") return null;
    if (node.fileLike.kind === "file") return node.fileLike.file;
    try {
      const file = await node.fileLike.handle.getFile();
      return file as File;
    } catch {
      return null;
    }
  };

  const applyVirtualImport = (result: MergeVirtualFilesResult) => {
    nodesRef.current = result.nodes;
    const nextSelection = getImportSelection(result);
    setNodes(result.nodes);

    if (nextSelection.length > 0) {
      setSelectedIds([nextSelection[0]]);
      setActiveTab("details");
    }

    if (result.updatedFileIds.length > 0) {
      setMetadataByNodeId((prev) =>
        withoutRecordKeys(prev, result.updatedFileIds)
      );
      setPendingEdits((prev) => withoutRecordKeys(prev, result.updatedFileIds));
    }
  };

  const addVirtualEntries = (entries: VirtualImportEntry[]) => {
    if (entries.length === 0) return;
    const result = mergeVirtualEntries(nodesRef.current, entries, createId);
    applyVirtualImport(result);
  };

  const addVirtualFiles = (files: File[]) => {
    if (files.length === 0) return;
    const result = mergeVirtualFiles(nodesRef.current, files, createId);
    applyVirtualImport(result);
  };

  const traverseFileTree = async (
    item: any,
    path: string = ""
  ): Promise<VirtualImportEntry[]> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          const filePath =
            typeof item.fullPath === "string" && item.fullPath
              ? item.fullPath
              : path + file.name;
          setDroppedRelativePath(file, filePath);
          resolve([{ kind: "file", file, path: filePath }]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const directoryPath = normalizeRelativePath(
          typeof item.fullPath === "string" && item.fullPath
            ? item.fullPath
            : path + item.name
        );
        const entries: VirtualImportEntry[] = [
          { kind: "folder", path: directoryPath },
        ];

        const readEntries = () => {
          dirReader.readEntries(
            async (results: any[]) => {
              if (!results.length) {
                resolve(entries);
              } else {
                for (const entry of results) {
                  const subEntries = await traverseFileTree(
                    entry,
                    `${directoryPath}/`
                  );
                  entries.push(...subEntries);
                }
                readEntries(); // Continue reading in case of large directories
              }
            },
            () => {
              resolve(entries);
            }
          );
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const traverseFileSystemHandle = async (
    handle: any,
    parentPath: string = ""
  ): Promise<VirtualImportEntry[]> => {
    const name = typeof handle?.name === "string" ? handle.name : "";
    const path = normalizeRelativePath(buildPath(parentPath, name));

    if (handle?.kind === "file") {
      try {
        const file = await handle.getFile();
        return [{ kind: "file", file, path: path || file.name }];
      } catch {
        return [];
      }
    }

    if (handle?.kind !== "directory" || !path) return [];

    const entries: VirtualImportEntry[] = [{ kind: "folder", path }];
    try {
      for await (const [, child] of handle.entries()) {
        entries.push(...(await traverseFileSystemHandle(child, path)));
      }
    } catch {
      // Keep the folder visible even if the browser refuses to enumerate it.
    }

    return entries;
  };

  const readDropItemEntries = async ({
    file,
    handlePromise,
    legacyEntry,
  }: DropItemSnapshot): Promise<VirtualImportEntry[]> => {
    if (handlePromise) {
      try {
        const handle = await handlePromise;
        const entries = await traverseFileSystemHandle(handle);
        if (entries.length > 0) return entries;
      } catch {
        // Fall back to legacy drag APIs below.
      }
    }

    if (legacyEntry) return traverseFileTree(legacyEntry);

    return file ? [{ kind: "file", file }] : [];
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const importRevision = workspaceRevisionRef.current;
    const items = Array.from(e.dataTransfer.items || []).map(captureDropItem);
    const fallbackFiles = Array.from(e.dataTransfer.files || []);
    let importEntries: VirtualImportEntry[] = [];

    const promises = items.map(readDropItemEntries);

    if (promises.length > 0) {
      const results = await Promise.all(promises);
      importEntries = results.flat();
    }

    if (fallbackFiles.length > 0) {
      for (const file of fallbackFiles) {
        const alreadyListed = importEntries.some(
          (entry) => entry.kind === "file" && entry.file === file
        );
        if (!alreadyListed) importEntries.push({ kind: "file", file });
      }
    }

    console.info("[Holi Metadata] Drop parsed", {
      items: items.map((item) => ({
        kind: item.kind,
        type: item.type,
        file: item.file?.name || null,
        hasLegacyEntry: Boolean(item.legacyEntry),
        legacyIsDirectory: Boolean(item.legacyEntry?.isDirectory),
        legacyName: item.legacyEntry?.name || null,
        hasFileSystemHandle: Boolean(item.handlePromise),
      })),
      fallbackFiles: fallbackFiles.map((file) => file.name),
      entries: importEntries.map((entry) =>
        entry.kind === "folder"
          ? { kind: "folder", path: entry.path }
          : { kind: "file", name: entry.file.name, path: entry.path || "" }
      ),
    });

    if (
      importEntries.length > 0 &&
      workspaceRevisionRef.current === importRevision
    ) {
      addVirtualEntries(importEntries);
    }
  };

  const loadFsFolderChildren = async (
    folderId: string,
    folderOverride?: Extract<ExplorerNode, { kind: "folder" }>,
    importRevision = workspaceRevisionRef.current
  ) => {
    const parent = folderOverride ?? nodes[folderId];
    if (!parent || parent.kind !== "folder" || parent.source !== "fs") return;
    if (parent.isLoaded || parent.isLoading) return;
    if (!parent.dirHandle) return;

    setNodes((prev) => {
      if (workspaceRevisionRef.current !== importRevision) return prev;
      const next: Record<string, ExplorerNode> = { ...prev };
      const n = next[folderId];
      if (n && n.kind === "folder") {
        next[folderId] = { ...n, isLoading: true };
      }
      return next;
    });

    try {
      const dirHandle = parent.dirHandle;

      const children: ExplorerNode[] = [];
      let pending: ExplorerNode[] = [];
      const BATCH_SIZE = 200;

      const flush = (batch: ExplorerNode[]) => {
        if (batch.length === 0) return;
        setNodes((prev) => {
          if (workspaceRevisionRef.current !== importRevision) return prev;
          const next: Record<string, ExplorerNode> = { ...prev };
          const n = next[folderId];
          if (!n || n.kind !== "folder") return prev;
          for (const child of batch) next[child.id] = child;
          next[folderId] = {
            ...n,
            childrenIds: [...n.childrenIds, ...batch.map((c) => c.id)],
          };
          return next;
        });
      };

      for await (const [name, handle] of dirHandle.entries()) {
        if (typeof name !== "string") continue;
        if (name === "." || name === "..") continue;
        if (name.startsWith(".") && name !== ".well-known") continue;

        if (handle.kind === "directory") {
          const node: ExplorerNode = {
            id: createId(),
            kind: "folder",
            source: "fs",
            name,
            parentId: folderId,
            path: buildPath(parent.path, name),
            childrenIds: [],
            isExpanded: false,
            isLoaded: false,
            isLoading: false,
            dirHandle: handle,
          };
          children.push(node);
          pending.push(node);
        } else if (handle.kind === "file") {
          const node: ExplorerNode = {
            id: createId(),
            kind: "file",
            source: "fs",
            name,
            parentId: folderId,
            path: buildPath(parent.path, name),
            fileLike: { kind: "handle", handle },
          };
          children.push(node);
          pending.push(node);
        }

        if (pending.length >= BATCH_SIZE) {
          flush(pending);
          pending = [];
        }
      }

      flush(pending);

      children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setNodes((prev) => {
        if (workspaceRevisionRef.current !== importRevision) return prev;
        const next: Record<string, ExplorerNode> = { ...prev };
        const n = next[folderId];
        if (!n || n.kind !== "folder") return prev;

        next[folderId] = {
          ...n,
          childrenIds: children.map((c) => c.id),
          isLoaded: true,
          isLoading: false,
        };
        return next;
      });
    } finally {
      setNodes((prev) => {
        if (workspaceRevisionRef.current !== importRevision) return prev;
        const next: Record<string, ExplorerNode> = { ...prev };
        const n = next[folderId];
        if (n && n.kind === "folder") {
          next[folderId] = { ...n, isLoading: false };
        }
        return next;
      });
    }
  };

  const toggleFolder = async (folderId: string) => {
    const folder = nodes[folderId];
    if (!folder || folder.kind !== "folder") return;

    const willExpand = !folder.isExpanded;
    setNodes((prev) => {
      const next: Record<string, ExplorerNode> = { ...prev };
      const n = next[folderId];
      if (n && n.kind === "folder") n.isExpanded = !n.isExpanded;
      return next;
    });

    if (
      willExpand &&
      folder.source === "fs" &&
      !folder.isLoaded &&
      !folder.isLoading
    ) {
      await loadFsFolderChildren(folderId);
    }
  };

  const handleSelectNode = (id: string, e: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const multi = e.metaKey || e.ctrlKey;
      if (!multi) return [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const openFiles = () => fileInputRef.current?.click();
  const openFolderVirtual = () => folderInputRef.current?.click();

  const openFolderFs = async (): Promise<FolderOpenResult> => {
    const picker =
      typeof window !== "undefined" ? (window as any).showDirectoryPicker : null;
    if (typeof picker !== "function") {
      setSupportsDirectoryPicker(false);
      return "unsupported";
    }

    const importRevision = workspaceRevisionRef.current;
    let dir: any;
    try {
      dir = await picker({ mode: "read" });
    } catch (error) {
      if (isAbortError(error)) return "cancelled";
      console.warn("[Holi Metadata] Folder picker failed", error);
      setSupportsDirectoryPicker(false);
      return "failed";
    }

    if (!dir) return "cancelled";
    setSupportsDirectoryPicker(true);
    if (workspaceRevisionRef.current !== importRevision) return "cancelled";

    const existingFolder = Object.values(nodesRef.current).find(
      (node) =>
        node.kind === "folder" &&
        node.source === "fs" &&
        node.parentId === null &&
        node.name === (dir.name || "Folder")
    ) as Extract<ExplorerNode, { kind: "folder" }> | undefined;

    if (existingFolder) {
      setNodes((prev) => {
        const folder = prev[existingFolder.id];
        if (!folder || folder.kind !== "folder") return prev;
        const next = {
          ...prev,
          [existingFolder.id]: {
            ...folder,
            isExpanded: true,
          },
        };
        nodesRef.current = next;
        return next;
      });
      setSelectedIds([existingFolder.id]);
      await loadFsFolderChildren(existingFolder.id, {
        ...existingFolder,
        isExpanded: true,
      }, importRevision);
      return "opened";
    }

    const folderId = createId();
    const folder: ExplorerNode = {
      id: folderId,
      kind: "folder",
      source: "fs",
      name: dir.name || "Folder",
      parentId: null,
      path: dir.name || "Folder",
      childrenIds: [],
      isExpanded: true,
      isLoaded: false,
      isLoading: false,
      dirHandle: dir,
    };

    setNodes((prev) => {
      const next = {
        ...prev,
        [folderId]: folder,
      };
      nodesRef.current = next;
      return next;
    });
    setSelectedIds([folderId]);
    await loadFsFolderChildren(folderId, folder, importRevision);
    return "opened";
  };

  const openFolder = async () => {
    const result = await openFolderFs();
    if (result === "opened" || result === "cancelled") return;
    openFolderVirtual();
  };

  const clearAll = () => {
    workspaceRevisionRef.current += 1;
    nodesRef.current = {};
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
    setNodes({});
    setSelectedIds([]);
    setMetadataByNodeId({});
    setPendingEdits({});
    setContextMenu(null);
    setActiveTab("details");
  };

  useEffect(() => {
    const primary = selectedPrimary;
    if (!primary || primary.kind !== "file") return;
    if (metadataByNodeId[primary.id]) return;
    const metadataRevision = workspaceRevisionRef.current;

    let cancelled = false;
    (async () => {
      const file = await resolveFile(primary);
      if (!file) return;
      const md = await extractFileMetadata(file, primary.path);
      if (cancelled || workspaceRevisionRef.current !== metadataRevision) return;
      setMetadataByNodeId((prev) => ({ ...prev, [primary.id]: md }));
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPrimary, metadataByNodeId]);

  const selectionFileIds = useMemo(() => {
    const out = new Set<string>();

    const collect = (nodeId: string) => {
      const node = nodes[nodeId];
      if (!node) return;
      if (node.kind === "file") {
        out.add(nodeId);
        return;
      }
      for (const childId of node.childrenIds) collect(childId);
    };

    for (const id of selectedIds) collect(id);
    return Array.from(out);
  }, [nodes, selectedIds]);

  const cleanableFileIds = useMemo(() => {
    return selectionFileIds.filter((id) => isProbablyCleanableImage(nodes[id]));
  }, [nodes, selectionFileIds]);

  const selectionSummary = useMemo(() => {
    const files = selectionFileIds
      .map((id) => nodes[id])
      .filter(
        (n): n is Extract<ExplorerNode, { kind: "file" }> =>
          !!n && n.kind === "file"
      );

    const totalSize = files.reduce((sum, n) => {
      if (n.fileLike.kind === "file") return sum + n.fileLike.file.size;
      return sum;
    }, 0);

    const byType: Record<string, number> = {};
    for (const n of files) {
      const type =
        n.fileLike.kind === "file"
          ? n.fileLike.file.type || getExtension(n.name) || "unknown"
          : getExtension(n.name) || "file";
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return {
      count: files.length,
      totalSize,
      byType: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    };
  }, [nodes, selectionFileIds]);

  const selectedMetadata = selectedPrimaryId
    ? metadataByNodeId[selectedPrimaryId]
    : undefined;
  const privacyFindings = useMemo(() => {
    if (!selectedMetadata) return [];
    const labels: Record<string, string> = {
      gps: ui.gps,
      author: ui.author,
      timestamps: `${ui.created} / ${ui.modified}`,
      software: ui.software,
      "office-org": "Office",
    };
    return getPrivacyFindings(selectedMetadata).map((finding) => ({
      ...finding,
      title: labels[finding.id] ?? finding.title,
      detail: ui.findingDetail,
    }));
  }, [selectedMetadata, ui]);
  const privacyScore = useMemo(
    () => getPrivacyScore(privacyFindings),
    [privacyFindings]
  );

  const selectedObjectUrl = useObjectUrl(async () => {
    if (!selectedPrimary || selectedPrimary.kind !== "file") return null;
    const file = await resolveFile(selectedPrimary);
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [selectedPrimaryId, selectedPrimary?.path, cleanRevision]);

  const selectedPreviewKind = useMemo(() => {
    if (!selectedPrimary || selectedPrimary.kind !== "file") return null;

    const explicitType =
      selectedMetadata?.file.type ||
      (selectedPrimary.fileLike.kind === "file"
        ? selectedPrimary.fileLike.file.type
        : "");
    if (explicitType) return explicitType;

    const ext = getExtension(selectedPrimary.name);
    const imageExts = new Set([
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "avif",
      "heic",
      "heif",
    ]);
    const videoExts = new Set(["mp4", "mov", "webm", "mkv"]);
    const audioExts = new Set(["mp3", "wav", "m4a", "flac", "ogg", "aac"]);

    if (imageExts.has(ext)) return "image/*";
    if (videoExts.has(ext)) return "video/*";
    if (audioExts.has(ext)) return "audio/*";
    return "application/octet-stream";
  }, [selectedMetadata?.file.type, selectedPrimary, selectedPrimaryId]);

  const centerTitle = useMemo(() => {
    if (Object.keys(nodes).length === 0) return "";
    if (selectedIds.length === 0) return ui.dropFiles;
    if (selectedIds.length > 1)
      return `${selectionSummary.count} ${ui.selectedFiles}`;
    if (!selectedPrimary) return "";
    return selectedPrimary.name;
  }, [nodes, selectedIds, selectedPrimary, selectionSummary.count, ui]);

  const canExport = selectionFileIds.length > 0;
  const canClean = cleanableFileIds.length > 0 && !isCleaning;
  const canDownloadSelected = selectedPrimary?.kind === "file";

  const exportSelectionJson = async () => {
    const rows: any[] = [];
    for (const fileId of selectionFileIds) {
      const node = nodes[fileId];
      if (!node || node.kind !== "file") continue;
      let md = metadataByNodeId[fileId];
      if (!md) {
        const file = await resolveFile(node);
        if (!file) continue;
        md = await extractFileMetadata(file, node.path);
      }

      const edits = pendingEdits[fileId] || {};

      rows.push({
        ...md,
        common: {
          ...md.common,
          ...edits,
        },
      });
    }
    downloadJson("metadata-report.json", rows);
  };

  const exportSelectionCsv = async () => {
    const rows: Record<string, any>[] = [];
    for (const fileId of selectionFileIds) {
      const node = nodes[fileId];
      if (!node || node.kind !== "file") continue;
      let md = metadataByNodeId[fileId];
      if (!md) {
        const file = await resolveFile(node);
        if (!file) continue;
        md = await extractFileMetadata(file, node.path);
      }
      const edits = pendingEdits[fileId] || {};
      const common = { ...md.common, ...edits };

      rows.push({
        path: md.file.path,
        name: md.file.name,
        type: md.file.type,
        size: md.file.size,
        title: common.title,
        author: common.author,
        subject: common.subject,
        keywords: common.keywords,
        software: common.software,
        width: md.image?.width,
        height: md.image?.height,
        make: md.exif?.make,
        model: md.exif?.model,
        datetimeOriginal: md.exif?.datetimeOriginal,
        gpsLat: md.exif?.gps?.lat,
        gpsLon: md.exif?.gps?.lon,
      });
    }
    downloadCsv("metadata-report.csv", rows);
  };

  const cleanSelectedImages = async () => {
    if (isCleaning) return;
    if (cleanableFileIds.length === 0) {
      window.alert(ui.cleanSelectAlert);
      return;
    }

    setIsCleaning(true);
    const cleaned: Array<{ id: string; file: File }> = [];
    const failed: string[] = [];
    let usedDownloadFallback = false;
    const preferSaveDialog = cleanableFileIds.length === 1;

    try {
      for (const id of cleanableFileIds) {
        const node = nodesRef.current[id];
        if (!node || node.kind !== "file") continue;

        const file = await resolveFile(node);
        if (!file) {
          failed.push(node.name);
          continue;
        }

        try {
          let saveHandle: SaveFileHandleLike | null = null;
          if (preferSaveDialog) {
            try {
              saveHandle = await pickCleanImageSaveHandle(file);
            } catch (error) {
              if (isAbortError(error)) return;
              console.warn("[Holi Metadata] Save picker failed", error);
            }
          }

          const cleanFile = await cleanImageMetadata(file);
          if (saveHandle) {
            try {
              await writeCleanFileToHandle(saveHandle, cleanFile);
            } catch (error) {
              console.warn("[Holi Metadata] Save failed, downloading instead", error);
              downloadBlob(cleanFile.name, cleanFile);
              usedDownloadFallback = true;
            }
          } else {
            downloadBlob(cleanFile.name, cleanFile);
            usedDownloadFallback = true;
          }

          cleaned.push({ id, file: cleanFile });
        } catch {
          failed.push(node.name);
        }
      }

      if (cleaned.length > 0) {
        const cleanedIds = cleaned.map((item) => item.id);
        setNodes((prev) => {
          const next: Record<string, ExplorerNode> = { ...prev };
          for (const { id, file } of cleaned) {
            const node = next[id];
            if (!node || node.kind !== "file") continue;
            next[id] = {
              ...node,
              name: file.name,
              path: replacePathFilename(node.path, file.name),
              fileLike: { kind: "file", file },
            };
          }
          nodesRef.current = next;
          return next;
        });
        setMetadataByNodeId((prev) => withoutRecordKeys(prev, cleanedIds));
        setPendingEdits((prev) => withoutRecordKeys(prev, cleanedIds));
        setCleanRevision((value) => value + 1);
        setActiveTab(usedDownloadFallback ? "export" : "details");
      }

      if (failed.length > 0) {
        window.alert(formatCopy(ui.cleanFailed, {
          count: failed.length,
          names: failed.slice(0, 4).join(", "),
        }));
      }
    } finally {
      setIsCleaning(false);
    }
  };

  const downloadSelectedFile = async () => {
    if (!selectedPrimary || selectedPrimary.kind !== "file") return;
    const file = await resolveFile(selectedPrimary);
    if (!file) {
      window.alert(ui.downloadError);
      return;
    }
    downloadBlob(file.name, file);
  };

  const computeSelectedSha256 = async () => {
    if (!selectedPrimary || selectedPrimary.kind !== "file") return;
    const file = await resolveFile(selectedPrimary);
    if (!file) return;

    const tooBig = file.size > 200 * 1024 * 1024;
    if (tooBig) {
      const ok = window.confirm(formatCopy(ui.shaWarning, { size: formatBytes(file.size) }));
      if (!ok) return;
    }

    const hash = await sha256File(file);
    setMetadataByNodeId((prev) => {
      const current = prev[selectedPrimary.id] ?? {
        file: {
          name: file.name,
          path: selectedPrimary.path,
          size: file.size,
          type: file.type || "application/octet-stream",
          lastModified: file.lastModified || undefined,
        },
      };
      return {
        ...prev,
        [selectedPrimary.id]: {
          ...current,
          forensic: { ...(current.forensic ?? {}), sha256: hash },
        },
      };
    });
  };

  const handleEditField = (nodeId: string, field: string, value: string) => {
    setPendingEdits((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] || {}),
        [field]: value,
      },
    }));
  };

  const hasPendingEdits = Object.keys(pendingEdits).length > 0;

  return (
    <MetadataI18nContext.Provider value={ui}>
    <div
      className="metadata-app h-[100dvh] w-full flex flex-col overflow-hidden relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
    >
      <div className="metadata-topbar-wrap">
        <header className="metadata-topbar">
          <div className="metadata-brand">
            <span className="metadata-brand-mark" aria-hidden="true">◇</span>
            <div className="metadata-brand-copy">
              <strong>Holi Metadata</strong>
              <span>{ui.tagline}</span>
            </div>
          </div>

          <div className="metadata-actions">
            <button
              type="button"
              className="metadata-action metadata-action-primary"
              onClick={openFiles}
            >
              {ui.openFiles}
            </button>
            <button
              type="button"
              className="metadata-action"
              onClick={openFolder}
              title={
                supportsDirectoryPicker
                  ? ui.selectFolder
                  : ui.legacyFolder
              }
            >
              {ui.addFolder}
            </button>
            {Object.keys(nodes).length > 0 && (
              <>
                <span className="metadata-action-divider" aria-hidden="true"></span>
                <button
                  type="button"
                  className={classNames("metadata-action metadata-action-clean", !canClean && "is-disabled")}
                  onClick={(e) => {
                    e.stopPropagation();
                    cleanSelectedImages();
                  }}
                  disabled={!canClean}
                  title={canClean ? ui.cleanHint : ui.cleanDisabled}
                >
                  {isCleaning ? ui.cleaning : ui.clean}
                </button>
                <button
                  type="button"
                  className="metadata-action metadata-action-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  title={ui.clearTitle}
                >
                  {ui.clear}
                </button>
              </>
            )}
          </div>
        </header>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files || []);
          addVirtualFiles(files);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        {...({ webkitdirectory: "", directory: "", mozdirectory: "" } as any)}
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files || []);
          console.info("[Holi Metadata] Folder input parsed", {
            count: files.length,
            sampleRelativePaths: files
              .slice(0, 5)
              .map((file) => (file as any).webkitRelativePath || ""),
          });
          addVirtualFiles(files);
          e.currentTarget.value = "";
        }}
      />

      <div className="metadata-workspace flex flex-1 min-h-0 relative">
        {/* Empty State Dropzone over center if no files */}
        {Object.keys(nodes).length === 0 && (
          <div className="metadata-empty">
            <section className="metadata-empty-layout" aria-labelledby="metadata-empty-title">
              <div className="metadata-empty-copy">
                <p className="metadata-eyebrow">Holi Metadata · {ui.privacy}</p>
                <h1 id="metadata-empty-title">{ui.emptyTitle}</h1>
                <p className="metadata-empty-intro">{ui.emptyBody}</p>
                <div className="metadata-local-note"><span aria-hidden="true"></span>{ui.tagline}</div>
                <div className="metadata-formats" aria-label={ui.type}>
                  <span>EXIF</span><span>PDF</span><span>SVG</span><span>MP3</span><span>ZIP</span>
                </div>
              </div>

              <div
                className="metadata-drop-card"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={handleDrop}
              >
                <div className="metadata-drop-icon" aria-hidden="true">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
                  </svg>
                </div>
                <div className="metadata-drop-copy">
                  <strong>{ui.dropFiles}</strong>
                  <span>{ui.image} · {ui.video} · {ui.audio} · PDF</span>
                </div>
                <div className="metadata-drop-actions">
                  <button type="button" onClick={(e) => { e.stopPropagation(); openFiles(); }}>
                    {ui.selectFiles}<span aria-hidden="true">↗</span>
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); openFolder(); }}>
                    {ui.selectFolders}<span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        <aside
          className={classNames(
            "w-[300px] shrink-0 border-r border-white/20 dark:border-white/10 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl overflow-auto shadow-r-xl transition-transform duration-500 z-10",
            Object.keys(nodes).length === 0 &&
              "-translate-x-full absolute h-full"
          )}
        >
          <div className="p-4 pt-6 text-xs font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            {ui.explorer}
          </div>

          <div role="tree" className="px-2 pb-6 space-y-0.5">
            {visibleNodeIds.map((id) => {
              const node = nodes[id];
              if (!node) return null;
              const depth = nodeDepths[id] ?? 0;
              const isSelected = selectedIds.includes(id);
              return (
                <NodeRow
                  key={id}
                  node={node}
                  depth={depth}
                  isSelected={isSelected}
                  onToggle={toggleFolder}
                  onSelect={handleSelectNode}
                  onContextMenu={(e, id) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: id });
                  }}
                />
              );
            })}
          </div>
        </aside>

        <section className="flex-1 min-w-0 overflow-auto relative bg-zinc-50/30 dark:bg-black/20">
          <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 pb-20">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                  {centerTitle}
                </h1>
                {selectedIds.length === 0 && Object.keys(nodes).length > 0 && (
                  <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {ui.selectFileHint}
                  </div>
                )}
              </div>
              {selectionSummary.count > 0 && (
                <div className="text-right text-sm text-zinc-600 dark:text-zinc-300">
                  <div>{selectionSummary.count} archivos</div>
                  <div>{formatBytes(selectionSummary.totalSize)}</div>
                </div>
              )}
            </div>

            {selectedPrimary &&
              selectedPrimary.kind === "file" &&
              selectedObjectUrl && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3 min-h-[300px] rounded-3xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-4 shadow-xl flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-50 pointer-events-none"></div>
                    {selectedPreviewKind?.startsWith("image/") ? (
                      <img
                        src={selectedObjectUrl}
                        alt={selectedPrimary.name}
                        className="w-full h-auto max-h-[60vh] object-contain rounded-2xl shadow-md transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    ) : selectedPreviewKind?.startsWith("video/") ? (
                      <video
                        src={selectedObjectUrl}
                        controls
                        className="w-full max-h-[60vh] rounded-2xl bg-black/90 shadow-2xl"
                      />
                    ) : selectedPreviewKind?.startsWith("audio/") ? (
                      <audio
                        src={selectedObjectUrl}
                        controls
                        className="w-full relative z-10"
                      />
                    ) : (
                      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-3">
                        <svg
                          className="w-12 h-12 opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {ui.unavailablePreview}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    {selectedMetadata?.exif?.gps ? (
                      <div className="rounded-3xl border border-white/30 dark:border-white/10 overflow-hidden shadow-xl">
                        <MapPreview gps={selectedMetadata.exif.gps} />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-5 shadow-lg">
                        <div className="text-xs font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {ui.gps}
                        </div>
                        <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                          {ui.noGps}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-5 shadow-lg">
                      <div className="text-xs font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Hardware / EXIF
                      </div>
                      <div className="mt-3 text-sm">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {selectedMetadata?.exif?.make || "—"}{" "}
                          <span className="text-zinc-500">
                            {selectedMetadata?.exif?.model || ""}
                          </span>
                        </div>
                        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                          {selectedMetadata?.exif?.datetimeOriginal ||
                            ui.noTimestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {selectedPrimary && selectedPrimary.kind === "folder" && (
              <div className="mt-8 rounded-3xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl p-8 shadow-xl text-center">
                <div className="w-16 h-16 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-1">{ui.selectedFolder}</h3>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  {selectionSummary.count > 0
                    ? ui.contentSummary
                    : ui.emptyFolder}
                </div>
                {selectionSummary.count > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                    {selectionSummary.byType.map(([type, count]) => (
                      <span
                        key={type}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm"
                      >
                        {type} <span className="opacity-50 ml-1">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <aside
          className={classNames(
            "metadata-inspector-panel w-[380px] shrink-0 border-l border-white/20 dark:border-white/10 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl overflow-auto shadow-l-xl transition-transform duration-500",
            Object.keys(nodes).length === 0 &&
              "translate-x-full absolute right-0 h-full"
          )}
        >
          <div className="p-3 pt-6 border-b border-white/20 dark:border-white/10">
            <div className="flex items-center gap-2 px-1">
              <TabButton
                active={activeTab === "details"}
                onClick={() => setActiveTab("details")}
              >
                {ui.details}
              </TabButton>
              <TabButton
                active={activeTab === "export"}
                onClick={() => setActiveTab("export")}
              >
                {ui.export}
              </TabButton>
              <TabButton
                active={activeTab === "forensic"}
                onClick={() => setActiveTab("forensic")}
              >
                {ui.forensic}
              </TabButton>
            </div>
          </div>

          <div className="p-4">
            {activeTab === "details" && (
              <div className="space-y-4">
                {selectedPrimary?.kind === "file" ? (
                  selectedMetadata ? (
                    <>
                      <InfoCard title={ui.file}>
                        <InfoRow
                          label={ui.name}
                          value={selectedMetadata.file.name}
                          mono
                        />
                        <InfoRow
                          label={ui.path}
                          value={selectedMetadata.file.path}
                          mono
                        />
                        <InfoRow
                          label={ui.type}
                          value={selectedMetadata.file.type}
                          mono
                        />
                        <InfoRow
                          label={ui.size}
                          value={formatBytes(selectedMetadata.file.size)}
                        />
                      </InfoCard>

                      <PrivacyReportCard
                        score={privacyScore}
                        findings={privacyFindings}
                      />

                      <InfoCard title={ui.metadata}>
                        {selectedMetadata.common?.title !== undefined && (
                          <InfoRow
                            label={ui.title}
                            value={
                              pendingEdits[selectedPrimaryId]?.title ??
                              selectedMetadata.common?.title
                            }
                            editable
                            onChange={(v) =>
                              handleEditField(selectedPrimaryId, "title", v)
                            }
                          />
                        )}
                        {selectedMetadata.common?.author !== undefined && (
                          <InfoRow
                            label={ui.author}
                            value={
                              pendingEdits[selectedPrimaryId]?.author ??
                              selectedMetadata.common?.author
                            }
                            editable
                            onChange={(v) =>
                              handleEditField(selectedPrimaryId, "author", v)
                            }
                          />
                        )}
                        {selectedMetadata.common?.subject !== undefined && (
                          <InfoRow
                            label={ui.subject}
                            value={
                              pendingEdits[selectedPrimaryId]?.subject ??
                              selectedMetadata.common?.subject
                            }
                            editable
                            onChange={(v) =>
                              handleEditField(selectedPrimaryId, "subject", v)
                            }
                          />
                        )}
                        {selectedMetadata.common?.keywords !== undefined && (
                          <InfoRow
                            label={ui.keywords}
                            value={
                              pendingEdits[selectedPrimaryId]?.keywords ??
                              selectedMetadata.common?.keywords
                            }
                            editable
                            onChange={(v) =>
                              handleEditField(selectedPrimaryId, "keywords", v)
                            }
                          />
                        )}
                        {selectedMetadata.common?.description !== undefined && (
                          <InfoRow
                            label={ui.description}
                            value={
                              pendingEdits[selectedPrimaryId]?.description ??
                              selectedMetadata.common?.description
                            }
                            editable
                            onChange={(v) =>
                              handleEditField(
                                selectedPrimaryId,
                                "description",
                                v
                              )
                            }
                          />
                        )}
                        {selectedMetadata.common?.software !== undefined && (
                          <InfoRow
                            label={ui.software}
                            value={
                              pendingEdits[selectedPrimaryId]?.software ??
                              selectedMetadata.common?.software
                            }
                            editable
                            onChange={(v) =>
                              handleEditField(selectedPrimaryId, "software", v)
                            }
                          />
                        )}
                        {selectedMetadata.common?.created && (
                          <InfoRow
                            label={ui.created}
                            value={selectedMetadata.common.created}
                            mono
                          />
                        )}
                        {selectedMetadata.common?.modified && (
                          <InfoRow
                            label={ui.modified}
                            value={selectedMetadata.common.modified}
                            mono
                          />
                        )}
                      </InfoCard>

                      {selectedMetadata.tags && (
                        <InfoCard title="Tags (raw)">
                          {(() => {
                            const entries = Object.entries(
                              selectedMetadata.tags ?? {}
                            ).sort((a, b) => a[0].localeCompare(b[0]));
                            const visible = entries.slice(0, 30);
                            return (
                              <>
                                {visible.map(([k, v]) => (
                                  <InfoRow key={k} label={k} value={v} mono />
                                ))}
                                {entries.length > visible.length && (
                                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                                    +{entries.length - visible.length} {ui.more}…
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </InfoCard>
                      )}

                      {selectedMetadata.image && (
                        <InfoCard title={ui.image}>
                          <InfoRow
                            label={ui.dimensions}
                            value={`${selectedMetadata.image.width}×${selectedMetadata.image.height}`}
                            mono
                          />
                        </InfoCard>
                      )}

                      {selectedMetadata.video && (
                        <InfoCard title={ui.video}>
                          <InfoRow
                            label={ui.resolution}
                            value={
                              selectedMetadata.video.width &&
                              selectedMetadata.video.height
                                ? `${selectedMetadata.video.width}×${selectedMetadata.video.height}`
                                : "—"
                            }
                            mono
                          />
                          <InfoRow
                            label={ui.duration}
                            value={
                              selectedMetadata.video.duration != null
                                ? `${selectedMetadata.video.duration.toFixed(2)}s`
                                : "—"
                            }
                            mono
                          />
                        </InfoCard>
                      )}

                      {selectedMetadata.audio && (
                        <InfoCard title={ui.audio}>
                          <InfoRow
                            label={ui.duration}
                            value={
                              selectedMetadata.audio.duration != null
                                ? `${selectedMetadata.audio.duration.toFixed(2)}s`
                                : "—"
                            }
                            mono
                          />
                        </InfoCard>
                      )}

                      {selectedMetadata.exif && (
                        <InfoCard title={ui.basicExif}>
                          <InfoRow
                            label="Make"
                            value={selectedMetadata.exif.make || "—"}
                          />
                          <InfoRow
                            label="Model"
                            value={selectedMetadata.exif.model || "—"}
                          />
                          <InfoRow
                            label="DateTimeOriginal"
                            value={
                              selectedMetadata.exif.datetimeOriginal || "—"
                            }
                            mono
                          />
                          <InfoRow
                            label="Orientation"
                            value={selectedMetadata.exif.orientation ?? "—"}
                            mono
                          />
                          <InfoRow
                            label="GPS"
                            value={
                              selectedMetadata.exif.gps
                                ? `${selectedMetadata.exif.gps.lat.toFixed(6)}, ${selectedMetadata.exif.gps.lon.toFixed(6)}`
                                : "—"
                            }
                            mono
                          />
                        </InfoCard>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      {ui.analyzing}
                    </div>
                  )
                ) : selectedPrimary?.kind === "folder" ? (
                  <InfoCard title={ui.selection}>
                    <InfoRow
                      label={ui.files}
                      value={selectionSummary.count}
                      mono
                    />
                    <InfoRow
                      label={ui.virtualSize}
                      value={formatBytes(selectionSummary.totalSize)}
                    />
                    <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                      {ui.reportTip}
                    </div>
                  </InfoCard>
                ) : (
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">
                    {ui.selectFileOrFolder}
                  </div>
                )}
              </div>
            )}

            {activeTab === "export" && (
              <div className="space-y-3">
                <InfoCard title={ui.exportSelection}>
                  <div className="text-sm text-zinc-700 dark:text-zinc-200">
                    {formatCopy(ui.exportDescription, { count: selectionFileIds.length })}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      className={classNames(
                        "px-3 py-2 rounded-md text-sm bg-zinc-900 text-white hover:bg-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm",
                        !canDownloadSelected && "opacity-40 cursor-not-allowed"
                      )}
                      disabled={!canDownloadSelected}
                      onClick={downloadSelectedFile}
                    >
                      {ui.downloadSelected}
                    </button>
                    <button
                      type="button"
                      className={classNames(
                        "px-3 py-2 rounded-md text-sm border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/20 hover:bg-white dark:hover:bg-zinc-950/35",
                        !canExport && "opacity-40 cursor-not-allowed"
                      )}
                      disabled={!canExport}
                      onClick={exportSelectionJson}
                    >
                      {ui.downloadJson}
                    </button>
                    <button
                      type="button"
                      className={classNames(
                        "px-3 py-2 rounded-md text-sm border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/20 hover:bg-white dark:hover:bg-zinc-950/35",
                        !canExport && "opacity-40 cursor-not-allowed"
                      )}
                      disabled={!canExport}
                      onClick={exportSelectionCsv}
                    >
                      {ui.downloadCsv}
                    </button>
                  </div>
                </InfoCard>
              </div>
            )}

            {activeTab === "forensic" && (
              <div className="space-y-3">
                <InfoCard title={ui.selectedSha}>
                  {selectedPrimary?.kind !== "file" ? (
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      {ui.selectAFile}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-zinc-700 dark:text-zinc-200">
                        {ui.integrity}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="px-3 py-2 rounded-md text-sm border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-950/20 hover:bg-white dark:hover:bg-zinc-950/35"
                          onClick={computeSelectedSha256}
                        >
                          {ui.calculateSha}
                        </button>
                      </div>
                      {selectedPrimaryId &&
                        metadataByNodeId[selectedPrimaryId]?.forensic
                          ?.sha256 && (
                          <div className="mt-3 text-xs font-mono break-all text-zinc-700 dark:text-zinc-200">
                            {
                              metadataByNodeId[selectedPrimaryId].forensic
                                ?.sha256
                            }
                          </div>
                        )}
                    </>
                  )}
                </InfoCard>
              </div>
            )}
          </div>
        </aside>
      </div>

      {hasPendingEdits && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {ui.unsaved}
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700"></div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => setPendingEdits({})}
            >
              {ui.discard}
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-md transition-all active:scale-95"
              onClick={() => {
                setActiveTab("export");
              }}
            >
              {ui.exportChanges}
            </button>
          </div>
        </div>
      )}
    </div>
    </MetadataI18nContext.Provider>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={classNames(
        "flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-95",
        active
          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md border border-zinc-200/50 dark:border-zinc-700/50"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-4 shadow-lg transition-all hover:shadow-xl">
      <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3 border-b border-zinc-200/50 dark:border-zinc-700/50 pb-2">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function PrivacyReportCard({
  score,
  findings,
}: {
  score: ReturnType<typeof getPrivacyScore>;
  findings: ReturnType<typeof getPrivacyFindings>;
}) {
  const ui = useMetadataUi();
  const scoreLabel =
    score === "high"
      ? ui.high
      : score === "medium"
        ? ui.medium
        : score === "low"
          ? ui.low
          : ui.cleanScore;
  const scoreClass =
    score === "high"
      ? "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-300"
      : score === "medium"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300"
        : score === "low"
          ? "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300"
          : "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";

  return (
    <InfoCard title={ui.privacy}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-700 dark:text-zinc-200">
          {findings.length === 0
            ? ui.noSensitive
            : ui.sensitiveFindings.replace("{count}", String(findings.length))}
        </div>
        <span
          className={classNames(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold",
            scoreClass
          )}
        >
          {scoreLabel}
        </span>
      </div>
      {findings.length > 0 && (
        <div className="mt-1 flex flex-col gap-2">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-xl border border-zinc-200/70 dark:border-white/10 bg-white/45 dark:bg-zinc-950/25 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {finding.title}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {finding.severity === "high" ? ui.high : finding.severity === "medium" ? ui.medium : ui.low}
                </div>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                {finding.detail}
              </div>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
}

function InfoRow({
  label,
  value,
  mono,
  editable,
  onChange,
}: {
  label: string;
  value: any;
  mono?: boolean;
  editable?: boolean;
  onChange?: (val: string) => void;
}) {
  const ui = useMetadataUi();
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 min-h-[32px] text-sm group">
      <div className="text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
        {label}
      </div>
      <div className="flex-1 flex justify-end min-w-0">
        {editable ? (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={ui.undefined}
            className={classNames(
              "w-full max-w-[180px] text-right bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors px-1",
              "text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400/50 dark:placeholder:text-zinc-500/50",
              mono && "font-mono text-xs"
            )}
          />
        ) : (
          <div
            className={classNames(
              "text-right text-zinc-900 dark:text-zinc-100 break-all",
              mono && "font-mono text-xs"
            )}
          >
            {value == null || value === "" ? "—" : String(value)}
          </div>
        )}
      </div>
      {editable && (
        <svg
          className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      )}
    </div>
  );
}

function useObjectUrl(
  create: () => Promise<string | null>,
  deps: React.DependencyList
) {
  const [value, setValue] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await create();
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      const prev = prevUrlRef.current;
      prevUrlRef.current = url;
      setValue(url);
      if (prev) URL.revokeObjectURL(prev);
    })();

    return () => {
      cancelled = true;
    };
  }, deps);

  useEffect(() => {
    return () => {
      const prev = prevUrlRef.current;
      if (prev) URL.revokeObjectURL(prev);
    };
  }, []);

  return value;
}

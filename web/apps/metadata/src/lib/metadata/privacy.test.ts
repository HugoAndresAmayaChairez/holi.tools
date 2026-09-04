import { describe, expect, it } from "vitest";
import { getPrivacyFindings, getPrivacyScore } from "./privacy";
import type { FileMetadata } from "./types";

const baseMetadata: FileMetadata = {
  file: {
    name: "sample.jpg",
    path: "/sample.jpg",
    size: 1024,
    type: "image/jpeg",
  },
};

describe("metadata privacy report", () => {
  it("stays clean without common sensitive metadata", () => {
    const findings = getPrivacyFindings(baseMetadata);
    expect(findings).toEqual([]);
    expect(getPrivacyScore(findings)).toBe("clean");
  });

  it("marks GPS as high risk", () => {
    const findings = getPrivacyFindings({
      ...baseMetadata,
      exif: { gps: { lat: 19.4326, lon: -99.1332 } },
    });

    expect(findings.map((finding) => finding.id)).toContain("gps");
    expect(getPrivacyScore(findings)).toBe("high");
  });

  it("detects author, timestamps, software, and office organization fields", () => {
    const findings = getPrivacyFindings({
      ...baseMetadata,
      common: {
        author: "A. User",
        created: "2026-05-31",
        software: "Holi Writer",
      },
      tags: {
        "docx:Company": "Holi",
      },
    });

    expect(findings.map((finding) => finding.id)).toEqual([
      "author",
      "timestamps",
      "software",
      "office-org",
    ]);
    expect(getPrivacyScore(findings)).toBe("medium");
  });
});

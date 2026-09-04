import { describe, it, expect } from "vitest";

describe("Vault Page", () => {
  it("should have identity section", async () => {
    const html = `<button id="gen-id-btn">Generate New Identity</button>`;
    expect(html).toContain('id="gen-id-btn"');
  });
});
